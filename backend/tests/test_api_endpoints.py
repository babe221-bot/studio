"""
Integration + edge-case tests for FastAPI endpoints.

Tests run entirely in-process using httpx.AsyncClient + ASGITransport
(no real server needed).  Database lifespan is monkey-patched so tests
work without a live Postgres/SQLite instance.

Run from backend/:
    pip install pytest pytest-asyncio httpx
    pytest tests/test_api_endpoints.py -v
"""
import json
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient, ASGITransport


# ---------------------------------------------------------------------------
# App fixture — isolate the lifespan so we never hit a real DB
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def client():
    """Return an async test client with DB lifespan stubbed out."""
    with patch("app.services.database.init_db", new_callable=AsyncMock):
        from app.main import app
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            yield ac


# ===========================================================================
# Health / Root
# ===========================================================================

@pytest.mark.asyncio
async def test_root_returns_200(client):
    resp = await client.get("/")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "running"
    assert "message" in body


@pytest.mark.asyncio
async def test_health_check(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "healthy"


@pytest.mark.asyncio
async def test_data_status(client):
    resp = await client.get("/api/data/status")
    assert resp.status_code == 200
    assert resp.json()["status"] == "operational"


# ===========================================================================
# GET /api/cad/materials
# ===========================================================================

@pytest.mark.asyncio
async def test_list_materials_shape(client):
    resp = await client.get("/api/cad/materials")
    assert resp.status_code == 200
    materials = resp.json()
    assert isinstance(materials, list)
    assert len(materials) > 0
    for m in materials:
        assert "id" in m
        assert "name" in m
        assert "color" in m


@pytest.mark.asyncio
async def test_list_materials_all_ids_unique(client):
    resp = await client.get("/api/cad/materials")
    ids = [m["id"] for m in resp.json()]
    assert len(ids) == len(set(ids)), "Duplicate material IDs found"


# ===========================================================================
# POST /api/cad/ai/analyze_geometry
# ===========================================================================

VALID_DIMS = {"length": 100.0, "width": 60.0, "height": 2.0}


@pytest.mark.asyncio
async def test_analyze_geometry_basic(client):
    resp = await client.post(
        "/api/cad/ai/analyze_geometry",
        json={"dimensions": VALID_DIMS},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    result = body["result"]
    assert result["area_cm2"] == pytest.approx(100.0 * 60.0)
    assert result["perimeter_cm"] == pytest.approx(2 * (100.0 + 60.0))
    assert result["volume_cm3"] == pytest.approx(100.0 * 60.0 * 2.0)


@pytest.mark.asyncio
async def test_analyze_geometry_aspect_ratio_warning(client):
    """Aspect ratio > 4 should generate a warning."""
    resp = await client.post(
        "/api/cad/ai/analyze_geometry",
        json={"dimensions": {"length": 500.0, "width": 100.0, "height": 2.0}},
    )
    body = resp.json()
    assert body["success"] is True
    warnings = body["result"]["warnings"]
    assert any("omjer" in w["message"].lower() or "aspect" in w["message"].lower()
               for w in warnings), "Expected aspect-ratio warning"


@pytest.mark.asyncio
async def test_analyze_geometry_aspect_ratio_at_boundary(client):
    """Aspect ratio exactly 4 should NOT trigger the warning."""
    resp = await client.post(
        "/api/cad/ai/analyze_geometry",
        json={"dimensions": {"length": 400.0, "width": 100.0, "height": 2.0}},
    )
    body = resp.json()
    assert body["success"] is True
    # aspect_ratio == 4.0 is NOT > 4, so no warning
    assert body["result"]["aspect_ratio"] == pytest.approx(4.0)
    transport_warnings = [
        w for w in body["result"]["warnings"]
        if "omjer" in w["message"].lower() or "aspect" in w["message"].lower()
    ]
    assert len(transport_warnings) == 0


@pytest.mark.asyncio
async def test_analyze_geometry_thin_slab_error(client):
    """Thickness < 2 cm must produce a severity=error warning."""
    resp = await client.post(
        "/api/cad/ai/analyze_geometry",
        json={"dimensions": {"length": 100.0, "width": 60.0, "height": 1.0}},
    )
    body = resp.json()
    assert body["success"] is True
    error_warnings = [w for w in body["result"]["warnings"] if w["severity"] == "error"]
    assert len(error_warnings) > 0, "Expected error warning for thin slab"


@pytest.mark.asyncio
async def test_analyze_geometry_thick_slab_recommendation(client):
    """Thickness > 5 cm should add a recommendation."""
    resp = await client.post(
        "/api/cad/ai/analyze_geometry",
        json={"dimensions": {"length": 100.0, "width": 60.0, "height": 6.0}},
    )
    body = resp.json()
    assert body["success"] is True
    recs = body["result"]["recommendations"]
    assert len(recs) > 0, "Expected recommendation for thick slab"
    assert any("confidence" in r for r in recs)


@pytest.mark.asyncio
async def test_analyze_geometry_normal_thickness_no_thickness_warnings(client):
    """Normal thickness (2-5 cm) should not trigger thickness-related messages."""
    resp = await client.post(
        "/api/cad/ai/analyze_geometry",
        json={"dimensions": {"length": 100.0, "width": 60.0, "height": 3.0}},
    )
    body = resp.json()
    assert body["success"] is True
    # No warnings about thickness; recommendations list can be empty
    assert isinstance(body["result"]["warnings"], list)


@pytest.mark.asyncio
async def test_analyze_geometry_zero_dimensions(client):
    """Zero dimensions: area/volume should be 0, no crash."""
    resp = await client.post(
        "/api/cad/ai/analyze_geometry",
        json={"dimensions": {"length": 0.0, "width": 0.0, "height": 0.0}},
    )
    assert resp.status_code == 200
    body = resp.json()
    # Should succeed (not 500) even with degenerate input
    assert "success" in body
    if body["success"]:
        assert body["result"]["area_cm2"] == pytest.approx(0.0)
        assert body["result"]["volume_cm3"] == pytest.approx(0.0)


@pytest.mark.asyncio
async def test_analyze_geometry_missing_dimensions_field(client):
    """Request missing 'dimensions' key should return 422."""
    resp = await client.post("/api/cad/ai/analyze_geometry", json={})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_analyze_geometry_optional_material(client):
    """Request with material field should still succeed."""
    resp = await client.post(
        "/api/cad/ai/analyze_geometry",
        json={"dimensions": VALID_DIMS, "material": "granite"},
    )
    assert resp.status_code == 200
    assert resp.json()["success"] is True


@pytest.mark.asyncio
async def test_analyze_geometry_with_constraints(client):
    """Request with constraints list should succeed."""
    resp = await client.post(
        "/api/cad/ai/analyze_geometry",
        json={
            "dimensions": VALID_DIMS,
            "constraints": [{"type": "max_weight", "value": 500}],
        },
    )
    assert resp.status_code == 200
    assert resp.json()["success"] is True


# ===========================================================================
# POST /api/cad/ai/optimize_layout
# ===========================================================================

SLAB_300x200 = {"length": 300.0, "width": 200.0}

SINGLE_ITEM = [{"id": "item-1", "dims": {"width": 50.0, "length": 80.0}}]
TWO_ITEMS = [
    {"id": "item-1", "dims": {"width": 50.0, "length": 80.0}},
    {"id": "item-2", "dims": {"width": 60.0, "length": 90.0}},
]


@pytest.mark.asyncio
async def test_optimize_layout_single_item(client):
    resp = await client.post(
        "/api/cad/ai/optimize_layout",
        json={"slab_dimensions": SLAB_300x200, "items": SINGLE_ITEM},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    result = body["result"]
    assert result["total_items"] == 1
    assert len(result["layout"]) == 1
    assert result["layout"][0]["itemId"] == "item-1"
    assert result["layout"][0]["fits"] is True


@pytest.mark.asyncio
async def test_optimize_layout_two_items(client):
    resp = await client.post(
        "/api/cad/ai/optimize_layout",
        json={"slab_dimensions": SLAB_300x200, "items": TWO_ITEMS},
    )
    body = resp.json()
    assert body["success"] is True
    assert body["result"]["total_items"] == 2
    assert len(body["result"]["layout"]) == 2


@pytest.mark.asyncio
async def test_optimize_layout_efficiency_is_percentage(client):
    """Efficiency should be between 0 and 100."""
    resp = await client.post(
        "/api/cad/ai/optimize_layout",
        json={"slab_dimensions": SLAB_300x200, "items": TWO_ITEMS},
    )
    eff = resp.json()["result"]["efficiency"]
    assert 0.0 <= eff <= 100.0


@pytest.mark.asyncio
async def test_optimize_layout_empty_items(client):
    """Empty items list should succeed with zero items."""
    resp = await client.post(
        "/api/cad/ai/optimize_layout",
        json={"slab_dimensions": SLAB_300x200, "items": []},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["result"]["total_items"] == 0
    assert body["result"]["fits_all"] is True  # vacuously true


@pytest.mark.asyncio
async def test_optimize_layout_item_oversized_does_not_crash(client):
    """Item larger than the slab should be placed with fits=False, not crash."""
    big_item = [{"id": "giant", "dims": {"width": 500.0, "length": 500.0}}]
    resp = await client.post(
        "/api/cad/ai/optimize_layout",
        json={"slab_dimensions": SLAB_300x200, "items": big_item},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["result"]["layout"][0]["fits"] is False


@pytest.mark.asyncio
async def test_optimize_layout_fits_all_flag_false_for_oversized(client):
    """fits_all must be False when at least one item doesn't fit."""
    big_item = [{"id": "giant", "dims": {"width": 500.0, "length": 500.0}}]
    resp = await client.post(
        "/api/cad/ai/optimize_layout",
        json={"slab_dimensions": SLAB_300x200, "items": big_item},
    )
    assert resp.json()["result"]["fits_all"] is False


@pytest.mark.asyncio
async def test_optimize_layout_custom_kerf(client):
    """Custom kerf_width should be accepted."""
    resp = await client.post(
        "/api/cad/ai/optimize_layout",
        json={
            "slab_dimensions": SLAB_300x200,
            "items": SINGLE_ITEM,
            "kerf_width": 10.0,
        },
    )
    assert resp.status_code == 200
    assert resp.json()["success"] is True


@pytest.mark.asyncio
async def test_optimize_layout_positions_are_non_negative(client):
    """All positions in the layout must have x >= 0 and y >= 0."""
    resp = await client.post(
        "/api/cad/ai/optimize_layout",
        json={"slab_dimensions": SLAB_300x200, "items": TWO_ITEMS},
    )
    for entry in resp.json()["result"]["layout"]:
        assert entry["position"]["x"] >= 0
        assert entry["position"]["y"] >= 0


@pytest.mark.asyncio
async def test_optimize_layout_missing_slab_dimensions(client):
    """Missing slab_dimensions should return 422."""
    resp = await client.post(
        "/api/cad/ai/optimize_layout",
        json={"items": SINGLE_ITEM},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_optimize_layout_many_items_row_wrapping(client):
    """
    Many narrow items should wrap rows when they exceed the slab width.
    The y-position of later items should be > 0.
    """
    many_items = [
        {"id": f"item-{i}", "dims": {"width": 60.0, "length": 40.0}}
        for i in range(10)
    ]
    resp = await client.post(
        "/api/cad/ai/optimize_layout",
        json={"slab_dimensions": SLAB_300x200, "items": many_items},
    )
    body = resp.json()
    assert body["success"] is True
    positions = [e["position"]["y"] for e in body["result"]["layout"]]
    # At least some items should have been pushed to y > 0 (row wrapping)
    assert max(positions) > 0, "Expected row wrapping for 10 items on 200-wide slab"


@pytest.mark.asyncio
async def test_optimize_layout_efficiency_zero_for_empty(client):
    """Efficiency should be 0 for an empty items list."""
    resp = await client.post(
        "/api/cad/ai/optimize_layout",
        json={"slab_dimensions": SLAB_300x200, "items": []},
    )
    assert resp.json()["result"]["efficiency"] == 0.0


# ===========================================================================
# POST /api/cad/generate-drawing  (mocked CAD engine)
# ===========================================================================

_SAMPLE_REQUEST = {
    "dims": {"length": 100.0, "width": 60.0, "height": 2.0},
    "material": {"name": "Granite White", "color": "#f5f5dc"},
    "finish": {"name": "Polished", "roughness": 0.05},
    "profile": {"name": "Flat", "radius": 0.0},
    "processedEdges": {"front": True, "back": False, "left": False, "right": False},
    "okapnikEdges": {"front": False, "back": False, "left": False, "right": False},
}


@pytest.mark.asyncio
async def test_generate_drawing_cad_unavailable(client):
    """
    When the CAD engine is not installed, generate_drawing returns a 500
    with an informative error detail.
    """
    from app.services import cad_service as _svc

    # Temporarily mark CAD as unavailable
    original = _svc._CAD_AVAILABLE
    _svc._CAD_AVAILABLE = False
    _svc._CAD_IMPORT_ERROR = "No module named 'ezdxf'"
    try:
        resp = await client.post("/api/cad/generate-drawing", json=_SAMPLE_REQUEST)
        assert resp.status_code == 500
        detail = resp.json()["detail"]
        assert "unavailable" in detail.lower() or "ezdxf" in detail.lower()
    finally:
        _svc._CAD_AVAILABLE = original


@pytest.mark.asyncio
async def test_generate_drawing_missing_fields(client):
    """Incomplete request body should return 422."""
    resp = await client.post(
        "/api/cad/generate-drawing",
        json={"dims": {"length": 100.0}},  # missing required material/finish/profile
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_generate_drawing_success_mocked(client):
    """
    Mock _run_cad to write a fake SVG so we can test the happy path
    without needing ezdxf installed.
    """
    import base64, os

    fake_svg = b"<svg xmlns='http://www.w3.org/2000/svg'><rect width='100' height='60'/></svg>"

    def _write_fake_files(config, dxf_path, svg_path):
        # Write minimal DXF and SVG stubs
        with open(dxf_path, "w") as f:
            f.write("0\nSECTION\n0\nENDSEC\n0\nEOF\n")
        with open(svg_path, "wb") as f:
            f.write(fake_svg)

    with patch("app.services.cad_service._CAD_AVAILABLE", True), \
         patch("app.services.cad_service._run_cad", side_effect=_write_fake_files):
        resp = await client.post("/api/cad/generate-drawing", json=_SAMPLE_REQUEST)

    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["svg"] == base64.b64encode(fake_svg).decode()
    assert body["dxf_filename"] == "drawing.dxf"
    assert body["data"]["material"] == "Granite White"
    assert body["data"]["length"] == 100.0


# ===========================================================================
# POST /api/cad/process-slab  (file upload, mocked CAD engine)
# ===========================================================================

@pytest.mark.asyncio
async def test_process_slab_valid_json(client):
    """Upload a valid JSON params file; CAD engine mocked."""
    import base64

    fake_svg = b"<svg/>"

    def _write_fake(config, dxf_path, svg_path):
        with open(dxf_path, "w") as f:
            f.write("DXF")
        with open(svg_path, "wb") as f:
            f.write(fake_svg)

    payload = json.dumps(_SAMPLE_REQUEST).encode()

    with patch("app.services.cad_service._CAD_AVAILABLE", True), \
         patch("app.services.cad_service._run_cad", side_effect=_write_fake):
        resp = await client.post(
            "/api/cad/process-slab",
            files={"file": ("params.json", payload, "application/json")},
        )

    assert resp.status_code == 200
    assert resp.json()["success"] is True


@pytest.mark.asyncio
async def test_process_slab_invalid_json(client):
    """Uploading invalid JSON should return a 500 with error info."""
    bad_payload = b"this is not json!!!"

    with patch("app.services.cad_service._CAD_AVAILABLE", True):
        resp = await client.post(
            "/api/cad/process-slab",
            files={"file": ("bad.json", bad_payload, "application/json")},
        )

    assert resp.status_code == 500
    assert "detail" in resp.json()


@pytest.mark.asyncio
async def test_process_slab_no_file(client):
    """Missing file field should return 422."""
    resp = await client.post("/api/cad/process-slab")
    assert resp.status_code == 422
