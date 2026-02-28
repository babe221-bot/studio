"""
Unit tests for app.services.cad_service.

These tests mock the CAD engine (_run_cad / _generate_2d_drawings) so they
run without ezdxf/drawsvg installed.

Run from backend/:
    pytest tests/test_cad_service_unit.py -v
"""
import base64
import json
import os
import pathlib
import tempfile
import pytest
from unittest.mock import patch, MagicMock


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_MINIMAL_CONFIG = {
    "dims": {"length": 100.0, "width": 60.0, "height": 2.0},
    "material": {"name": "Marble White", "color": "#f8f8f8"},
    "finish": {"name": "Polished", "roughness": 0.05},
    "profile": {"name": "Flat", "radius": 0.0},
}

_FAKE_SVG = b"<svg xmlns='http://www.w3.org/2000/svg'><rect width='100' height='60'/></svg>"


def _make_fake_cad(config, dxf_path, svg_path):
    """Writes minimal stub files to simulate ezdxf+drawsvg output."""
    with open(dxf_path, "w") as f:
        f.write("0\nSECTION\n0\nENDSEC\n0\nEOF\n")
    with open(svg_path, "wb") as f:
        f.write(_FAKE_SVG)


# ---------------------------------------------------------------------------
# generate_drawing — happy path
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_generate_drawing_returns_base64_svg():
    """generate_drawing should base64-encode the SVG produced by the CAD engine."""
    with patch("app.services.cad_service._CAD_AVAILABLE", True), \
         patch("app.services.cad_service._run_cad", side_effect=_make_fake_cad):
        from app.services.cad_service import generate_drawing
        result = await generate_drawing(_MINIMAL_CONFIG)

    assert result["success"] is True
    assert result["svg"] == base64.b64encode(_FAKE_SVG).decode()


@pytest.mark.asyncio
async def test_generate_drawing_returns_correct_dims():
    with patch("app.services.cad_service._CAD_AVAILABLE", True), \
         patch("app.services.cad_service._run_cad", side_effect=_make_fake_cad):
        from app.services.cad_service import generate_drawing
        result = await generate_drawing(_MINIMAL_CONFIG)

    assert result["data"]["length"] == 100.0
    assert result["data"]["width"] == 60.0
    assert result["data"]["height"] == 2.0
    assert result["data"]["material"] == "Marble White"


@pytest.mark.asyncio
async def test_generate_drawing_dxf_filename():
    with patch("app.services.cad_service._CAD_AVAILABLE", True), \
         patch("app.services.cad_service._run_cad", side_effect=_make_fake_cad):
        from app.services.cad_service import generate_drawing
        result = await generate_drawing(_MINIMAL_CONFIG)

    assert result["dxf_filename"] == "drawing.dxf"


@pytest.mark.asyncio
async def test_generate_drawing_temp_dir_is_cleaned_up():
    """Temp directory created during generation should be removed after the call."""
    created_dirs = []

    original_mkdtemp = tempfile.mkdtemp

    def tracking_mkdtemp(**kwargs):
        d = original_mkdtemp(**kwargs)
        created_dirs.append(d)
        return d

    with patch("app.services.cad_service._CAD_AVAILABLE", True), \
         patch("app.services.cad_service._run_cad", side_effect=_make_fake_cad), \
         patch("tempfile.mkdtemp", side_effect=tracking_mkdtemp):
        from app.services.cad_service import generate_drawing
        await generate_drawing(_MINIMAL_CONFIG)

    for d in created_dirs:
        assert not os.path.exists(d), f"Temp dir {d} was not cleaned up"


# ---------------------------------------------------------------------------
# generate_drawing — CAD unavailable
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_generate_drawing_cad_unavailable():
    with patch("app.services.cad_service._CAD_AVAILABLE", False), \
         patch("app.services.cad_service._CAD_IMPORT_ERROR", "No module named 'ezdxf'"):
        from app.services.cad_service import generate_drawing
        result = await generate_drawing(_MINIMAL_CONFIG)

    assert result["success"] is False
    assert "error" in result
    assert "ezdxf" in result["error"].lower() or "unavailable" in result["error"].lower()


# ---------------------------------------------------------------------------
# generate_drawing — CAD engine raises unexpectedly
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_generate_drawing_engine_exception_is_caught():
    """If the CAD engine raises, we should get success=False, not a crash."""
    def _raise(config, dxf_path, svg_path):
        raise RuntimeError("Simulated CAD engine crash")

    with patch("app.services.cad_service._CAD_AVAILABLE", True), \
         patch("app.services.cad_service._run_cad", side_effect=_raise):
        from app.services.cad_service import generate_drawing
        result = await generate_drawing(_MINIMAL_CONFIG)

    assert result["success"] is False
    assert "Simulated CAD engine crash" in result["error"]


# ---------------------------------------------------------------------------
# generate_drawing — edge-case configs
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_generate_drawing_empty_config():
    """Empty config should fail gracefully (engine unavailable or engine error)."""
    with patch("app.services.cad_service._CAD_AVAILABLE", True), \
         patch("app.services.cad_service._run_cad", side_effect=_make_fake_cad):
        from app.services.cad_service import generate_drawing
        result = await generate_drawing({})

    # Both success and failure are acceptable — it must not raise
    assert "success" in result


@pytest.mark.asyncio
async def test_generate_drawing_zero_dims():
    """Zero-dimension config: data fields should reflect zeros."""
    config = {
        "dims": {"length": 0.0, "width": 0.0, "height": 0.0},
        "material": {"name": "Granite Black"},
    }
    with patch("app.services.cad_service._CAD_AVAILABLE", True), \
         patch("app.services.cad_service._run_cad", side_effect=_make_fake_cad):
        from app.services.cad_service import generate_drawing
        result = await generate_drawing(config)

    if result["success"]:
        assert result["data"]["length"] == 0.0
        assert result["data"]["width"] == 0.0


# ---------------------------------------------------------------------------
# process_slab_file
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_process_slab_file_valid_json():
    fd, path = tempfile.mkstemp(suffix=".json")
    try:
        with os.fdopen(fd, "w") as fh:
            json.dump(_MINIMAL_CONFIG, fh)

        with patch("app.services.cad_service._CAD_AVAILABLE", True), \
             patch("app.services.cad_service._run_cad", side_effect=_make_fake_cad):
            from app.services.cad_service import process_slab_file
            result = await process_slab_file(path)
    finally:
        if os.path.exists(path):
            os.remove(path)

    assert result["success"] is True
    assert result["data"]["material"] == "Marble White"


@pytest.mark.asyncio
async def test_process_slab_file_invalid_json():
    fd, path = tempfile.mkstemp(suffix=".json")
    try:
        with os.fdopen(fd, "w") as fh:
            fh.write("this is not json {{{")

        with patch("app.services.cad_service._CAD_AVAILABLE", True):
            from app.services.cad_service import process_slab_file
            result = await process_slab_file(path)
    finally:
        if os.path.exists(path):
            os.remove(path)

    assert result["success"] is False
    assert "error" in result


@pytest.mark.asyncio
async def test_process_slab_file_missing_file():
    """Pointing to a non-existent file should return success=False."""
    with patch("app.services.cad_service._CAD_AVAILABLE", True):
        from app.services.cad_service import process_slab_file
        result = await process_slab_file("/nonexistent/path/to/file.json")

    assert result["success"] is False


@pytest.mark.asyncio
async def test_process_slab_file_empty_json():
    """Empty JSON object should be processed (engine decides outcome)."""
    fd, path = tempfile.mkstemp(suffix=".json")
    try:
        with os.fdopen(fd, "w") as fh:
            json.dump({}, fh)

        with patch("app.services.cad_service._CAD_AVAILABLE", True), \
             patch("app.services.cad_service._run_cad", side_effect=_make_fake_cad):
            from app.services.cad_service import process_slab_file
            result = await process_slab_file(path)
    finally:
        if os.path.exists(path):
            os.remove(path)

    # Should not raise; outcome depends on CAD engine
    assert "success" in result


# ---------------------------------------------------------------------------
# get_materials
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_materials_returns_list():
    from app.services.cad_service import get_materials
    materials = await get_materials()
    assert isinstance(materials, list)


@pytest.mark.asyncio
async def test_get_materials_count():
    from app.services.cad_service import get_materials
    materials = await get_materials()
    assert len(materials) == 6  # granite_white/black, marble_white/green, quartz, travertine


@pytest.mark.asyncio
async def test_get_materials_required_keys():
    from app.services.cad_service import get_materials
    materials = await get_materials()
    for m in materials:
        assert "id" in m, f"Missing 'id' in {m}"
        assert "name" in m, f"Missing 'name' in {m}"
        assert "color" in m, f"Missing 'color' in {m}"


@pytest.mark.asyncio
async def test_get_materials_colors_are_hex():
    """All color values should be hex strings starting with '#'."""
    from app.services.cad_service import get_materials
    materials = await get_materials()
    for m in materials:
        assert m["color"].startswith("#"), f"Color '{m['color']}' is not a hex value"
        assert len(m["color"]) in (4, 7), f"Color '{m['color']}' has unexpected length"


@pytest.mark.asyncio
async def test_get_materials_unique_ids():
    from app.services.cad_service import get_materials
    materials = await get_materials()
    ids = [m["id"] for m in materials]
    assert len(ids) == len(set(ids)), "Duplicate material IDs"


@pytest.mark.asyncio
async def test_get_materials_includes_expected_types():
    from app.services.cad_service import get_materials
    materials = await get_materials()
    ids = {m["id"] for m in materials}
    assert "granite_white" in ids
    assert "granite_black" in ids
    assert "marble_white" in ids
    assert "quartz" in ids
    assert "travertine" in ids
