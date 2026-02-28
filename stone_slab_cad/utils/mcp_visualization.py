"""
MCP (Manufacturing Control Protocol) Visualization and CAD Modeling Toolset

This module provides photorealistic 3D rendered simulations demonstrating:
- Edge treatment application (C8 chamfer, round, ogee, etc.)
- Dynamic cross-sectional analysis views
- Material removal geometry visualization
- Brushed surface texture mapping
- Drip edge integration visualization
- Composite visualization dashboard

Compatible with Blender Python API (bpy) for high-quality rendering
"""

import bpy
import bmesh
import mathutils
from mathutils import Vector, Matrix
import math
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
import json
import os

from .edge_treatment_specs import (
    ManufacturingProcessSpec, EdgeOrientation, ProfileType,
    ProfileGeometry, ChamferSpecification, DripEdgeSpecification,
    SurfaceFinish, SurfaceTreatmentSpec
)


class RenderMode(Enum):
    """Available rendering modes"""
    PHOTOREALISTIC = "photorealistic"
    WIREFRAME = "wireframe"
    SOLID = "solid"
    MATERIAL = "material"
    SECTION_VIEW = "section_view"
    XRAY = "xray"


class CrossSectionPlane(Enum):
    """Cross-section analysis planes"""
    XY = "xy"
    XZ = "xz"
    YZ = "yz"
    CUSTOM = "custom"


@dataclass
class CameraSetup:
    """Camera configuration for renders"""
    location: Tuple[float, float, float] = (2.0, -2.0, 1.5)
    rotation_euler: Tuple[float, float, float] = (1.1, 0, 0.785)
    focal_length: float = 50.0
    sensor_width: float = 36.0
    depth_of_field_enabled: bool = True
    focus_distance: float = 1.5
    aperture_fstop: float = 5.6


@dataclass
class LightingSetup:
    """Lighting configuration for studio rendering"""
    key_light_energy: float = 1000.0
    fill_light_energy: float = 500.0
    rim_light_energy: float = 750.0
    hdri_enabled: bool = True
    hdri_path: Optional[str] = None
    background_color: Tuple[float, float, float] = (0.9, 0.9, 0.9)


@dataclass
class RenderSettings:
    """Rendering quality settings"""
    resolution_x: int = 1920
    resolution_y: int = 1080
    resolution_percentage: int = 100
    samples: int = 128
    denoising_enabled: bool = True
    engine: str = "CYCLES"
    device: str = "GPU"


@dataclass
class CrossSectionConfig:
    """Configuration for cross-sectional analysis view"""
    plane: CrossSectionPlane = CrossSectionPlane.YZ
    position_ratio: float = 0.5
    show_dimensions: bool = True
    highlight_chamfer: bool = True
    chamfer_color: Tuple[float, float, float] = (1.0, 0.2, 0.2)
    material_color: Tuple[float, float, float] = (0.8, 0.8, 0.85)
    annotation_enabled: bool = True


@dataclass
class ToolpathVisualizationConfig:
    """Configuration for CNC toolpath animation"""
    tool_diameter_mm: float = 20.0
    tool_color: Tuple[float, float, float] = (0.8, 0.1, 0.1)
    cut_color: Tuple[float, float, float] = (1.0, 0.5, 0.0)
    feed_rate_mmin: float = 2.0
    spindle_speed_rpm: int = 12000
    show_chip_formation: bool = True
    show_coolant: bool = True
    animation_duration_frames: int = 250


class MCPVisualizationEngine:
    """Main MCP visualization engine for edge treatment and surface finishing"""
    
    def __init__(self):
        self.spec: Optional[ManufacturingProcessSpec] = None
        self.slab_object: Optional[bpy.types.Object] = None
        self.section_object: Optional[bpy.types.Object] = None
        self.tool_object: Optional[bpy.types.Object] = None
        self.render_collection: Optional[bpy.types.Collection] = None
        
    def initialize_scene(self, spec: ManufacturingProcessSpec):
        """Initialize the visualization scene with manufacturing specification"""
        self.spec = spec
        
        # Clear existing scene
        bpy.ops.object.select_all(action='SELECT')
        bpy.ops.object.delete(use_global=False)
        
        # Create collection for this visualization
        if "MCP_Visualization" not in bpy.data.collections:
            self.render_collection = bpy.data.collections.new("MCP_Visualization")
            bpy.context.scene.collection.children.link(self.render_collection)
        else:
            self.render_collection = bpy.data.collections["MCP_Visualization"]
        
        # Set up basic scene units
        bpy.context.scene.unit_settings.system = 'METRIC'
        bpy.context.scene.unit_settings.scale_length = 1.0
        bpy.context.scene.unit_settings.length_unit = 'MILLIMETERS'
        
        print(f"MCP Visualization Engine initialized for spec: {spec.specification_id}")
    
    def create_base_slab_geometry(self,
                                   length_mm: float = 1000.0,
                                   width_mm: float = 600.0,
                                   height_mm: float = 30.0) -> bpy.types.Object:
        """Create the base slab geometry"""
        
        # Convert to meters for Blender
        l = length_mm / 1000.0
        w = width_mm / 1000.0
        h = height_mm / 1000.0
        
        # Create mesh
        mesh = bpy.data.meshes.new(name="Slab_Base")
        obj = bpy.data.objects.new(name="Slab", object_data=mesh)
        
        # Link to collection
        self.render_collection.objects.link(obj)
        
        # Create bmesh for geometry construction
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1.0)
        
        # Scale to dimensions
        bmesh.ops.scale(bm, verts=bm.verts, vec=(l, h, w))
        
        # Write to mesh
        bm.to_mesh(mesh)
        bm.free()
        
        # Update mesh
        mesh.update()
        
        self.slab_object = obj
        print(f"Created base slab: {length_mm:.0f}x{width_mm:.0f}x{height_mm:.0f}mm")
        
        return obj
    
    def apply_edge_profile_geometry(self, 
                                     profile: ProfileGeometry,
                                     orientation: EdgeOrientation):
        """Apply edge profile geometry to the slab"""
        if not self.slab_object:
            raise ValueError("Base slab must be created first")
        
        # Enter edit mode
        bpy.context.view_layer.objects.active = self.slab_object
        bpy.ops.object.mode_set(mode='EDIT')
        
        # Create bmesh
        bm = bmesh.from_mesh(self.slab_object.data)
        bm.edges.ensure_lookup_table()
        
        # Find edges to bevel based on orientation
        edges_to_bevel = self._get_edges_for_orientation(bm, orientation)
        
        if edges_to_bevel:
            # Calculate bevel offset from profile
            if profile.radius_mm:
                offset = profile.radius_mm / 1000.0
            elif profile.depth_mm:
                offset = profile.depth_mm / 1000.0
            else:
                offset = 0.008
            
            # Apply bevel
            try:
                bmesh.ops.bevel(
                    bm,
                    geom=edges_to_bevel,
                    offset=offset,
                    segments=profile.segments_count,
                    profile=profile.profile_factor,
                    affect='EDGES'
                )
                print(f"Applied {profile.profile_type.value} to {orientation.value} edge")
            except Exception as e:
                print(f"Bevel operation failed: {e}")
        
        # Update mesh
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(self.slab_object.data)
        bm.free()
        
        bpy.ops.object.mode_set(mode='OBJECT')
    
    def _get_edges_for_orientation(self, 
                                    bm: bmesh.types.BMesh,
                                    orientation: EdgeOrientation) -> List[bmesh.types.BMEdge]:
        """Get the edges corresponding to a specific orientation"""
        edges = []
        
        # Get bounding box
        min_coord = Vector((float('inf'), float('inf'), float('inf')))
        max_coord = Vector((float('-inf'), float('-inf'), float('-inf')))
        
        for vert in bm.verts:
            min_coord.x = min(min_coord.x, vert.co.x)
            min_coord.y = min(min_coord.y, vert.co.y)
            min_coord.z = min(min_coord.z, vert.co.z)
            max_coord.x = max(max_coord.x, vert.co.x)
            max_coord.y = max(max_coord.y, vert.co.y)
            max_coord.z = max(max_coord.z, vert.co.z)
        
        # Tolerance for edge detection
        tol = 0.001
        
        for edge in bm.edges:
            v1, v2 = edge.verts
            mid = (v1.co + v2.co) / 2
            
            # Check orientation
            is_edge = False
            
            if orientation == EdgeOrientation.ANTERIOR:
                is_edge = abs(mid.z - max_coord.z) < tol
            elif orientation == EdgeOrientation.POSTERIOR:
                is_edge = abs(mid.z - min_coord.z) < tol
            elif orientation == EdgeOrientation.PORT:
                is_edge = abs(mid.x - min_coord.x) < tol
            elif orientation == EdgeOrientation.STARBOARD:
                is_edge = abs(mid.x - max_coord.x) < tol
            
            if is_edge:
                edges.append(edge)
        
        return edges
    
    def apply_brushed_surface_texture(self):
        """Apply brushed surface texture material"""
        if not self.slab_object:
            return
        
        # Create material
        mat = bpy.data.materials.new(name="Brushed_Surface")
        mat.use_nodes = True
        
        # Get principled BSDF
        bsdf = mat.node_tree.nodes.get('Principled BSDF')
        
        if bsdf:
            # Set base color (stone-like gray)
            bsdf.inputs['Base Color'].default_value = (0.75, 0.73, 0.71, 1.0)
            bsdf.inputs['Roughness'].default_value = 0.6
            bsdf.inputs['Metallic'].default_value = 0.05
            bsdf.inputs['Clearcoat'].default_value = 0.1
            bsdf.inputs['Clearcoat Roughness'].default_value = 0.4
        
        # Add noise texture for brushed effect
        noise = mat.node_tree.nodes.new('ShaderNodeTexNoise')
        noise.inputs['Scale'].default_value = 50.0
        noise.inputs['Detail'].default_value = 15.0
        noise.inputs['Roughness'].default_value = 0.5
        
        # Add texture coordinate for directionality
        tex_coord = mat.node_tree.nodes.new('ShaderNodeTexCoord')
        
        # Mapping for brush direction (lengthwise)
        mapping = mat.node_tree.nodes.new('ShaderNodeMapping')
        mapping.inputs['Scale'].default_value = (1.0, 100.0, 1.0)
        
        # Link nodes
        mat.node_tree.links.new(tex_coord.outputs['Generated'], mapping.inputs['Vector'])
        mat.node_tree.links.new(mapping.outputs['Vector'], noise.inputs['Vector'])
        mat.node_tree.links.new(noise.outputs['Fac'], bsdf.inputs['Roughness'])
        
        # Assign material to object
        if self.slab_object.data.materials:
            self.slab_object.data.materials[0] = mat
        else:
            self.slab_object.data.materials.append(mat)
        
        print("Applied brushed surface texture")
    
    def create_cross_section_view(self, 
                                   config: CrossSectionConfig) -> bpy.types.Object:
        """Create a cross-sectional analysis view"""
        if not self.slab_object:
            raise ValueError("Base slab must be created first")
        
        # Duplicate the slab for section view
        section_mesh = self.slab_object.data.copy()
        section_obj = bpy.data.objects.new("Section_View", section_mesh)
        self.render_collection.objects.link(section_obj)
        
        # Create boolean cutter
        bpy.ops.mesh.primitive_cube_add(size=2.0)
        cutter = bpy.context.active_object
        cutter.name = "Section_Cutter"
        
        # Position cutter based on cross-section plane
        if config.plane == CrossSectionPlane.YZ:
            x_min = min(v.co.x for v in self.slab_object.data.vertices)
            x_max = max(v.co.x for v in self.slab_object.data.vertices)
            cut_x = x_min + (x_max - x_min) * config.position_ratio
            
            cutter.location = (cut_x + 1.0, 0, 0)
            cutter.scale = (1.0, 2.0, 2.0)
        
        # Apply boolean modifier
        bool_mod = section_obj.modifiers.new(name="Section_Cut", type='BOOLEAN')
        bool_mod.operation = 'DIFFERENCE'
        bool_mod.object = cutter
        
        # Apply modifier
        bpy.context.view_layer.objects.active = section_obj
        bpy.ops.object.modifier_apply(modifier="Section_Cut")
        
        # Remove cutter
        bpy.data.objects.remove(cutter, do_unlink=True)
        
        # Apply section material
        if config.highlight_chamfer:
            self._apply_section_material(section_obj, config)
        
        self.section_object = section_obj
        print(f"Created {config.plane.value} cross-section view")
        
        return section_obj
    
    def _apply_section_material(self, 
                                 obj: bpy.types.Object,
                                 config: CrossSectionConfig):
        """Apply material highlighting to section view"""
        mat = bpy.data.materials.new(name="Section_Material")
        mat.use_nodes = True
        
        bsdf = mat.node_tree.nodes.get('Principled BSDF')
        if bsdf:
            bsdf.inputs['Base Color'].default_value = (*config.material_color, 1.0)
            bsdf.inputs['Roughness'].default_value = 0.8
        
        # Assign to object
        if obj.data.materials:
            obj.data.materials[0] = mat
        else:
            obj.data.materials.append(mat)
    
    def create_cnc_toolpath_visualization(self,
                                          orientation: EdgeOrientation,
                                          config: ToolpathVisualizationConfig) -> bpy.types.Object:
        """Create animated CNC toolpath visualization"""
        # Create tool representation
        bpy.ops.mesh.primitive_cylinder_add(
            radius=config.tool_diameter_mm / 2000.0,
            depth=0.1,
            location=(0, 0, 0)
        )
        tool = bpy.context.active_object
        tool.name = f"CNC_Tool_{orientation.value}"
        
        # Create material for tool
        tool_mat = bpy.data.materials.new(name="Tool_Material")
        tool_mat.use_nodes = True
        bsdf = tool_mat.node_tree.nodes.get('Principled BSDF')
        if bsdf:
            bsdf.inputs['Base Color'].default_value = (*config.tool_color, 1.0)
            bsdf.inputs['Metallic'].default_value = 1.0
            bsdf.inputs['Roughness'].default_value = 0.2
        
        tool.data.materials.append(tool_mat)
        
        # Animate tool movement along edge
        if self.slab_object:
            x_min = min(v.co.x for v in self.slab_object.data.vertices)
            x_max = max(v.co.x for v in self.slab_object.data.vertices)
            z_min = min(v.co.z for v in self.slab_object.data.vertices)
            z_max = max(v.co.z for v in self.slab_object.data.vertices)
            y_level = max(v.co.y for v in self.slab_object.data.vertices)
            
            # Set up keyframes based on orientation
            if orientation in [EdgeOrientation.ANTERIOR, EdgeOrientation.POSTERIOR]:
                z_pos = z_max if orientation == EdgeOrientation.ANTERIOR else z_min
                
                tool.location = (x_min, y_level + 0.02, z_pos)
                tool.keyframe_insert(data_path="location", frame=1)
                
                tool.location = (x_max, y_level + 0.02, z_pos)
                tool.keyframe_insert(data_path="location", frame=config.animation_duration_frames)
            else:
                x_pos = x_min if orientation == EdgeOrientation.PORT else x_max
                
                tool.location = (x_pos, y_level + 0.02, z_min)
        
        tool.data.materials.append(tool_mat)
        
        # Animate tool movement along edge
        if self.slab_object:
            # Get edge bounds
            x_min = min(v.co.x for v in self.slab_object.data.vertices)
            x_max = max(v.co.x for v in self.slab_object.data.vertices)
            z_min = min(v.co.z for v in self.slab_object.data.vertices)
            z_max = max(v.co.z for v in self.slab_object.data.vertices)
            y_level = max(v.co.y for v in self.slab_object.data.vertices)
            
            # Set up keyframes based on orientation
            if orientation in [EdgeOrientation.ANTERIOR, EdgeOrientation.POSTERIOR]:
                # Move along X axis
                z_pos = z_max if orientation == EdgeOrientation.ANTERIOR else z_min
                
                tool.location = (x_min, y_level + 0.02, z_pos)
                tool.keyframe_insert(data_path="location", frame=1)
                
                tool.location = (x_max, y_level + 0.02, z_pos)
                tool.keyframe_insert(data_path="location", frame=config.animation_duration_frames)
            else:
                # Move along Z axis
                x_pos = x_min if orientation == EdgeOrientation.PORT else x_max
                
                tool.location = (x_pos, y_level + 0.02, z_min)
                tool.keyframe_insert(data_path="location", frame=1)
                
                tool.location = (x_pos, y_level + 0.02, z_max)
                tool.keyframe_insert(data_path="location", frame=config.animation_duration_frames)
        
        self.tool_object = tool
        print(f"✓ Created CNC toolpath animation for {orientation.value} edge")
        
        return tool
    
    def setup_studio_lighting(self, config: LightingSetup):
        """Set up professional studio lighting for rendering"""
        
        # Key light
        bpy.ops.object.light_add(type='AREA', location=(2, -3, 2))
        key_light = bpy.context.active_object
        key_light.name = "Key_Light"
        key_light.data.energy = config.key_light_energy
        key_light.data.size = 2.0
        key_light.rotation_euler = (1.2, 0, 0.5)
        
        # Fill light
        bpy.ops.object.light_add(type='AREA', location=(-2, -2, 1.5))
        fill_light = bpy.context.active_object
        fill_light.name = "Fill_Light"
        fill_light.data.energy = config.fill_light_energy
        fill_light.data.size = 1.5
        fill_light.rotation_euler = (1.0, 0, -0.5)
        
        # Rim light
        bpy.ops.object.light_add(type='SPOT', location=(0, 3, 1))
        rim_light = bpy.context.active_object
        rim_light.name = "Rim_Light"
        rim_light.data.energy = config.rim_light_energy
        rim_light.data.spot_size = 1.0
        rim_light.rotation_euler = (2.5, 0, 3.14)
        
        # Set background
        world = bpy.data.worlds['World']
        world.use_nodes = True
        bg = world.node_tree.nodes['Background']
        bg.inputs['Color'].default_value = (*config.background_color, 1.0)
        bg.inputs['Strength'].default_value = 1.0
        
        print("✓ Studio lighting configured")
    
    def setup_camera(self, config: CameraSetup):
        """Set up camera for rendering"""
        
        # Create camera
        bpy.ops.object.camera_add(location=config.location)
        camera = bpy.context.active_object
        camera.name = "MCP_Render_Camera"
        camera.rotation_euler = config.rotation_euler
        
        # Configure camera settings
        camera.data.lens = config.focal_length
        camera.data.sensor_width = config.sensor_width
        camera.data.dof.use_dof = config.depth_of_field_enabled
        camera.data.dof.focus_distance = config.focus_distance
        camera.data.dof.aperture_fstop = config.aperture_fstop
        
        # Set as active camera
        bpy.context.scene.camera = camera
        
        print("✓ Camera configured")
    
    def configure_render_settings(self, config: RenderSettings):
        """Configure rendering engine and quality settings"""
        
        scene = bpy.context.scene
        
        # Set engine
        scene.render.engine = config.engine
        
        if config.engine == "CYCLES":
            # Cycles-specific settings
            scene.cycles.device = config.device
            scene.cycles.samples = config.samples
            scene.cycles.use_denoising = config.denoising_enabled
        
        # Resolution
        scene.render.resolution_x = config.resolution_x
        scene.render.resolution_y = config.resolution_y
        scene.render.resolution_percentage = config.resolution_percentage
        
        # Output format
        scene.render.image_settings.file_format = 'PNG'
        scene.render.image_settings.color_mode = 'RGBA'
        scene.render.image_settings.color_depth = '16'
        
        print(f"✓ Render settings configured: {config.resolution_x}×{config.resolution_y}, {config.samples} samples")
    
    def render_image(self, 
                     output_path: str,
                     render_mode: RenderMode = RenderMode.PHOTOREALISTIC):
        """Render the visualization to file"""
        
        # Set output path
        bpy.context.scene.render.filepath = output_path
        
        # Render
        bpy.ops.render.render(write_still=True)
        
        print(f"✓ Render saved to: {output_path}")
    
    def generate_composite_dashboard(self,
                                      output_dir: str,
                                      views: List[str] = None):
        """
        Generate composite visualization dashboard with multiple views
        
        Creates renders from multiple angles plus cross-sections
        """
        if views is None:
            views = [
                "isometric",
                "front",
                "top",
                "section_front",
                "section_side",
                "detail_chamfer"
            ]
        
        render_configs = {
            "isometric": {
                "camera_location": (1.5, -1.5, 1.0),
                "camera_rotation": (1.1, 0, 0.785),
                "filename": "dashboard_isometric.png"
            },
            "front": {
                "camera_location": (0, -2.0, 0.1),
                "camera_rotation": (1.57, 0, 0),
                "filename": "dashboard_front.png"
            },
            "top": {
                "camera_location": (0, 0, 2.0),
                "camera_rotation": (0, 0, 0),
                "filename": "dashboard_top.png"
            },
            "section_front": {
                "camera_location": (0, -1.5, 0.1),
                "camera_rotation": (1.57, 0, 0),
                "filename": "dashboard_section_front.png"
            },
            "section_side": {
                "camera_location": (1.5, 0, 0.1),
                "camera_rotation": (1.57, 0, 1.57),
                "filename": "dashboard_section_side.png"
            },
            "detail_chamfer": {
                "camera_location": (0.3, -0.3, 0.1),
                "camera_rotation": (1.3, 0, 0.5),
                "filename": "dashboard_detail_chamfer.png"
            }
        }
        
        rendered_files = []
        
        for view_name in views:
            if view_name in render_configs:
                config = render_configs[view_name]
                
                # Update camera
                camera = bpy.data.objects.get("MCP_Render_Camera")
                if camera:
                    camera.location = config["camera_location"]
                    camera.rotation_euler = config["camera_rotation"]
                
                # Render
                output_path = os.path.join(output_dir, config["filename"])
                self.render_image(output_path)
                rendered_files.append(output_path)
        
        print(f"✓ Generated {len(rendered_files)} dashboard views")
        return rendered_files


def create_standard_visualization(spec: ManufacturingProcessSpec,
                                   output_dir: str,
                                   slab_dims: Tuple[float, float, float] = (1000, 600, 30)):
    """
    Create a standard complete visualization for a manufacturing specification
    
    This is a convenience function that sets up the entire visualization pipeline
    """
    engine = MCPVisualizationEngine()
    
    # Initialize
    engine.initialize_scene(spec)
    
    # Create base geometry
    engine.create_base_slab_geometry(*slab_dims)
    
    # Apply edge profiles from spec
    for orientation, profile in spec.edge_treatments.items():
        engine.apply_edge_profile_geometry(profile, orientation)
    
    # Apply surface treatment
    if spec.surface_treatment.finish_type == SurfaceFinish.BRUSHED:
        engine.apply_brushed_surface_texture()
    
    # Set up lighting and camera
    engine.setup_studio_lighting(LightingSetup())
    engine.setup_camera(CameraSetup())
    
    # Configure render
    engine.configure_render_settings(RenderSettings())
    
    # Generate dashboard
    os.makedirs(output_dir, exist_ok=True)
    rendered_files = engine.generate_composite_dashboard(output_dir)
    
    return rendered_files


# Export all classes and functions
__all__ = [
    'RenderMode',
    'CrossSectionPlane',
    'CameraSetup',
    'LightingSetup',
    'RenderSettings',
    'CrossSectionConfig',
    'ToolpathVisualizationConfig',
    'MCPVisualizationEngine',
    'create_standard_visualization'
]
