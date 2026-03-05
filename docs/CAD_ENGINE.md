# CAD Engine Internals

The `stone_slab_cad` engine is the core geometric processing unit of the Studio platform. It bridges high-level user configurations to manufacturing-ready 2D drawings and photorealistic 3D assets.

## 1. Coordinate System
The engine uses a right-handed Cartesian coordinate system:
*   **X-axis:** Width of the slab (Port to Starboard).
*   **Y-axis:** Length/Depth of the slab (Anterior to Posterior).
*   **Z-axis:** Height/Thickness of the slab.

**Standard Orientation:**
*   (0,0,0) is located at the geometric center of the slab base.
*   The "Top Face" is at `Z = +Height/2`.
*   The "Bottom Face" is at `Z = -Height/2`.

## 2. Mesh Generation Logic (`slab3d.py`)
Geometry generation follows a three-phase protocol:

### Phase A: Primitive Scaffolding
Creates a base cube scaled to the exact dimensions provided in the configuration.
```python
bmesh.ops.create_cube(bm, size=1.0)
bmesh.ops.scale(bm, verts=bm.verts, vec=(length, height, width))
```

### Phase B: Edge Profiling
Uses the `bmesh.ops.bevel` operation to apply profiles (chamfers, bullnose, ogee) to selected edges.
*   **Z-fighting Mitigation:** Implements `remove_doubles` and `clamp_overlap` to ensure manifold geometry.
*   **Edge Selection:** Matches orientation strings (`front`, `back`, `left`, `right`) to specific vertex indices on the scaled cube.

### Phase C: Boolean Operations
Subtractive geometry is used for features like "Okapnik" (drip edges).
*   A cutter cube is generated and positioned relative to the bottom edge.
*   `bmesh.ops.intersect_boolean(operation='DIFFERENCE')` is executed to carve the groove.

## 3. UV Mapping & Texture Projection (`texture_mapping.py`)
To prevent stretching on varied slab sizes, the engine uses **World-Space Planar Projection**:
*   **Top/Bottom (XY):** UV = (X, Y)
*   **Front/Back (XZ):** UV = (X, Z)
*   **Sides (YZ):** UV = (Y, Z)

This ensures that a 1:1 texture aspect ratio is maintained regardless of whether the slab is 10cm or 300cm long.

## 4. Integration with Blender
The engine runs headlessly via `bpy`.
*   **Memory Management:** Each session starts with `clear_scene()`.
*   **Rendering:** Uses the `CYCLES` engine with GPU acceleration (where available) for photorealism.
*   **Export:** Models are exported as `.glb` with applied modifiers for the AR preview.
