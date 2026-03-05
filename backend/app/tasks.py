import os
import subprocess
import base64
import tempfile
import shutil
import httpx
import asyncio
from pathlib import Path
from app.worker import celery_app

async def download_file(url: str, dest: Path):
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url, timeout=30.0)
            if resp.status_code == 200:
                dest.write_bytes(resp.content)
                return True
        except Exception as e:
            print(f"Failed to download {url}: {e}")
    return False

@celery_app.task(bind=True)
def render_3d_task(self, config: dict, format: str = "png"):
    """
    Celery task to invoke Blender headlessly.
    format: "png" (multiple views) or "glb" (AR model)
    """
    dims = config.get("dims", {})
    mat = config.get("material", {})
    finish = config.get("finish", {})
    profile = config.get("profile", {})
    edges = config.get("processedEdges", {})
    okapniks = config.get("okapnikEdges", {})

    tmp_dir = tempfile.mkdtemp(prefix="studio_render_")
    tmp_path = Path(tmp_dir)
    
    try:
        # PBR Maps handling
        roughness_path = None
        normal_path = None
        metallic_path = None
        
        if mat.get("roughness_map"):
            p = tmp_path / "roughness.jpg"
            if asyncio.run(download_file(mat["roughness_map"], p)):
                roughness_path = str(p)
        
        if mat.get("normal_map"):
            p = tmp_path / "normal.jpg"
            if asyncio.run(download_file(mat["normal_map"], p)):
                normal_path = str(p)
                
        if mat.get("metallic_map"):
            p = tmp_path / "metallic.jpg"
            if asyncio.run(download_file(mat["metallic_map"], p)):
                metallic_path = str(p)

        # Construct Blender CLI command
        root_dir = Path(__file__).resolve().parents[2]
        script_path = root_dir / "stone_slab_cad" / "utils" / "mcp_visualization.py"
        
        if not script_path.exists():
            return {"success": False, "error": f"Script not found at {script_path}"}

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

        if format == "glb":
            cmd.append("--export_glb")
            
        if roughness_path:
            cmd.extend(["--roughness_map", roughness_path])
        if normal_path:
            cmd.extend(["--normal_map", normal_path])
        if metallic_path:
            cmd.extend(["--metallic_map", metallic_path])

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

        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

        if result.returncode != 0:
            return {"success": False, "error": f"Blender error: {result.stderr}", "stdout": result.stdout}

        if format == "glb":
            glb_path = os.path.join(tmp_dir, "model.glb")
            if os.path.exists(glb_path):
                with open(glb_path, "rb") as fh:
                    b64 = base64.b64encode(fh.read()).decode("utf-8")
                    return {"success": True, "glb": b64}
            return {"success": False, "error": "GLB file not generated"}

        # Collect renders
        renders = []
        for file in os.listdir(tmp_dir):
            if file.endswith(".png"):
                file_path = os.path.join(tmp_dir, file)
                with open(file_path, "rb") as fh:
                    b64 = base64.b64encode(fh.read()).decode("utf-8")
                    renders.append({"name": file, "image": b64})

        return {"success": True, "renders": renders}

    except Exception as exc:
        return {"success": False, "error": str(exc)}
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)
