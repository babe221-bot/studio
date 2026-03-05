"""
CAD Service — bridges FastAPI endpoints to the stone_slab_cad engine.

`stone_slab_cad` is available as a local package installed via:
`pip install -e ./stone_slab_cad`
"""
import sys
import os
import asyncio
import base64
import tempfile
import shutil
from pathlib import Path
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.domain import MaterialDB, SurfaceFinishDB, EdgeProfileDB

# Import may fail when ezdxf/drawsvg are not yet installed; guard gracefully.
try:
    from slab2d import generate_2d_drawings as _generate_2d_drawings  # type: ignore
    _CAD_AVAILABLE = True
except ImportError as _e:
    _CAD_AVAILABLE = False
    _CAD_IMPORT_ERROR = str(_e)

# ── helpers ───────────────────────────────────────────────────────────────────

def _run_cad(config: dict, dxf_path: str, svg_path: str) -> None:
    """Synchronous CAD call — runs inside a thread-pool executor."""
    _generate_2d_drawings(config, dxf_path, svg_path)


# ── public API ────────────────────────────────────────────────────────────────

async def generate_drawing(config: dict) -> Dict[str, Any]:
    """
    Generate DXF + SVG from a full CAD config dict.

    Returns:
        success  – bool
        svg      – base64-encoded SVG (for instant web preview)
        dxf_filename – original filename (for later storage upload)
        data     – echo of key params for the caller
    """
    if not _CAD_AVAILABLE:
        return {
            "success": False,
            "error": f"CAD engine unavailable: {_CAD_IMPORT_ERROR}. "
                     "Run `pip install ezdxf drawsvg` in the backend venv.",
        }

    # Use a temp dir so we don't litter the filesystem
    tmp_dir = tempfile.mkdtemp(prefix="studio_cad_")
    try:
        dxf_path = os.path.join(tmp_dir, "drawing.dxf")
        svg_path = os.path.join(tmp_dir, "preview.svg")

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _run_cad, config, dxf_path, svg_path)

        # Read SVG as base64 for inline transfer
        with open(svg_path, "rb") as fh:
            svg_b64 = base64.b64encode(fh.read()).decode("utf-8")

        dims = config.get("dims", {})
        mat  = config.get("material", {})

        return {
            "success": True,
            "svg": svg_b64,
            "dxf_filename": "drawing.dxf",
            "data": {
                "length":   dims.get("length"),
                "width":    dims.get("width"),
                "height":   dims.get("height"),
                "material": mat.get("name"),
            },
        }
    except Exception as exc:
        return {"success": False, "error": str(exc)}
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


async def process_slab_file(file_path: str) -> Dict[str, Any]:
    """
    Process an uploaded slab params JSON file.
    Reads the JSON and delegates to generate_drawing().
    """
    import json

    try:
        with open(file_path, "r", encoding="utf-8") as fh:
            config = json.load(fh)
        return await generate_drawing(config)
    except (json.JSONDecodeError, OSError) as exc:
        return {"success": False, "error": str(exc)}


async def get_materials(db: Optional[AsyncSession] = None) -> List[Dict[str, Any]]:
    """
    Available stone materials.
    Pulls from Supabase `materials` table if db session provided,
    otherwise falls back to hardcoded list.
    """
    hardcoded_materials = [
        {"id": "granite_white",  "name": "Granite White",  "color": "#f5f5dc"},
        {"id": "granite_black",  "name": "Granite Black",  "color": "#1a1a1a"},
        {"id": "marble_white",   "name": "Marble White",   "color": "#f8f8f8"},
        {"id": "marble_green",   "name": "Marble Green",   "color": "#4a7c59"},
        {"id": "quartz",         "name": "Quartz",         "color": "#e8e8e8"},
        {"id": "travertine",     "name": "Travertine",     "color": "#d4b896"},
    ]

    if db is None:
        return hardcoded_materials

    try:
        result = await db.execute(select(MaterialDB))
        materials = result.scalars().all()
        if not materials:
            return hardcoded_materials
            
        return [
            {
                "id": str(m.id),  # Return string to match previous expected types
                "name": m.name,
                "color": m.color,
                "texture": m.texture,
                "density": float(m.density),
                "cost_sqm": float(m.cost_sqm)
            }
            for m in materials
        ]
    except Exception as e:
        print(f"Error fetching materials from DB: {e}")
        return hardcoded_materials

async def get_surface_finishes(db: Optional[AsyncSession] = None) -> List[Dict[str, Any]]:
    """
    Available surface finishes.
    """
    hardcoded_finishes = [
        {"id": "0", "name": "Bez obrade", "cost_sqm": 0},
        {"id": "1", "name": "Poliranje (Polished)", "cost_sqm": 15},
        {"id": "2", "name": "Brušenje (Honed)", "cost_sqm": 12},
        {"id": "3", "name": "Četkanje (Brushed)", "cost_sqm": 18},
        {"id": "4", "name": "Paljenje (Flamed)", "cost_sqm": 20},
        {"id": "5", "name": "Pjeskarenje (Sandblasted)", "cost_sqm": 22},
        {"id": "6", "name": "Bućardanje (Bush-hammered)", "cost_sqm": 25},
        {"id": "7", "name": "Štokovanje (Tooled)", "cost_sqm": 23},
        {"id": "8", "name": "Antico (Antiqued)", "cost_sqm": 28},
        {"id": "9", "name": "Martelina (Martellina)", "cost_sqm": 20},
        {"id": "10", "name": "Pilano (Sawn)", "cost_sqm": 5},
    ]

    if db is None:
        return hardcoded_finishes

    try:
        result = await db.execute(select(SurfaceFinishDB))
        finishes = result.scalars().all()
        if not finishes:
            return hardcoded_finishes
            
        return [
            {
                "id": str(f.id),
                "name": f.name,
                "cost_sqm": float(f.cost_sqm)
            }
            for f in finishes
        ]
    except Exception as e:
        print(f"Error fetching surface finishes from DB: {e}")
        return hardcoded_finishes

async def render_3d_simulation(config: dict) -> Dict[str, Any]:
    """
    Invokes Blender headlessly to generate photorealistic 3D renders.
    """
    import subprocess
    
    dims = config.get("dims", {})
    mat = config.get("material", {})
    finish = config.get("finish", {})
    profile = config.get("profile", {})
    edges = config.get("processedEdges", {})
    okapniks = config.get("okapnikEdges", {})

    tmp_dir = tempfile.mkdtemp(prefix="studio_render_")
    
    try:
        # Construct Blender CLI command
        # Assumes 'blender' is in PATH (installed via Dockerfile)
        script_path = Path(__file__).resolve().parents[3] / "stone_slab_cad" / "utils" / "mcp_visualization.py"
        
        cmd = [
            "blender",
            "--background",
            "--python", str(script_path),
            "--",
            "--length", str(dims.get("length", 1000)),
            "--width", str(dims.get("width", 600)),
            "--height", str(dims.get("height", 30)),
            "--material", mat.get("name", "Granite"),
            "--finish", finish.get("name", "brushed"),
            "--profile", profile.get("name", "c8_chamfer"),
            "--output_dir", tmp_dir
        ]

        # Add edges
        if edges.get("front"): cmd.append("--edge_front")
        if edges.get("back"): cmd.append("--edge_back")
        if edges.get("left"): cmd.append("--edge_left")
        if edges.get("right"): cmd.append("--edge_right")

        # Add okapniks
        if okapniks.get("front"): cmd.append("--okapnik_front")
        if okapniks.get("back"): cmd.append("--okapnik_back")
        if okapniks.get("left"): cmd.append("--okapnik_left")
        if okapniks.get("right"): cmd.append("--okapnik_right")

        # Run subprocess
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        stdout, stderr = await process.communicate()

        if process.returncode != 0:
            return {
                "success": False, 
                "error": f"Blender error: {stderr.decode()}",
                "stdout": stdout.decode()
            }

        # Collect renders
        renders = []
        for file in os.listdir(tmp_dir):
            if file.endswith(".png"):
                file_path = os.path.join(tmp_dir, file)
                with open(file_path, "rb") as fh:
                    b64 = base64.b64encode(fh.read()).decode("utf-8")
                    renders.append({"name": file, "image": b64})

        return {
            "success": True,
            "renders": renders
        }

    except Exception as exc:
        return {"success": False, "error": str(exc)}
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)
