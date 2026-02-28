"""
3D Stone Slab Geometry Generation using Blender
With Comprehensive 3D Asset Optimization Protocol
And Texture Mapping & UV Unwrapping System
And Real-Time Engine Optimization
And Post-Processing Techniques
And Viewport Performance Tuning
"""
import bpy
import bmesh
import mathutils
import json
from typing import Dict, Any
from utils.materials import create_material
from utils.profiles import get_profile_settings
from utils.mesh_optimizer import optimize_slab_geometry, MeshHierarchyBuilder, OptimizationConfig
from utils.texture_mapping import (
    unwrap_slab_for_stone, create_stone_pbr_material,
    UVUnwrapper, UVUnwrapConfig, UnwrapMethod
)
from utils.lighting_system import (
    setup_studio_lighting, LightingRig, LightingStyle,
    ThreePointLighting, HDRILighting, GlobalIlluminationSetup
)
from utils.camera_system import (
    setup_product_camera, CameraController, CameraSettings,
    DOFSettings, CinematicComposition, ProductCameraSetup
)
from utils.realtime_engine import (
    setup_realtime_optimization, configure_lighting_mode,
    profile_scene_performance, PlatformType,
    PERFORMANCE_BUDGETS, RealtimeEngineOptimizer
)
from utils.post_processing import (
    setup_post_processing, apply_color_grading,
    validate_render, PostProcessingConfig,
    ColorGradingConfig, POST_RENDER_CHECKLIST
)
from utils.viewport_performance import (
    setup_performance_viewport, create_profiling_overlay,
    ViewportOptimizer, SceneDisplayManager,
    GPUAccelerator, PerformanceBudgetManager,
    ViewportConfig, optimize_for_texturing
)

def clear_scene():
    """Clear all objects from the current scene"""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

def create_base_slab(length: float, width: float, height: float) -> bmesh.types.BMesh:
    """Create base slab geometry"""
    bm = bmesh.new()
    
    # Create unit cube and scale to dimensions
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=bm.verts, vec=(length, height, width))
    
    # Ensure face indices are updated
    bm.faces.ensure_lookup_table()
    bm.edges.ensure_lookup_table()
    bm.verts.ensure_lookup_table()
    
    return bm

def apply_edge_profiles(bm: bmesh.types.BMesh, profile: Dict[Any, Any], 
                       processed_edges: Dict[str, bool], 
                       length: float, width: float) -> None:
    """Apply edge profiles (chamfer, fillet, etc.) to specified edges"""
    
    profile_settings = get_profile_settings(profile)
    if not profile_settings['radius']:
        return
    
    # Map edge names to vertex pairs (for a box)
    edge_mapping = {
        'front': [(0, 1), (2, 3)],  # Front face edges
        'back':  [(4, 5), (6, 7)],  # Back face edges  
        'left':  [(0, 4), (2, 6)],  # Left face edges
        'right': [(1, 5), (3, 7)]   # Right face edges
    }
    
    edges_to_bevel = []
    
    for edge_name, enabled in processed_edges.items():
        if enabled and edge_name in edge_mapping:
            vertex_pairs = edge_mapping[edge_name]
            for v1_idx, v2_idx in vertex_pairs:
                # Find edge between these vertices
                edge = None
                for e in bm.edges:
                    verts = [v.index for v in e.verts]
                    if (v1_idx in verts and v2_idx in verts):
                        edge = e
                        break
                
                if edge:
                    edges_to_bevel.append(edge)
    
    if edges_to_bevel:
        bmesh.ops.bevel(
            bm,
            geom=edges_to_bevel,
            offset=profile_settings['radius'] / 1000,  # Convert mm to meters
            segments=profile_settings['segments'],
            profile=profile_settings['profile_factor']
        )

def create_okapnik_grooves(bm: bmesh.types.BMesh, okapnik_edges: Dict[str, bool],
                          length: float, width: float, height: float) -> None:
    """Create okapnik (drip) grooves on specified edges"""
    
    groove_width = 0.008   # 8mm
    groove_depth = 0.005   # 5mm  
    offset = 0.02          # 20mm from edge
    
    def create_groove_cutter(groove_length: float, vertical: bool) -> bmesh.types.BMesh:
        """Create a groove cutting tool"""
        cutter = bmesh.new()
        bmesh.ops.create_cube(cutter, size=1.0)
        
        if vertical:
            scale_vec = (groove_width, groove_depth, groove_length)
        else:
            scale_vec = (groove_length, groove_depth, groove_width)
            
        bmesh.ops.scale(cutter, verts=cutter.verts, vec=scale_vec)
        return cutter
    
    def apply_boolean_difference(target_bm: bmesh.types.BMesh, cutter_bm: bmesh.types.BMesh,
                                location: mathutils.Vector) -> None:
        """Apply boolean difference operation"""
        # Move cutter to position
        for vert in cutter_bm.verts:
            vert.co += location
        
        # Perform boolean difference
        try:
            bmesh.ops.intersect_boolean(
                target_bm,
                geom=target_bm.faces[:] + target_bm.edges[:] + target_bm.verts[:],
                geom_other=cutter_bm.faces[:] + cutter_bm.edges[:] + cutter_bm.verts[:],
                operation='DIFFERENCE'
            )
        except:
            print("⚠   Boolean operation failed, skipping groove")
        
        cutter_bm.free()
    
    # Apply grooves based on configuration
    groove_positions = {
        'front': (mathutils.Vector((0, -height/2 - groove_depth/2, width/2 - offset)), False),
        'back':  (mathutils.Vector((0, -height/2 - groove_depth/2, -width/2 + offset)), False),
        'left':  (mathutils.Vector((-length/2 + offset, -height/2 - groove_depth/2, 0)), True),
        'right': (mathutils.Vector((length/2 - offset, -height/2 - groove_depth/2, 0)), True)
    }
    
    for edge_name, enabled in okapnik_edges.items():
        if enabled and edge_name in groove_positions:
            location, is_vertical = groove_positions[edge_name]
            groove_length = width if is_vertical else length
            
            cutter = create_groove_cutter(groove_length, is_vertical)
            apply_boolean_difference(bm, cutter, location)

def generate_3d_model(config: Dict[Any, Any], output_path: str) -> None:
    """Main function to generate 3D slab model"""
    
    # Clear existing scene
    clear_scene()
    
    # Extract dimensions (convert mm to meters)
    dims = config['dims']
    length = dims['length'] / 1000
    width = dims['width'] / 1000  
    height = dims['height'] / 1000
    
    print(f"🔬 Creating slab: {length:.3f}m × {width:.3f}m × {height:.3f}m")
    
    # Create base geometry
    bm = create_base_slab(length, width, height)
    
    # Apply edge profiles
    apply_edge_profiles(bm, config['profile'], config['processedEdges'], length, width)
    
    # Create okapnik grooves
    create_okapnik_grooves(bm, config['okapnikEdges'], length, width, height)
    
    # Convert bmesh to Blender mesh
    mesh = bpy.data.meshes.new("SlabMesh")
    bm.to_mesh(mesh)
    bm.free()
    
    # Create object and add to scene
    obj = bpy.data.objects.new("Slab", mesh)
    bpy.context.collection.objects.link(obj)
    
    # Apply material
    material = create_material(config['material'], config['finish'])
    obj.data.materials.append(material)
    
    # Select the object for export
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    
    # Execute Comprehensive 3D Asset Optimization Protocol
    print("\n🔧 Executing 3D Asset Optimization Protocol...")
    material_type = config.get('material', {}).get('type', 'stone')
    optimization_results = optimize_slab_geometry(obj, material_type)
    print(f"✅ Optimization complete: {optimization_results['new_name']}")
    
    # Execute UV Unwrapping and Texture Mapping
    print("\n🎨 Executing UV Unwrapping & Texture Mapping...")
    uv_results = unwrap_slab_for_stone(obj, material_type)
    print(f"✅ UV unwrap complete: {uv_results['islands_created']} islands, {uv_results['pack_efficiency']:.1f}% efficiency")
    
    # Setup Advanced Lighting and Global Illumination
    print("\n💡 Setting up Advanced Lighting System...")
    lighting_results = setup_studio_lighting(
        target=obj,
        style="product" if material_type in ["marble", "granite"] else "studio",
        resolution=(1920, 1080)
    )
    print(f"✅ Lighting setup: {lighting_results['style']}")
    print(f"   Lights: {', '.join(lighting_results['lights_created'])}")
    print(f"   GI Method: {lighting_results['render_settings']['gi_method']}")
    
    # Setup Camera Composition and Depth of Field
    print("\n📷 Setting up Camera System...")
    camera = setup_product_camera(
        target=obj,
        shot_type="hero",
        focal_length=85 if material_type in ["marble", "granite"] else 50,
        f_stop=2.8
    )
    print(f"✅ Camera configured: {camera.name}")
    print(f"   Shot Type: Hero")
    print(f"   Focal Length: 85mm" if material_type in ["marble", "granite"] else "   Focal Length: 50mm")
    print(f"   F-Stop: f/2.8")
    
    # Setup Real-Time Engine Optimization (Section 6)
    print("\n⚡ Setting up Real-Time Engine Optimization...")
    platform = config.get('platform', 'pc_high_end')
    rt_results = setup_realtime_optimization(
        scene=bpy.context.scene,
        target=obj,
        platform=platform
    )
    print(f"✅ Real-time optimization complete")
    print(f"   Platform: {rt_results['platform']}")
    print(f"   Triangle Budget: {rt_results['budget']['triangle_budget']:,}")
    print(f"   Within Budget: {rt_results.get('within_budget', 'N/A')}")
    
    # Setup Post-Processing Techniques (Section 7)
    print("\n🎬 Setting up Post-Processing Techniques...")
    pp_preset = config.get('post_processing_preset', 'product_photography')
    pp_results = setup_post_processing(
        scene=bpy.context.scene,
        preset=pp_preset
    )
    print(f"✅ Post-processing setup complete")
    print(f"   Preset: {pp_preset}")
    print(f"   Effects: {', '.join(pp_results['post_effects']['effects_applied'])}")
    print(f"   Color Grading: {pp_results['color_grading']['mode']}")
    
    # Export to GLB
    print(f"📦 Exporting to: {output_path}")
    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format='GLB',
        use_selection=True,
        export_apply=True,
        export_materials='PBR'
    )
    
    print("✅ 3D model generation completed")
