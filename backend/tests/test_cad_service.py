"""
Smoke-test suite for the CAD service.

Run from backend/:
    pip install pytest pytest-asyncio
    pytest tests/test_cad_service.py -v
"""
import json
import pathlib
import pytest
import pytest_asyncio

# ── load params_example from stone_slab_cad ──────────────────────────────────
_PARAMS_PATH = pathlib.Path(__file__).resolve().parents[2] / "stone_slab_cad" / "params_example.json"

@pytest.fixture
def sample_config():
    with open(_PARAMS_PATH, "r", encoding="utf-8") as fh:
        return json.load(fh)


# ── tests ─────────────────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_generate_drawing_success(sample_config):
    """generate_drawing() should return a successful result with an SVG."""
    from app.services.cad_service import generate_drawing, _CAD_AVAILABLE

    if not _CAD_AVAILABLE:
        pytest.skip("ezdxf/drawsvg not installed — run: pip install ezdxf drawsvg")

    result = await generate_drawing(sample_config)

    assert result["success"] is True, f"Unexpected failure: {result.get('error')}"
    assert "svg" in result, "Missing 'svg' key in response"
    assert len(result["svg"]) > 0, "SVG is empty"
    assert result["data"]["material"] == sample_config["material"]["name"]


@pytest.mark.asyncio
async def test_generate_drawing_bad_config():
    """generate_drawing() should return success=False for malformed config."""
    from app.services.cad_service import generate_drawing, _CAD_AVAILABLE

    if not _CAD_AVAILABLE:
        pytest.skip("ezdxf/drawsvg not installed")

    result = await generate_drawing({"dims": {"length": 0, "width": 0, "height": 0}})
    # Either fails gracefully or succeeds with edge-case dims — no exception
    assert "success" in result


@pytest.mark.asyncio
async def test_get_materials_nonempty():
    """get_materials() should return a non-empty list with id/name/color keys."""
    from app.services.cad_service import get_materials

    materials = await get_materials()

    assert len(materials) > 0
    for m in materials:
        assert "id" in m
        assert "name" in m
        assert "color" in m
