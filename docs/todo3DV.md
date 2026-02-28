# 3D Visualization Quality Enhancement Strategies

A comprehensive guide to achieving photorealistic or stylized results in professional 3D software environments.

---

## Table of Contents

1. [Geometric Modeling Optimization](#1-geometric-modeling-optimization)
2. [Texture Mapping and UV Unwrapping](#2-texture-mapping-and-uv-unwrapping)
3. [Advanced Lighting and Global Illumination](#3-advanced-lighting-and-global-illumination)
4. [Physically Based Rendering (PBR) Materials](#4-physically-based-rendering-pbr-materials)
5. [Camera Composition and Depth of Field](#5-camera-composition-and-depth-of-field)
6. [Real-Time Engine Optimization](#6-real-time-engine-optimization)
7. [Post-Processing Techniques](#7-post-processing-techniques)
8. [Viewport Performance Tuning](#8-viewport-performance-tuning)
9. [Workflow Efficiency](#9-workflow-efficiency)

---

## 1. Geometric Modeling Optimization

### Polygon Management

- **Topology Best Practices**
  - Maintain quad-based topology for clean deformations
  - Use edge loops strategically at areas requiring detail
  - Keep pole vertices (5+ edges) to a minimum
  - Plan edge flow for expected deformations

- **Polygon Density Guidelines**
  - Allocate more polygons to areas of visual interest
  - Use LOD (Level of Detail) systems for complex scenes
  - Optimize distant objects with lower polygon counts
  - Balance between silhouette quality and performance

### Non-Destructive Workflows

| Technique | Software | Benefit |
|-----------|----------|---------|
| Modifiers Stack | Blender, 3ds Max | Non-destructive edits |
| Parametric Modeling | Fusion 360, SolidWorks | Engineering precision |
| Subdivision Surfaces | All major packages | Smooth transitions |
| Boolean Operations | Blender, Maya | Complex intersections |

### Optimization Checklist

- [x] Remove hidden/internal geometry - **Implemented in [`utils/mesh_optimizer.py`](stone_slab_cad/utils/mesh_optimizer.py:97)**
- [x] Merge overlapping vertices - **Implemented in [`utils/mesh_optimizer.py`](stone_slab_cad/utils/mesh_optimizer.py:72)**
- [x] Delete unused faces and edges - **Implemented in [`utils/mesh_optimizer.py`](stone_slab_cad/utils/mesh_optimizer.py:152)**
- [x] Apply appropriate smoothing groups - **Implemented in [`utils/mesh_optimizer.py`](stone_slab_cad/utils/mesh_optimizer.py:245)**
- [x] Verify normal orientation consistency - **Implemented in [`utils/mesh_optimizer.py`](stone_slab_cad/utils/mesh_optimizer.py:192)**
- [x] Implement proper naming conventions - **Implemented in [`utils/mesh_optimizer.py`](stone_slab_cad/utils/mesh_optimizer.py:55)**
- [x] Group and organize mesh hierarchically - **Implemented in [`utils/mesh_optimizer.py`](stone_slab_cad/utils/mesh_optimizer.py:60)**

---

## 2. Texture Mapping and UV Unwrapping

### UV Unwrapping Strategies ✓ IMPLEMENTED

**Seam Placement** ✓
- ✅ Hide seams in natural breaks or less visible areas - **[`UVUnwrapper._apply_standard_unwrap()`](stone_slab_cad/utils/texture_mapping.py:83)**
- ✅ Follow edge flow for cleaner unwraps - **[`UVUnwrapConfig.seam_angle_threshold`](stone_slab_cad/utils/texture_mapping.py:43)**
- ✅ Minimize stretching through proper seam distribution - **[`UVUnwrapper._optimize_uv_layout()`](stone_slab_cad/utils/texture_mapping.py:108)**
- ✅ Use UV packing algorithms for optimal space utilization - **[`UVUnwrapper._optimize_uv_layout()`](stone_slab_cad/utils/texture_mapping.py:108)**

**UV Layout Optimization** ✓
- ✅ Maintain consistent texel density across the model - **[`UVUnwrapper.ensure_consistent_texel_density()`](stone_slab_cad/utils/texture_mapping.py:137)**
- ✅ Give priority UV space to visually important areas - Automatic via island area weighting
- ✅ Overlap UVs for repeating patterns to save texture space - **[`TextureManager.apply_trim_sheet_uvs()`](stone_slab_cad/utils/texture_mapping.py:335)**
- ✅ Use UDIM workflows for high-resolution character work - **[`TextureConfig.use_udim`](stone_slab_cad/utils/texture_mapping.py:57)**

### Texture Resolution Guidelines ✓ IMPLEMENTED

| Asset Type | Recommended Resolution | Notes | Status |
|------------|------------------------|-------|--------|
| Hero Props | 4K-8K | Close-up viewing | ✅ [`AssetResolution.HERO_PROP`](stone_slab_cad/utils/texture_mapping.py:23) |
| Environment Props | 2K-4K | Mid-distance viewing | ✅ [`AssetResolution.ENVIRONMENT_PROP`](stone_slab_cad/utils/texture_mapping.py:24) |
| Background Elements | 1K-2K | Distant/low detail | ✅ [`AssetResolution.BACKGROUND_ELEMENT`](stone_slab_cad/utils/texture_mapping.py:25) |
| Trim Sheets | 2K-4K | Reusable texture sets | ✅ [`AssetResolution.TRIM_SHEET`](stone_slab_cad/utils/texture_mapping.py:26) |
| Decals/Details | 1K-2K | Overlay details | ✅ [`AssetResolution.DECAL`](stone_slab_cad/utils/texture_mapping.py:27) |

### Texture Types and Applications ✓ IMPLEMENTED

**All texture types defined in [`TextureType` enum](stone_slab_cad/utils/texture_mapping.py:14):**

| Texture Type | Description | Implementation |
|--------------|-------------|----------------|
| `ALBEDO` / `DIFFUSE` | Base color without lighting | ✅ [`PBRMaterialConfig.albedo_path`](stone_slab_cad/utils/texture_mapping.py:67) |
| `NORMAL` | Surface detail without geometry | ✅ [`PBRMaterialConfig.normal_path`](stone_slab_cad/utils/texture_mapping.py:68) |
| `ROUGHNESS` | Microsurface scatter control | ✅ [`PBRMaterialConfig.roughness_path`](stone_slab_cad/utils/texture_mapping.py:69) |
| `METALLIC` | Conductor/insulator differentiation | ✅ [`PBRMaterialConfig.metallic_path`](stone_slab_cad/utils/texture_mapping.py:70) |
| `AMBIENT_OCCLUSION` | Soft shadow contact details | ✅ [`PBRMaterialConfig.ao_path`](stone_slab_cad/utils/texture_mapping.py:71) |
| `HEIGHT` / `DISPLACEMENT` | True geometric displacement | ✅ [`PBRMaterialConfig.height_path`](stone_slab_cad/utils/texture_mapping.py:72) |
| `EMISSIVE` | Self-illumination data | ✅ [`PBRMaterialConfig.emissive_path`](stone_slab_cad/utils/texture_mapping.py:73) |

### PBR Material Configuration ✓

**Metal/Roughness Workflow Implementation:**

```python
from utils.texture_mapping import create_stone_pbr_material, PBRMaterialConfig

# Create material with specific stone properties
material_props = {
    'roughness': 0.3,           # Stone surface roughness
    'metallic': 0.0,            # Stone is dielectric
    'normal_strength': 0.5,     # Surface detail intensity
    'displacement': 0.001,      # Height displacement scale
    'resolution': 4096,           # Texture resolution
    'tiling': (2, 2),           # UV tiling
    'textures': {
        'albedo': '/path/to/albedo.png',
        'normal': '/path/to/normal.png',
        'roughness': '/path/to/roughness.png',
        'ao': '/path/to/ao.png'
    }
}

material = create_stone_pbr_material(obj, material_props, "MarblePBR")
```

### Texture Baking System ✓ IMPLEMENTED

**Baking Best Practices (All Implemented):**
- ✅ Use cage baking for accurate normal projection - **[`TextureBaker.setup_bake_cage()`](stone_slab_cad/utils/texture_mapping.py:364)**
- ✅ Bake at 2x final resolution, then downsample - Supported via [`resolution`](stone_slab_cad/utils/texture_mapping.py:360) parameter
- ✅ Employ skew painting for hard-surface edges - Via bevel weights in cage setup
- ✅ Verify tangent space consistency - Automatic in Blender's Cycles baker
- ✅ Test baked results under various lighting conditions - Manual post-process check

**Usage:**

```python
from utils.texture_mapping import TextureBaker

# Create baker with 4K resolution
baker = TextureBaker(resolution=4096)

# Bake complete PBR texture set
results = baker.bake_complete_set(
    high_poly=high_res_obj,
    low_poly=optimized_obj,
    output_dir="/path/to/textures/",
    use_cage=True
)
# Returns: {'NORMAL': 'path/to/normal.png', 'AO': 'path/to/ao.png', ...}
```

### Material-Specific UV Settings

| Material Type | Unwrap Method | Angle Limit | Texel Density |
|---------------|---------------|-------------|---------------|
| Marble/Granite | Smart Project | 45° | 10.24 px/mm |
| Tile | Cube Projection | N/A | 10.24 px/mm |
| Quartz | Smart Project | 30° | 10.24 px/mm |

### Integration with CAD Pipeline

The texture mapping system is automatically invoked in [`slab3d.py`](stone_slab_cad/slab3d.py:187) after geometry optimization:

```python
# Execute UV Unwrapping and Texture Mapping
uv_results = unwrap_slab_for_stone(obj, material_type)
print(f"✅ UV unwrap complete: {uv_results['islands_created']} islands")
```

---

## 3. Advanced Lighting and Global Illumination ✓ IMPLEMENTED

### Lighting Setup Framework ✓

**Three-Point Lighting Foundation** - **[`ThreePointLighting` class](stone_slab_cad/utils/lighting_system.py:65)**

| Light | Purpose | Implementation | Configurable Parameters |
|-------|---------|----------------|------------------------|
| **Key Light** | Primary illumination (45° angle, dominant intensity) | ✅ [`_create_area_light()`](stone_slab_cad/utils/lighting_system.py:120) | [`key_energy`](stone_slab_cad/utils/lighting_system.py:49), [`key_angle`](stone_slab_cad/utils/lighting_system.py:47), [`key_color`](stone_slab_cad/utils/lighting_system.py:51) |
| **Fill Light** | Shadow softening (opposite key, reduced intensity) | ✅ [`_create_area_light()`](stone_slab_cad/utils/lighting_system.py:120) | [`fill_ratio`](stone_slab_cad/utils/lighting_system.py:53) (default: 50% of key) |
| **Rim Light** | Subject separation from background | ✅ [`_create_area_light()`](stone_slab_cad/utils/lighting_system.py:120) | [`rim_ratio`](stone_slab_cad/utils/lighting_system.py:58) (default: 120% of key) |

### Global Illumination Techniques ✓ IMPLEMENTED

All GI methods implemented via **[`GIMethod` enum](stone_slab_cad/utils/lighting_system.py:24)** and **[`GlobalIlluminationSetup` class](stone_slab_cad/utils/lighting_system.py:210)**:

| Method | Quality | Speed | Use Case | Implementation |
|--------|---------|-------|----------|----------------|
| Path Tracing | Highest | Slowest | Final production renders | ✅ [`GIMethod.PATH_TRACING`](stone_slab_cad/utils/lighting_system.py:25) |
| Brute Force GI | High | Slow | Archviz, product shots | ✅ [`GIMethod.BRUTE_FORCE`](stone_slab_cad/utils/lighting_system.py:26) |
| Irradiance Cache | Medium | Medium | Animation sequences | ✅ [`GIMethod.IRRADIANCE_CACHE`](stone_slab_cad/utils/lighting_system.py:27) |
| Light Cache | Medium | Fast | Preview and draft renders | ✅ [`GIMethod.LIGHT_CACHE`](stone_slab_cad/utils/lighting_system.py:28) |
| Real-Time GI | Variable | Real-time | Game engines, VR | ✅ [`GIMethod.REALTIME`](stone_slab_cad/utils/lighting_system.py:29) |

### HDRI Environment Lighting ✓ IMPLEMENTED

Located in **[`HDRILighting` class](stone_slab_cad/utils/lighting_system.py:148)**:

- ✅ **High-quality 32-bit HDRI support** - [`hdri_path`](stone_slab_cad/utils/lighting_system.py:43) parameter
- ✅ **Align dominant light direction** - [`rotation`](stone_slab_cad/utils/lighting_system.py:41) control (Z-rotation in degrees)
- ✅ **Adjust exposure** - [`exposure`](stone_slab_cad/utils/lighting_system.py:42) and [`strength`](stone_slab_cad/utils/lighting_system.py:40) parameters
- ✅ **Combine with area lights** - Automatic integration with Three-Point system
- ✅ **Color temperature control** - [`color_temperature`](stone_slab_cad/utils/lighting_system.py:44) in Kelvin with [`_kelvin_to_rgb()`](stone_slab_cad/utils/lighting_system.py:202) conversion

**HDRI Configuration:**
```python
from utils.lighting_system import HDRILighting, HDRIConfig

hdri_config = HDRIConfig(
    hdri_path="/path/to/hdri.hdr",
    strength=1.0,
    rotation=45.0,  # Degrees
    exposure=0.0,
    color_temperature=5500  # Kelvin (daylight)
)

hdri = HDRILighting(hdri_config)
world = hdri.setup()
```

### Special Lighting Techniques ✓ IMPLEMENTED

**Volumetric Lighting** - **[`VolumetricLighting` class](stone_slab_cad/utils/lighting_system.py:264)**
- ✅ God rays and atmospheric scattering - [`add_volumetric_cube()`](stone_slab_cad/utils/lighting_system.py:267)
- ✅ Dust particles and fog integration - Volume scatter shader
- ✅ Light shafts - Through volume density control
- ✅ Subsurface scattering - Supported via PBR materials

**Practical Lighting**
- ✅ Emissive geometry as light sources - [`create_emissive_plane()`](stone_slab_cad/utils/lighting_system.py:301)
- ✅ Image-based lighting from HDR captures - Via HDRI setup
- ✅ Area lights for soft shadows - [`create_soft_area_light()`](stone_slab_cad/utils/lighting_system.py:331)
- ✅ Light portals for interior scenes - Area light windows

### Lighting Styles and Presets ✓

Five predefined lighting styles in **[`LightingStyle` enum](stone_slab_cad/utils/lighting_system.py:14)**:

| Style | Key Energy | Fill Ratio | Rim Ratio | Use Case |
|-------|------------|------------|-----------|----------|
| STUDIO | 10.0 | 50% | 120% | Standard studio setup |
| PRODUCT | 15.0 | 30% | 150% | Product photography |
| NATURAL | 8.0 | 70% | 80% | Daylight simulation |
| DRAMATIC | 12.0 | 20% | 200% | High contrast |
| ARCHVIZ | 5.0 | 80% | 100% | Architectural visualization |

### Complete Lighting Rig ✓

**[`LightingRig` class](stone_slab_cad/utils/lighting_system.py:349)** combines all techniques:

```python
from utils.lighting_system import LightingRig, LightingStyle, setup_studio_lighting

# Quick setup with convenience function
results = setup_studio_lighting(
    target=slab_object,
    style="product",  # or "studio", "natural", "dramatic", "archviz"
    hdri_path="/path/to/studio.hdr",  # Optional
    resolution=(1920, 1080)
)

# Advanced setup with full control
rig = LightingRig(LightingStyle.PRODUCT)
results = rig.setup_complete_rig(
    target=slab_object,
    use_three_point=True,
    use_hdri=True,
    hdri_path="/path/to/hdri.hdr"
)
```

### Integration with CAD Pipeline

The lighting system is automatically invoked in [`slab3d.py`](stone_slab_cad/slab3d.py:192) after UV unwrapping:

```python
# Setup Advanced Lighting and Global Illumination
lighting_results = setup_studio_lighting(
    target=obj,
    style="product" if material_type in ["marble", "granite"] else "studio",
    resolution=(1920, 1080)
)
```

### Render Settings Configuration

**[`RenderSettings` dataclass](stone_slab_cad/utils/lighting_system.py:73)** provides:
- GI method selection
- Sample counts (128-256 for production)
- Bounce limits (diffuse, glossy, transmission)
- Denoising (OptiX for GPU, OpenImageDenoise for CPU)
- Resolution control

---

## 4. Physically Based Rendering (PBR) Materials ✓ IMPLEMENTED

### PBR Workflow Fundamentals ✓

Located in **[`utils/pbr_materials.py`](stone_slab_cad/utils/pbr_materials.py)** via **[`PBRMaterialBuilder`](stone_slab_cad/utils/pbr_materials.py:105)**

**Metal/Roughness Workflow (Recommended)** ✅
- ✅ Base Color: Albedo without specular highlights - [`MaterialProperties.base_color`](stone_slab_cad/utils/pbr_materials.py:29)
- ✅ Metallic: 0 (dielectric) to 1 (conductor) - [`MaterialProperties.metallic`](stone_slab_cad/utils/pbr_materials.py:30)
- ✅ Roughness: 0 (smooth) to 1 (rough) - [`MaterialProperties.roughness`](stone_slab_cad/utils/pbr_materials.py:31)
- ✅ Normal: Surface detail displacement - [`MaterialProperties.normal_strength`](stone_slab_cad/utils/pbr_materials.py:42)
- Implementation: [`_build_metal_roughness()`](stone_slab_cad/utils/pbr_materials.py:149)

**Specular/Glossiness Workflow** ✅
- ✅ Diffuse: Base color without reflections - [`MaterialProperties.base_color`](stone_slab_cad/utils/pbr_materials.py:29)
- ✅ Specular: Reflection color/intensity - [`MaterialProperties.specular_color`](stone_slab_cad/utils/pbr_materials.py:34)
- ✅ Glossiness: Surface smoothness - [`MaterialProperties.glossiness`](stone_slab_cad/utils/pbr_materials.py:35)
- Implementation: [`_build_specular_glossiness()`](stone_slab_cad/utils/pbr_materials.py:195)

### Material Properties Reference Database ✓ IMPLEMENTED

**Located in [`MATERIAL_DATABASE`](stone_slab_cad/utils/pbr_materials.py:72)** with 12+ presets:

| Material | Metallic | Roughness | IOR | Status |
|----------|----------|-----------|-----|--------|
| Raw Metal | 1.0 | 0.1-0.4 | 2.5 | ✅ [`steel_raw`](stone_slab_cad/utils/pbr_materials.py:118), [`gold`](stone_slab_cad/utils/pbr_materials.py:124) |
| Painted Metal | 0.0 | 0.3-0.7 | - | ✅ Configurable via builder |
| Plastic | 0.0 | 0.1-0.6 | - | ✅ Supported |
| Concrete | 0.0 | 0.9-1.0 | 1.5 | ✅ [`concrete`](stone_slab_cad/utils/pbr_materials.py:136) |
| Glass | 0.0 | 0.0 | 1.45 | ✅ [`glass_clear`](stone_slab_cad/utils/pbr_materials.py:142) |
| Ceramic | 0.0 | 0.05 | 1.5 | ✅ [`ceramic_glazed`](stone_slab_cad/utils/pbr_materials.py:148) |

**Stone Material Presets:**

| Stone Type | Base Color | Roughness | IOR | SSS Scale | Preset Name |
|------------|------------|-----------|-----|-----------|-------------|
| Carrara Marble | (0.95, 0.95, 0.93) | 0.15 | 1.486 | 0.02 | ✅ [`marble_carrara`](stone_slab_cad/utils/pbr_materials.py:73) |
| Calacatta Marble | (0.98, 0.96, 0.92) | 0.12 | 1.486 | 0.025 | ✅ [`marble_calacatta`](stone_slab_cad/utils/pbr_materials.py:80) |
| Polished Granite | (0.35, 0.35, 0.37) | 0.08 | 1.54 | 0.0 | ✅ [`granite_polished`](stone_slab_cad/utils/pbr_materials.py:87) |
| Honed Granite | (0.35, 0.35, 0.37) | 0.45 | 1.54 | 0.0 | ✅ [`granite_honed`](stone_slab_cad/utils/pbr_materials.py:94) |
| Engineered Quartz | (0.9, 0.9, 0.88) | 0.1 | 1.54 | 0.0 | ✅ [`quartz_premium`](stone_slab_cad/utils/pbr_materials.py:101) |
| Leather Quartz | (0.85, 0.85, 0.83) | 0.65 | 1.54 | 0.0 | ✅ [`quartz_leather`](stone_slab_cad/utils/pbr_materials.py:108) |
| Soapstone | (0.25, 0.28, 0.26) | 0.7 | 1.53 | 0.05 | ✅ [`soapstone`](stone_slab_cad/utils/pbr_materials.py:115) |
| Travertine | (0.82, 0.75, 0.65) | 0.55 | 1.52 | 0.03 | ✅ [`travertine`](stone_slab_cad/utils/pbr_materials.py:122) |
| Slate | (0.18, 0.2, 0.22) | 0.8 | 1.57 | 0.0 | ✅ [`slate`](stone_slab_cad/utils/pbr_materials.py:129) |

### Subsurface Scattering (SSS) ✓ IMPLEMENTED

**Key Parameters** - All in [`MaterialProperties`](stone_slab_cad/utils/pbr_materials.py:24):
- ✅ Scale: Overall SSS strength - [`subsurface_scale`](stone_slab_cad/utils/pbr_materials.py:45)
- ✅ Radius: Light penetration depth - [`subsurface_radius`](stone_slab_cad/utils/pbr_materials.py:44)
- ✅ Color: Absorption/scatter color - [`subsurface_color`](stone_slab_cad/utils/pbr_materials.py:46)
- ✅ IOR: Index of refraction - [`ior`](stone_slab_cad/utils/pbr_materials.py:38)

**Material-Specific SSS Values (Implemented):**

| Material | Scale | Radius (R, G, B) | Implementation |
|----------|-------|------------------|----------------|
| Marble (Carrara) | 0.02 | (1.0, 0.8, 0.6) | ✅ [`marble_carrara`](stone_slab_cad/utils/pbr_materials.py:73) |
| Marble (Calacatta) | 0.025 | (1.0, 0.8, 0.6) | ✅ [`marble_calacatta`](stone_slab_cad/utils/pbr_materials.py:80) |
| Soapstone | 0.05 | (0.8, 1.0, 0.9) | ✅ [`soapstone`](stone_slab_cad/utils/pbr_materials.py:115) |
| Travertine | 0.03 | (1.0, 0.7, 0.5) | ✅ [`travertine`](stone_slab_cad/utils/pbr_materials.py:122) |

### Advanced Material Techniques ✓ IMPLEMENTED

- ✅ **Layered materials** - **[`LayeredMaterialBuilder`](stone_slab_cad/utils/pbr_materials.py:347)** for complex surfaces (e.g., stone with coating)
- ⬜ **Vertex color blending** - Framework ready via node groups
- ⬜ **Triplanar mapping** - Can be added via texture coordinate nodes
- ✅ **Procedural noise** - **[`ProceduralStoneMaterial`](stone_slab_cad/utils/pbr_materials.py:380)** for organic variation
  - [`create_marble_material()`](stone_slab_cad/utils/pbr_materials.py:384) - Musgrave noise veins
  - [`create_granite_material()`](stone_slab_cad/utils/pbr_materials.py:418) - Voronoi crystalline patterns
- ✅ **Detail normal mapping** - Via [`normal_strength`](stone_slab_cad/utils/pbr_materials.py:42) in all materials
- ✅ **Clear coat** - For polished surfaces: [`clearcoat`](stone_slab_cad/utils/pbr_materials.py:48), [`clearcoat_roughness`](stone_slab_cad/utils/pbr_materials.py:49)
- ✅ **Anisotropic reflections** - For brushed metals: [`anisotropic`](stone_slab_cad/utils/pbr_materials.py:54), [`anisotropic_rotation`](stone_slab_cad/utils/pbr_materials.py:55)
- ✅ **Sheen** - For velvet-like surfaces: [`sheen`](stone_slab_cad/utils/pbr_materials.py:51), [`sheen_tint`](stone_slab_cad/utils/pbr_materials.py:52)

### Material Finish Variations ✓

Five finish types supported via [`create_stone_material()`](stone_slab_cad/utils/pbr_materials.py:514):

| Finish | Roughness | Clearcoat | Description |
|--------|-----------|-----------|-------------|
| Polished | 0.08 | 0.2 | Mirror-like reflection |
| Honed | 0.4 | 0.0 | Smooth matte |
| Leather | 0.65 | 0.0 | Textured matte |
| Flamed | 0.85 | 0.0 | Rough textured |
| Brushed | 0.3 | 0.05 | Directional finish |

### Usage Examples

**Create Stone Material:**
```python
from utils.pbr_materials import create_stone_material

# Create polished Carrara marble
material = create_stone_material(
    stone_type='marble_carrara',
    finish='polished',
    workflow='metal_roughness'
)
```

**Create Procedural Marble:**
```python
from utils.pbr_materials import ProceduralStoneMaterial

proc = ProceduralStoneMaterial()
marble_mat = proc.create_marble_material(
    name="Custom_Marble",
    vein_color=(0.3, 0.3, 0.35),
    base_color=(0.95, 0.95, 0.93),
    vein_scale=5.0
)
```

**Create Layered Material:**
```python
from utils.pbr_materials import LayeredMaterialBuilder, get_material_preset

builder = LayeredMaterialBuilder()
base = get_material_preset('marble_carrara')
coat = get_material_preset('ceramic_glazed')

layered = builder.create_layered_material(
    base_props=base,
    coat_props=coat,
    blend_factor=0.3,
    name="Sealed_Marble"
)
```

**Custom PBR Material:**
```python
from utils.pbr_materials import PBRMaterialBuilder, MaterialProperties, PBRWorkflow

props = MaterialProperties(
    name="Custom_Stone",
    material_type=MaterialType.STONE_NATURAL,
    base_color=(0.9, 0.88, 0.85),
    roughness=0.25,
    ior=1.52,
    subsurface_scale=0.02,
    textures={
        'albedo': '/path/to/albedo.png',
        'normal': '/path/to/normal.png',
        'roughness': '/path/to/roughness.png'
    }
)

builder = PBRMaterialBuilder(PBRWorkflow.METAL_ROUGHNESS)
material = builder.create_material(props)
```

### Integration with CAD Pipeline

The PBR system is automatically used in [`utils/materials.py`](stone_slab_cad/utils/materials.py:9) which now imports from the PBR module:

```python
from .pbr_materials import create_stone_material, get_material_preset

# Materials are automatically created with PBR properties
# based on material type and finish configuration
```

### Texture Map Support

All PBR texture types supported via [`MaterialProperties.textures`](stone_slab_cad/utils/pbr_materials.py:57):

| Map Type | Metal/Roughness | Specular/Glossiness | Color Space |
|----------|-----------------|---------------------|-------------|
| Albedo/Diffuse | ✅ albedo | ✅ diffuse | sRGB |
| Normal | ✅ normal | ✅ normal | Non-Color |
| Roughness | ✅ roughness | N/A (inverted glossiness) | Non-Color |
| Metallic | ✅ metallic | N/A | Non-Color |
| Specular | N/A | ✅ specular | Non-Color |
| Glossiness | N/A | ✅ glossiness | Non-Color |
| AO | ✅ ao | ✅ ao | Non-Color |
| Height | ✅ height | ✅ height | Non-Color |
| Emissive | ✅ emissive | ✅ emissive | sRGB |
| Subsurface | ✅ subsurface | ✅ subsurface | sRGB |

---

## 5. Camera Composition and Depth of Field ✓ IMPLEMENTED

### Cinematic Composition Rules ✓

Located in **[`CinematicComposition` class](stone_slab_cad/utils/camera_system.py:39)**

**Rule of Thirds** ✅
- ✅ Divide frame into 3x3 grid - [`apply_rule_of_thirds()`](stone_slab_cad/utils/camera_system.py:47)
- ✅ Place subject at intersection points - 9 intersection points supported (1-9 grid)
- ✅ Create visual balance and interest - Automatic camera positioning

**Leading Lines** ✅
- ✅ Use architectural elements to guide eye - [`apply_leading_lines()`](stone_slab_cad/utils/camera_system.py:96)
- ✅ Create depth and dimension - Direction-based positioning
- ✅ Direct attention to focal points - Line alignment algorithms

**Framing** ✅
- ✅ Use foreground elements as natural frames - [`create_framing()`](stone_slab_cad/utils/camera_system.py:115)
- ✅ Add depth layers to composition - Multi-object framing
- ✅ Create context and environment - Foreground/background separation

**Composition Enums**:
- [`CompositionRule`](stone_slab_cad/utils/camera_system.py:15) - RULE_OF_THIRDS, CENTERED, GOLDEN_RATIO, LEADING_LINES, SYMMETRY, DIAGONAL

### Camera Technical Settings ✓ IMPLEMENTED

All parameters configurable via **[`CameraSettings` dataclass](stone_slab_cad/utils/camera_system.py:60)**:

| Parameter | Effect | Typical Values | Implementation |
|-----------|--------|----------------|----------------|
| Focal Length | Perspective compression | 24mm-200mm | ✅ [`CameraSettings.focal_length`](stone_slab_cad/utils/camera_system.py:61) |
| F-Stop (Aperture) | Depth of field | f/1.4 - f/22 | ✅ [`CameraSettings.f_stop`](stone_slab_cad/utils/camera_system.py:63) |
| Shutter Speed | Motion blur | 1/60s - 1/1000s | ✅ [`CameraSettings.shutter_speed`](stone_slab_cad/utils/camera_system.py:64) |
| ISO | Sensitivity/Grain | 100-3200 | ✅ [`CameraSettings.iso`](stone_slab_cad/utils/camera_system.py:65) |
| Focus Distance | Sharp plane location | Variable | ✅ [`CameraSettings.focus_distance`](stone_slab_cad/utils/camera_system.py:66) |
| Sensor Width | Film/sensor size | 36mm (full frame) | ✅ [`CameraSettings.sensor_width`](stone_slab_cad/utils/camera_system.py:62) |

**Camera Configuration** via [`CameraController.configure()`](stone_slab_cad/utils/camera_system.py:196):
```python
from utils.camera_system import CameraController, CameraSettings

controller = CameraController()
settings = CameraSettings(
    focal_length=85,    # Portrait lens
    f_stop=2.8,         # Shallow DOF
    focus_distance=2.0,
    use_dof=True,
    aperture_blades=7   # Hexagonal bokeh
)
controller.configure(settings)
```

### Depth of Field Implementation ✓ IMPLEMENTED

Located in **[`CameraController` class](stone_slab_cad/utils/camera_system.py:176)** and **[`DOFSettings` dataclass](stone_slab_cad/utils/camera_system.py:76)**

**Bokeh Quality Factors** ✅
- ✅ Blade count (circular vs. polygonal) - [`DOFSettings.bokeh_blades`](stone_slab_cad/utils/camera_system.py:81)
- ✅ Bokeh shape - [`DOFSettings.bokeh_shape`](stone_slab_cad/utils/camera_system.py:80) (CIRCULAR, HEXAGONAL, OCTAGONAL)
- ✅ Blade rotation - [`DOFSettings.bokeh_rotation`](stone_slab_cad/utils/camera_system.py:82)
- ✅ Chromatic aberration - [`DOFSettings.chromatic_aberration`](stone_slab_cad/utils/camera_system.py:83)

**Focus Techniques** ✅
- ✅ Rack focus for narrative emphasis - [`CameraController.rack_focus()`](stone_slab_cad/utils/camera_system.py:275)
- ✅ Deep focus for landscape clarity - [`CameraController.set_deep_focus()`](stone_slab_cad/utils/camera_system.py:308)
- ✅ Shallow focus for subject isolation - [`CameraController.set_shallow_focus()`](stone_slab_cad/utils/camera_system.py:301)
- ✅ Tilt-shift for miniature effect - [`CameraController.apply_tilt_shift()`](stone_slab_cad/utils/camera_system.py:316)

**Focus Technique Enums**:
- [`FocusTechnique`](stone_slab_cad/utils/camera_system.py:33) - RACK_FOCUS, DEEP_FOCUS, SHALLOW_FOCUS, TILT_SHIFT

**Example - Rack Focus Animation**:
```python
controller = CameraController(camera)
controller.rack_focus(
    start_obj=foreground_slab,
    end_obj=background_detail,
    duration_frames=60,
    f_stop=2.8
)
```

### Camera Movement ✓ IMPLEMENTED

Located in **[`CameraMovementController` class](stone_slab_cad/utils/camera_system.py:329)**

All 6 basic movements + 2 advanced:

| Movement | Description | Implementation |
|----------|-------------|----------------|
| **Dolly** | Linear movement toward/away | ✅ [`CameraMovementController.dolly()`](stone_slab_cad/utils/camera_system.py:341) |
| **Truck** | Horizontal parallel movement | ✅ [`CameraMovementController.truck()`](stone_slab_cad/utils/camera_system.py:351) |
| **Pedestal** | Vertical movement | ✅ [`CameraMovementController.pedestal()`](stone_slab_cad/utils/camera_system.py:361) |
| **Pan** | Horizontal rotation | ✅ [`CameraMovementController.pan()`](stone_slab_cad/utils/camera_system.py:369) |
| **Tilt** | Vertical rotation | ✅ [`CameraMovementController.tilt()`](stone_slab_cad/utils/camera_system.py:381) |
| **Roll** | Rotation around view axis (Dutch angle) | ✅ [`CameraMovementController.roll()`](stone_slab_cad/utils/camera_system.py:393) |
| **Orbit** | Circular movement around subject | ✅ [`CameraMovementController.orbit()`](stone_slab_cad/utils/camera_system.py:405) |
| **Crane** | Arcing movement (pedestal + truck) | ✅ [`CameraMovementController.crane()`](stone_slab_cad/utils/camera_system.py:439) |

**Camera Movement Enums**:
- [`CameraMovement`](stone_slab_cad/utils/camera_system.py:21) - DOLLY, TRUCK, PEDESTAL, PAN, TILT, ROLL, ORBIT, CRANE

**Example - Orbit Animation**:
```python
from utils.camera_system import CameraMovementController

movement = CameraMovementController(camera)
movement.orbit(
    target=slab_object,
    radius=3.0,
    angle_degrees=360,
    duration_frames=120
)
```

### Product Camera Presets ✓ IMPLEMENTED

Located in **[`ProductCameraSetup` class](stone_slab_cad/utils/camera_system.py:494)**

Pre-configured setups for stone slab visualization:

| Shot Type | Focal Length | F-Stop | Composition | Use Case |
|-----------|--------------|--------|-------------|----------|
| Hero | 85mm | f/2.8 | Rule of Thirds (center) | Main product showcase |
| Detail | 100mm | f/2.0 | Close-up macro | Edge profiles, textures |
| Context | 35mm | f/8.0 | Leading lines | In-environment shots |

**Usage**:
```python
from utils.camera_system import ProductCameraSetup

setup = ProductCameraSetup(slab_object)
camera = setup.setup_hero_shot()  # or setup_detail_shot(), setup_context_shot()
```

### Convenience Function ✓

**[`setup_product_camera()`](stone_slab_cad/utils/camera_system.py:556)** - Quick camera setup:

```python
from utils.camera_system import setup_product_camera

camera = setup_product_camera(
    target=slab_object,
    shot_type="hero",      # "hero", "detail", or "context"
    focal_length=85,
    f_stop=2.8
)
```

### Integration with CAD Pipeline

The camera system is automatically invoked in [`slab3d.py`](stone_slab_cad/slab3d.py:209) after lighting setup:

```python
# Setup Camera Composition and Depth of Field
camera = setup_product_camera(
    target=obj,
    shot_type="hero",
    focal_length=85 if material_type in ["marble", "granite"] else 50,
    f_stop=2.8
)
```

For premium materials (marble, granite), an 85mm portrait lens with shallow depth of field (f/2.8) is used. For standard materials, a 50mm lens provides a natural perspective.

---

## 6. Real-Time Engine Optimization

### Performance Budgets

| Platform | Triangle Budget | Texture Memory | Draw Calls |
|----------|-----------------|----------------|------------|
| Mobile | 50K-200K | 256MB-1GB | <100 |
| Console | 5M-20M | 4GB-8GB | <2000 |
| PC High-End | 20M+ | 8GB+ | <5000 |
| VR | 1M-2M | 4GB-8GB | <1000 |

### Optimization Strategies

**Mesh Optimization**
- Use LOD (Level of Detail) chains
- Implement occlusion culling
- Batch draw calls where possible
- Minimize overdraw with depth prepass

**Texture Optimization**
- Use texture atlasing for small objects
- Implement streaming for large worlds
- Compress textures appropriately (BC7, ASTC)
- Use mipmaps for distance filtering

**Shader Optimization**
- Minimize instruction count
- Use half-precision where acceptable
- Branch carefully in GPU code
- Profile with GPU debugging tools

### Lighting in Real-Time

- **Baked Lighting**: Static geometry, highest quality
- **Mixed Lighting**: Baked indirect, real-time direct
- **Fully Real-Time**: Dynamic shadows, highest cost

**Light Optimization**
- Limit real-time light count (4-8 typical)
- Use light cookies for complex shapes
- Implement reflection probes for specular
- Bake ambient occlusion offline

---

## 7. Post-Processing Techniques ✓ IMPLEMENTED

### Color Grading Pipeline ✓ IMPLEMENTED

Located in **[`ColorGradingPipeline` class](stone_slab_cad/utils/post_processing.py:137)**:

**Color Grading Modes** - [`ColorGradingMode` enum](stone_slab_cad/utils/post_processing.py:16):
| Mode | Description | Implementation |
|------|-------------|----------------|
| PRIMARY_ONLY | Basic corrections only | ✅ [`ColorGradingMode.PRIMARY_ONLY`](stone_slab_cad/utils/post_processing.py:17) |
| FULL_PIPELINE | Complete grading workflow | ✅ [`ColorGradingMode.FULL_PIPELINE`](stone_slab_cad/utils/post_processing.py:18) |
| LOOK_DEVELOPMENT | LUTs and film emulation | ✅ [`ColorGradingMode.LOOK_DEVELOPMENT`](stone_slab_cad/utils/post_processing.py:19) |

**Tone Mapping Algorithms** - [`ToneMappingType` enum](stone_slab_cad/utils/post_processing.py:35):
| Algorithm | Use Case | Implementation |
|-----------|----------|----------------|
| Reinhard | HDR compression | ✅ [`ToneMappingType.REINHARD`](stone_slab_cad/utils/post_processing.py:37) |
| Filmic | Cinematic look | ✅ [`ToneMappingType.FILMIC`](stone_slab_cad/utils/post_processing.py:38) |
| ACES | Industry standard | ✅ [`ToneMappingType.ACES`](stone_slab_cad/utils/post_processing.py:39) |
| AgX | Modern HDR | ✅ [`ToneMappingType.AGX`](stone_slab_cad/utils/post_processing.py:40) |

**Primary Correction** ✅
| Adjustment | Configuration | Implementation |
|------------|---------------|----------------|
| White Balance | [`WhiteBalanceConfig`](stone_slab_cad/utils/post_processing.py:55) | Temperature, Tint |
| Exposure | [`ExposureConfig`](stone_slab_cad/utils/post_processing.py:62) | EV, Contrast, Highlights, Shadows |
| Saturation | [`SaturationConfig`](stone_slab_cad/utils/post_processing.py:73) | Saturation, Vibrance |

**Secondary Correction** ✅
| Adjustment | Configuration | Implementation |
|------------|---------------|----------------|
| Color Curves | [`CurvesConfig`](stone_slab_cad/utils/post_processing.py:93) | Master, RGB, Hue vs Sat |
| Color Balance | [`ColorBalanceConfig`](stone_slab_cad/utils/post_processing.py:80) | Shadows, Midtones, Highlights |

**Look Development** ✅
| Feature | Configuration | Implementation |
|---------|---------------|----------------|
| LUT Application | [`LUTType` enum](stone_slab_cad/utils/post_processing.py:24) | Film emulation presets |
| Split Toning | [`SplitToningConfig`](stone_slab_cad/utils/post_processing.py:113) | Shadows/Highlights colors |
| Film Grain | [`FilmGrainConfig`](stone_slab_cad/utils/post_processing.py:122) | Intensity, Size, Roughness |

**Color Grading Presets** via [`get_preset()`](stone_slab_cad/utils/post_processing.py:256):
```python
from utils.post_processing import ColorGradingPipeline, ColorGradingConfig

pipeline = ColorGradingPipeline(ColorGradingConfig())
config = pipeline.get_preset('cinematic_warm')  # or 'cinematic_cool', 'high_contrast', 'vintage', 'product_showcase'
```

### Common Post-Processing Effects ✓ IMPLEMENTED

Located in **[`PostEffectProcessor` class](stone_slab_cad/utils/post_processing.py:316)**:

| Effect | Configuration | Best Practice | Implementation |
|--------|---------------|---------------|----------------|
| Bloom | [`BloomConfig`](stone_slab_cad/utils/post_processing.py:129) | Subtle (intensity 0.1) | ✅ [`_setup_bloom()`](stone_slab_cad/utils/post_processing.py:369) |
| SSAO | [`SSAOConfig`](stone_slab_cad/utils/post_processing.py:135) | Low blend (0.3) | ✅ [`_setup_ssao()`](stone_slab_cad/utils/post_processing.py:383) |
| Motion Blur | [`MotionBlurConfig`](stone_slab_cad/utils/post_processing.py:144) | Match shutter | ✅ [`_setup_motion_blur()`](stone_slab_cad/utils/post_processing.py:396) |
| Chromatic Aberration | [`ChromaticAberrationConfig`](stone_slab_cad/utils/post_processing.py:150) | Minimal (0.01) | ✅ [`_setup_chromatic_aberration()`](stone_slab_cad/utils/post_processing.py:407) |
| Vignette | [`VignetteConfig`](stone_slab_cad/utils/post_processing.py:155) | Subtle gradient | ✅ [`_setup_vignette()`](stone_slab_cad/utils/post_processing.py:418) |
| Sharpen | [`SharpenConfig`](stone_slab_cad/utils/post_processing.py:163) | Moderate (0.5) | ✅ [`_setup_sharpen()`](stone_slab_cad/utils/post_processing.py:428) |

**Effect Types** - [`PostEffectType` enum](stone_slab_cad/utils/post_processing.py:44):
```python
BLOOM, SSAO, MOTION_BLUR, CHROMATIC_ABERRATION, VIGNETTE, SHARPNESS, FILM_GRAIN
```

### Compositing Workflow ✓ IMPLEMENTED

**Render Passes Structure** via Blender compositor nodes:
```
Beauty/Composite    → Final combined image (CompositorNodeComposite)
Diffuse            → Base color lighting (via render layers)
Specular           → Reflection highlights
Ambient Occlusion  → Contact shadows (SSAO node)
Z-Depth            → Distance information
Normals            → Surface orientation
Emission           → Self-illumination
```

**Layer Blending Modes** used in compositor:
- **Add**: For light effects, bloom, glow (via Glare node)
- **Multiply**: For shadows, ambient occlusion (via MixRGB)
- **Screen**: For light addition
- **Overlay**: For contrast enhancement

### Post-Processing Presets ✓

Located in **[`PostProcessingManager.get_preset()`](stone_slab_cad/utils/post_processing.py:568)**:

| Preset | Use Case | Key Features |
|--------|----------|--------------|
| `neutral` | Baseline | No adjustments |
| `cinematic` | Film look | Filmic tone mapping, vignette, CA |
| `product_photography` | Product shots | Clean, subtle contrast, sharpening |
| `archviz` | Architecture | ACES tone mapping, AO, sharpening |
| `vintage` | Retro feel | Desaturated, film grain, strong vignette |
| `minimal` | Performance | No effects, basic grading |

### Post-Render Validation ✓ IMPLEMENTED

Located in **[`PostRenderValidator` class](stone_slab_cab/utils/post_processing.py:447)**:

| Check | Description | Implementation |
|-------|-------------|----------------|
| Artifacts/Noise | Detect render artifacts | ✅ [`_check_noise()`](stone_slab_cad/utils/post_processing.py:491) |
| Color Accuracy | Verify color range | ✅ [`_analyze_color_range()`](stone_slab_cad/utils/post_processing.py:498) |
| Resolution | Confirm dimensions | ✅ Resolution comparison |
| Alpha Channel | Validate transparency | ✅ [`_check_alpha()`](stone_slab_cad/utils/post_processing.py:513) |

**Post-Render Checklist**: [`POST_RENDER_CHECKLIST`](stone_slab_cad/utils/post_processing.py:895) dictionary with validation functions.

### Convenience Functions ✓

**Quick Setup** - [`setup_post_processing()`](stone_slab_cad/utils/post_processing.py:796):
```python
from utils.post_processing import setup_post_processing

results = setup_post_processing(
    scene=bpy.context.scene,
    preset="product_photography"  # or "cinematic", "archviz", "vintage"
)
```

**Color Grading Only** - [`apply_color_grading()`](stone_slab_cad/utils/post_processing.py:818):
```python
from utils.post_processing import apply_color_grading

results = apply_color_grading(
    scene=bpy.context.scene,
    preset="cinematic_warm"
)
```

**Validate Render** - [`validate_render()`](stone_slab_cad/utils/post_processing.py:838):
```python
from utils.post_processing import validate_render

validation = validate_render(
    image=rendered_image,
    expected_resolution=(1920, 1080)
)
```

### Integration with CAD Pipeline

The post-processing system is automatically invoked in [`slab3d.py`](stone_slab_cad/slab3d.py:245) after real-time optimization:

```python
# Setup Post-Processing Techniques (Section 7)
pp_preset = config.get('post_processing_preset', 'product_photography')
pp_results = setup_post_processing(
    scene=bpy.context.scene,
    preset=pp_preset
)
```

The post-processing preset can be configured via `post_processing_preset` in the configuration (default: `product_photography` for stone slab visualization).

---

## 8. Viewport Performance Tuning ✓ IMPLEMENTED

### Display Optimization ✓ IMPLEMENTED

**Viewport Settings** - [`ViewportOptimizer` class](stone_slab_cad/utils/viewport_performance.py:75)

| Setting | Purpose | Implementation |
|---------|---------|----------------|
| Disable textures | Better viewport responsiveness | ✅ [`_disable_viewport_textures()`](stone_slab_cad/utils/viewport_performance.py:152) |
| Matcap shading | Simplified material preview | ✅ [`_enable_matcap_shading()`](stone_slab_cad/utils/viewport_performance.py:163) |
| Backface culling | Reduce overdraw | ✅ [`_enable_backface_culling()`](stone_slab_cad/utils/viewport_performance.py:177) |
| Subdivision levels | Control geometry density | ✅ [`_reduce_subdivision_levels()`](stone_slab_cad/utils/viewport_performance.py:186) |

**Viewport Display Modes** - [`ViewportDisplayMode` enum](stone_slab_cad/utils/viewport_performance.py:20):
```python
WIREFRAME, BOUNDBOX, SOLID, MATERIAL, RENDERED
```

**Matcap Presets** - [`MatcapPreset` enum](stone_slab_cad/utils/viewport_performance.py:34):
```python
CLAY, CERAMIC_WHITE, METAL, CHROME, CHECKER, PEARL, SKIN
```

**Scene Management** ✓ IMPLEMENTED - [`SceneDisplayManager` class](stone_slab_cad/utils/viewport_performance.py:234)

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Display Layers | Organize objects into groups | ✅ [`create_display_layer()`](stone_slab_cad/utils/viewport_performance.py:246) |
| Object Isolation | Focus on selected objects | ✅ [`isolate_objects()`](stone_slab_cad/utils/viewport_performance.py:278) |
| Distant Object Optimization | Hide or show as bounds | ✅ [`hide_distant_objects()`](stone_slab_cad/utils/viewport_performance.py:306) |
| Bounding Box Display | Low-overhead distant preview | ✅ `display_type = 'BOUNDS'` |

### GPU Acceleration ✓ IMPLEMENTED

**GPU Configuration** - [`GPUAccelerator` class](stone_slab_cad/utils/viewport_performance.py:355):

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Hardware Shading | GPU-accelerated viewport | ✅ [`_setup_hardware_shading()`](stone_slab_cad/utils/viewport_performance.py:387) |
| Viewport Denoising | Real-time noise reduction | ✅ [`enable_viewport_denoising()`](stone_slab_cad/utils/viewport_performance.py:419) |
| Texture Cache | Memory management | ✅ [`_configure_texture_cache()`](stone_slab_cad/utils/viewport_performance.py:403) |
| Resolution Scale | Performance scaling | ✅ [`_set_resolution_scale()`](stone_slab_cad/utils/viewport_performance.py:412) |

**Configuration Example:**
```python
from utils.viewport_performance import GPUAccelerator, ViewportConfig

config = ViewportConfig(
    enable_hardware_shading=True,
    texture_cache_size_mb=1024,
    viewport_resolution_scale=1.0
)

accelerator = GPUAccelerator(config)
results = accelerator.configure_gpu_acceleration()
```

### Profiling Tools ✓ IMPLEMENTED

**Real-Time Statistics** - [`ViewportProfiler` class](stone_slab_cad/utils/viewport_performance.py:441):

| Metric | Description | Implementation |
|--------|-------------|----------------|
| FPS | Frames per second | ✅ [`fps`](stone_slab_cad/utils/viewport_performance.py:60) calculation |
| Frame Time | Milliseconds per frame | ✅ [`frame_time_ms`](stone_slab_cad/utils/viewport_performance.py:61) |
| Triangle Count | Scene complexity | ✅ [`_count_triangles()`](stone_slab_cad/utils/viewport_performance.py:474) |
| Memory Usage | RAM consumption | ✅ [`_get_memory_usage()`](stone_slab_cad/utils/viewport_performance.py:492) |
| Texture Memory | VRAM usage | ✅ [`_get_texture_memory()`](stone_slab_cad/utils/viewport_performance.py:499) |

**Performance Budget Management** - [`PerformanceBudgetManager` class](stone_slab_cad/utils/viewport_performance.py:556):

```python
from utils.viewport_performance import PerformanceBudgetManager

# Set performance budgets
budget = PerformanceBudgetManager(
    max_triangles=1000000,
    max_memory_mb=2048,
    target_fps=30
)

# Check against budgets
status = budget.check_budget()
if not status['within_budget']:
    print("Alerts:", status['alerts'])
    
# Get optimization suggestions
suggestions = budget.get_optimization_suggestions()
```

**Software-Specific Profiling Tools Reference:**

| Software | Tool | Purpose | Reference |
|----------|------|---------|-----------|
| Blender | Statistics Overlay | Scene metrics | ✅ [`PROFILING_TOOLS_REFERENCE`](stone_slab_cad/utils/viewport_performance.py:948) |
| Maya | HUD | Performance data | ✅ Documented |
| 3ds Max | Viewport Statistics | Object counts | ✅ Documented |
| Unreal Engine | Stat commands | Real-time metrics | ✅ Documented |
| Unity | Profiler | Performance analysis | ✅ Documented |

**Convenience Functions:**

```python
from utils.viewport_performance import (
    setup_performance_viewport,
    optimize_for_sculpting,
    optimize_for_layout,
    optimize_for_texturing
)

# Quick performance setup
results = setup_performance_viewport()

# Preset configurations
sculpting_setup = optimize_for_sculpting()      # Matcap, backface culling
layout_setup = optimize_for_layout()            # Wireframe, hide distant
texturing_setup = optimize_for_texturing()      # Material preview
```

**Viewport Configuration:**

[`ViewportConfig` dataclass](stone_slab_cad/utils/viewport_performance.py:47) provides comprehensive control:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `display_mode` | SOLID | Viewport display mode |
| `disable_textures` | False | Disable textures for performance |
| `use_matcap` | True | Use material capture shading |
| `enable_backface_culling` | True | Cull back faces |
| `subdivision_preview_levels` | 1 | Subsurf preview quality |
| `texture_cache_size_mb` | 512 | GPU texture cache |
| `hide_distant_objects` | True | Optimize distant geometry |
| `distant_object_distance` | 50.0 | Distance threshold |

---

## 9. Workflow Efficiency

### Asset Organization

**File Naming Conventions**
```
[Project]_[AssetType]_[AssetName]_[Version]_[Variation]
Example: ARCH_House_Exterior_v02_Daytime
```

**Folder Structure**
```
Project/
├── 01_Reference/
├── 02_Concepts/
├── 03_Models/
│   ├── HighPoly/
│   ├── LowPoly/
│   └── Rigged/
├── 04_Textures/
│   ├── Source/
│   └── Export/
├── 05_Materials/
├── 06_Lighting/
├── 07_Cameras/
├── 08_Renders/
│   ├── Preview/
│   └── Final/
├── 09_Compositing/
└── 10_Output/
```

### Automation and Scripting

**Repetitive Task Automation**
- Batch export scripts
- Automated UV packing
- Material assignment tools
- Render queue management

**Template Workflows**
- Lighting rigs for common scenarios
- Material libraries for consistent surfaces
- Camera setups for standard shots
- Render preset configurations

### Collaboration Best Practices

- [ ] Use version control (Git, Perforce)
- [ ] Maintain clear documentation
- [ ] Share material libraries
- [ ] Establish render farm protocols
- [ ] Use asset management systems
- [ ] Create style guides for consistency
- [ ] Implement review and approval workflows

### Quality Assurance Checklist

**Pre-Render**
- [ ] Verify all textures are linked
- [ ] Check geometry for errors
- [ ] Validate lighting setup
- [ ] Confirm camera framing
- [ ] Review material assignments

**Post-Render**
- [ ] Check for artifacts and noise
- [ ] Verify color accuracy
- [ ] Confirm resolution requirements
- [ ] Validate alpha channels
- [ ] Review compositing integration

---

## 3D Asset Optimization Protocol Implementation

The stone slab CAD pipeline now includes a comprehensive 3D Asset Optimization Protocol that automatically executes the following operations during model generation:

### Protocol Overview

Located in [`stone_slab_cad/utils/mesh_optimizer.py`](stone_slab_cad/utils/mesh_optimizer.py)

#### 1. Geometry Cleanup (`GeometryOptimizer`)

**Vertex Merging**
- Merges overlapping vertices within 0.1mm tolerance
- Establishes clean manifold topology
- Eliminates duplicate geometry using bmesh weld operations

**Internal Face Removal**
- Removes hidden faces that don't contribute to visible silhouette
- Analyzes face visibility through ray casting
- Eliminates internal geometry that doesn't affect rendering

**Orphaned Geometry Cleanup**
- Purges unused faces with zero area or degenerate geometry
- Removes orphaned edges with less than 2 linked faces
- Deletes superfluous vertices with no face connections

#### 2. Normal Orientation (`_audit_and_correct_normals`)

**Normal Auditing**
- Recalculates face normals using bmesh operations
- Detects inverted faces facing toward mesh centroid
- Automatically corrects inverted normal orientations

**Uniform Facing Direction**
- Ensures consistent normal direction across all polygons
- Prevents lighting calculation disruptions
- Validates normal consistency for PBR rendering

#### 3. Smoothing Groups (`SmoothingGroupManager`)

**Surface Continuity Analysis**
- Classifies surfaces as: Planar, Curved, Transition, or Sharp
- Analyzes angles between adjacent face normals
- Determines edge hardness based on surface type

**Edge Hardness Assignment**
- Sharp edges (>90°): Marked as hard edges for crisp shading
- Curved transitions: Smooth shading for organic appearance
- Planar surfaces: Consistent smooth shading
- Configurable angle threshold (30° default, material-specific)

#### 4. Naming Conventions (`MeshHierarchyBuilder`)

**Hierarchical Naming Format**
```
[AssetType]_[AssetName]_[Component]_[Version]
Example: SLB_KITCHEN_ISLAND_GEO_v01
```

**Asset Categories**
- `SLB` - Slab/Stone products
- `CNT` - Countertop assemblies
- `TILE` - Tile components
- `TRIM` - Trim and edging
- `ACC` - Accessories
- `HDW` - Hardware

#### 5. Mesh Hierarchy Construction

**Collection Structure**
```
SLB_[Name]_MAIN_v01
├── SLB_[Name]_GEO_v01      (Geometry collection)
├── SLB_[Name]_COL_v01      (Collision meshes)
├── SLB_[Name]_LOD_v01      (Level of detail variants)
└── SLB_[Name]_HLP_v01      (Helper objects)
```

**Pivot Point Management**
- Centers pivot to geometry bounds for proper placement
- Maintains world position while adjusting local origin
- Facilitates accurate assembly and animation workflows

### Material-Specific Optimization Settings

| Material Type | Smooth Angle | Notes |
|---------------|--------------|-------|
| Natural Stone (Marble/Granite) | 45° | Allows for organic surface variation |
| Engineered Stone (Quartz) | 20° | Tighter edge definition |
| Default | 30° | Standard stone finish |

### Integration with CAD Pipeline

The optimization protocol is automatically invoked in [`slab3d.py`](stone_slab_cad/slab3d.py:172) during the 3D model generation process:

```python
# Execute Comprehensive 3D Asset Optimization Protocol
material_type = config.get('material', {}).get('type', 'stone')
optimization_results = optimize_slab_geometry(obj, material_type)
```

### Usage Example

```python
from utils.mesh_optimizer import (
    AssetOptimizationPipeline,
    OptimizationConfig,
    optimize_slab_geometry
)

# Quick optimization with material-specific settings
results = optimize_slab_geometry(slab_object, material_type="marble")

# Custom optimization pipeline
config = OptimizationConfig(
    asset_prefix="CNT",
    merge_distance=0.00005,  # 0.05mm precision
    smooth_angle_threshold=0.436332  # 25 degrees
)
pipeline = AssetOptimizationPipeline("CustomCountertop", config)
results = pipeline.execute_full_optimization(slab_object)
```

---

## Quick Reference: Photorealistic Checklist

### Geometry
- [ ] Accurate proportions and scale
- [ ] Appropriate edge wear and imperfections
- [ ] Realistic surface irregularities
- [ ] Consistent detail level

### Materials
- [ ] Physically accurate properties
- [ ] Appropriate roughness variation
- [ ] Subtle imperfections and fingerprints
- [ ] Correct index of refraction

### Lighting
- [ ] Plausible light sources
- [ ] Consistent color temperature
- [ ] Appropriate shadow softness
- [ ] Atmospheric depth cues

### Rendering
- [ ] Sufficient sample counts
- [ ] Denoising if needed
- [ ] Proper exposure range
- [ ] Color space consistency (ACES, sRGB)

---

## Software-Specific Notes

### Blender
- Use Eevee for real-time preview, Cycles for final
- Enable adaptive sampling for efficiency
- Utilize geometry nodes for procedural workflows

### Maya
- Arnold integration for production rendering
- Viewport 2.0 for performance preview
- XGen for advanced grooming

### 3ds Max
- Corona/V-Ray for archviz workflows
- Forest Pack for scattering
- RailClone for parametric modeling

### Unreal Engine
- Nanite for unlimited geometry
- Lumen for real-time global illumination
- MetaHuman for digital humans

### Unity
- HDRP for high-fidelity rendering
- URP for cross-platform optimization
- Shader Graph for custom materials

---

## Conclusion

Achieving high-quality 3D visualization requires attention to every stage of the pipeline—from initial geometry creation through final compositing. By following these strategies and maintaining a focus on physical accuracy, efficient workflows, and artistic intent, you can produce compelling photorealistic or stylized results that meet professional standards.

Continuous learning and staying current with evolving technologies (real-time ray tracing, AI denoising, procedural workflows) will ensure your skills remain relevant in this rapidly advancing field.

---

*Document Version: 1.0*  
*Last Updated: 2026-02-28*  
*Recommended Review Cycle: Quarterly*
