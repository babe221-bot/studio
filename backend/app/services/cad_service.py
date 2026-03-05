"""
CAD Service — bridges FastAPI endpoints to the stone_slab_cad engine.

`stone_slab_cad/` lives two levels above `backend/`, path-injected at import
time so we don't need to install it as a package.
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
from app.models.domain import MaterialDB

# ── path injection ────────────────────────────────────────────────────────────
_CAD_DIR = Path(__file__).resolve().parents[3] / "stone_slab_cad"
if str(_CAD_DIR) not in sys.path:
    sys.path.insert(0, str(_CAD_DIR))

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
