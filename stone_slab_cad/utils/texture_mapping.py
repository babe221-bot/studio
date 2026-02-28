"""
Texture Mapping and UV Unwrapping System

Implements comprehensive UV unwrapping strategies, texture resolution management,
and PBR material texture workflows for stone slab visualization.
"""
import bpy
import bmesh
import mathutils
from typing import Dict, List, Tuple, Optional, Any, Set
from dataclasses import dataclass
from enum import Enum
from pathlib import Path


class TextureType(Enum):
    """PBR texture map types for material definition"""
    ALBEDO = "albedo"
    DIFFUSE = "diffuse"
    NORMAL = "normal"
    ROUGHNESS = "roughness"
    METALLIC = "metallic"
    AMBIENT_OCCLUSION = "ao"
    HEIGHT = "height"
    DISPLACEMENT = "displacement"
    EMISSIVE = "emissive"
    SUBSURFACE = "subsurface"
    OPACITY = "opacity"


class AssetResolution(Enum):
    """Standard texture resolutions based on asset type"""
    HERO_PROP = 8192  # 8K for close-up viewing
    ENVIRONMENT_PROP = 4096  # 4K for mid-distance
    BACKGROUND_ELEMENT = 2048  # 2K for distant objects
    TRIM_SHEET = 4096  # 4K for reusable texture sets
    DECAL = 2048  # 2K for overlay details
    THUMBNAIL = 1024  # 1K for preview


class UnwrapMethod(Enum):
    """UV unwrapping strategies"""
    SMART_PROJECT = "smart_project"
    CUBE_PROJECTION = "cube"
    CYLINDRICAL = "cylindrical"
    SPHERICAL = "spherical"
    CAMERA = "camera"
    LIGHTMAP = "lightmap"


@dataclass
class UVUnwrapConfig:
    """Configuration for UV unwrapping operations"""
    method: UnwrapMethod = UnwrapMethod.SMART_PROJECT
    angle_limit: float = 0.785398  # 45 degrees in radians
    island_margin: float = 0.02
    area_weight: bool = True
    correct_aspect: bool = True
    scale_to_bounds: bool = False
    seam_angle_threshold: float = 0.523599  # 30 degrees


@dataclass
class TextureConfig:
    """Configuration for texture generation and mapping"""
    resolution: int = 4096
    texel_density: float = 10.24  # pixels per unit (mm)
    use_udim: bool = False
    padding: int = 4  # pixels between UV islands
    trim_sheet_coords: Optional[Tuple[float, float, float, float]] = None
    tiling: Tuple[int, int] = (1, 1)
    offset: Tuple[float, float] = (0.0, 0.0)


@dataclass
class PBRMaterialConfig:
    """PBR material configuration with all texture maps"""
    albedo_path: Optional[str] = None
    normal_path: Optional[str] = None
    roughness_path: Optional[str] = None
    metallic_path: Optional[str] = None
    ao_path: Optional[str] = None
    height_path: Optional[str] = None
    emissive_path: Optional[str] = None
    
    # Material properties
    roughness_value: float = 0.5
    metallic_value: float = 0.0
    normal_strength: float = 1.0
    displacement_scale: float = 0.01
    ao_strength: float = 1.0


class UVUnwrapper:
    """
    UV Unwrapping Strategies with seam placement optimization
    and layout packing for optimal space utilization.
    """
    
    def __init__(self, config: UVUnwrapConfig):
        self.config = config
        self.stats = {
            'islands_created': 0,
            'seams_added': 0,
            'pack_efficiency': 0.0
        }
    
    def unwrap_mesh(self, obj: bpy.types.Object) -> Dict[str, Any]:
        """
        Execute UV unwrapping with optimal seam placement and layout.
        """
        if obj.type != 'MESH':
            return self.stats
        
        # Ensure mesh has UV layer
        if not obj.data.uv_layers:
            obj.data.uv_layers.new(name="UVMap")
        
        # Set active UV layer
        obj.data.uv_layers.active = obj.data.uv_layers[0]
        
        # Enter edit mode for UV operations
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.mode_set(mode='EDIT')
        
        # Select all faces
        bpy.ops.mesh.select_all(action='SELECT')
        
        try:
            # Apply seam strategy based on method
            if self.config.method == UnwrapMethod.SMART_PROJECT:
                self._apply_smart_project(obj)
            elif self.config.method == UnwrapMethod.CUBE_PROJECTION:
                self._apply_cube_projection(obj)
            else:
                self._apply_standard_unwrap(obj)
            
            # Optimize UV layout
            self._optimize_uv_layout(obj)
            
        finally:
            bpy.ops.object.mode_set(mode='OBJECT')
        
        return self.stats
    
    def _apply_smart_project(self, obj: bpy.types.Object) -> None:
        """
        Smart projection unwrap with angle-based seam placement.
        Hides seams in natural breaks or less visible areas.
        """
        bpy.ops.uv.smart_project(
            angle_limit=self.config.angle_limit,
            island_margin=self.config.island_margin,
            area_weight=self.config.area_weight,
            correct_aspect=self.config.correct_aspect,
            scale_to_bounds=self.config.scale_to_bounds
        )
        
        self.stats['islands_created'] = len(obj.data.uv_layers.active.data)
        print(f"✅ Smart projection unwrap: {self.stats['islands_created']} islands created")
    
    def _apply_cube_projection(self, obj: bpy.types.Object) -> None:
        """
        Cube projection for box-like geometry (ideal for stone slabs).
        """
        bpy.ops.uv.cube_project(
            cube_size=1.0,
            correct_aspect=self.config.correct_aspect
        )
        
        self.stats['islands_created'] = 6  # Cube has 6 faces
        print("✅ Cube projection unwrap applied")
    
    def _apply_standard_unwrap(self, obj: bpy.types.Object) -> None:
        """Standard unwrap with calculated seams"""
        # Mark seams based on angle threshold
        bm = bmesh.from_edit_mesh(obj.data)
        bm.edges.ensure_lookup_table()
        
        seams_added = 0
        for edge in bm.edges:
            if len(edge.link_faces) == 2:
                angle = edge.calc_face_angle()
                if angle and angle > self.config.seam_angle_threshold:
                    edge.seam = True
                    seams_added += 1
        
        bmesh.update_edit_mesh(obj.data)
        self.stats['seams_added'] = seams_added
        
        # Unwrap
        bpy.ops.uv.unwrap(
            method='ANGLE_BASED',
            margin=self.config.island_margin
        )
        
        print(f"✅ Standard unwrap: {seams_added} seams added")
    
    def _optimize_uv_layout(self, obj: bpy.types.Object) -> None:
        """
        UV packing for optimal space utilization.
        Minimize stretching through proper island distribution.
        """
        # Pack islands with margin
        bpy.ops.uv.pack_islands(
            margin=self.config.island_margin,
            rotate=True,
            pin=False
        )
        
        # Calculate packing efficiency (approximate)
        bm = bmesh.from_edit_mesh(obj.data)
        uv_layer = bm.loops.layers.uv.active
        
        if uv_layer:
            total_uv_area = 0.0
            for face in bm.faces:
                uv_coords = [loop[uv_layer].uv for loop in face.loops]
                if len(uv_coords) >= 3:
                    # Calculate UV face area using shoelace formula
                    area = self._calculate_uv_face_area(uv_coords)
                    total_uv_area += area
            
            # Efficiency = used area / total UV space (1.0 x 1.0)
            self.stats['pack_efficiency'] = min(total_uv_area * 100, 100.0)
            print(f"📦 UV packing efficiency: {self.stats['pack_efficiency']:.1f}%")
    
    def _calculate_uv_face_area(self, uv_coords: List[mathutils.Vector]) -> float:
        """Calculate area of UV face using shoelace formula"""
        n = len(uv_coords)
        area = 0.0
        for i in range(n):
            j = (i + 1) % n
            area += uv_coords[i].x * uv_coords[j].y
            area -= uv_coords[j].x * uv_coords[i].y
        return abs(area) / 2.0
    
    def ensure_consistent_texel_density(self, obj: bpy.types.Object, 
                                        target_density: float = 10.24) -> None:
        """
        Maintain consistent texel density across the model.
        """
        if obj.type != 'MESH':
            return
        
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        
        try:
            # Scale UVs to match target texel density
            bm = bmesh.from_edit_mesh(obj.data)
            uv_layer = bm.loops.layers.uv.active
            
            if uv_layer:
                # Calculate current average texel density
                total_3d_area = 0.0
                total_uv_area = 0.0
                
                for face in bm.faces:
                    face_3d_area = face.calc_area()
                    uv_coords = [loop[uv_layer].uv for loop in face.loops]
                    face_uv_area = self._calculate_uv_face_area(uv_coords)
                    
                    total_3d_area += face_3d_area
                    total_uv_area += face_uv_area
                
                if total_3d_area > 0 and total_uv_area > 0:
                    current_density = total_uv_area / total_3d_area
                    scale_factor = target_density / current_density
                    
                    # Scale all UV coordinates
                    for face in bm.faces:
                        for loop in face.loops:
                            loop[uv_layer].uv *= scale_factor
                    
                    bmesh.update_edit_mesh(obj.data)
                    print(f"📐 Texel density adjusted: {current_density:.2f} → {target_density:.2f}")
        
        finally:
            bpy.ops.object.mode_set(mode='OBJECT')


class TextureManager:
    """
    Texture resolution management and PBR material texture workflows.
    """
    
    def __init__(self, config: TextureConfig):
        self.config = config
    
    def setup_pbr_material(self, obj: bpy.types.Object, 
                          pbr_config: PBRMaterialConfig,
                          material_name: str = "StonePBR") -> bpy.types.Material:
        """
        Create PBR material with all texture maps.
        Metal/Roughness workflow implementation.
        """
        # Create new material
        mat = bpy.data.materials.new(name=material_name)
        mat.use_nodes = True
        
        # Clear default nodes
        nodes = mat.node_tree.nodes
        links = mat.node_tree.links
        nodes.clear()
        
        # Create principled BSDF
        principled = nodes.new('ShaderNodeBsdfPrincipled')
        principled.location = (0, 0)
        
        # Set base properties
        principled.inputs['Roughness'].default_value = pbr_config.roughness_value
        principled.inputs['Metallic'].default_value = pbr_config.metallic_value
        
        # Output node
        output = nodes.new('ShaderNodeOutputMaterial')
        output.location = (300, 0)
        links.new(principled.outputs['BSDF'], output.inputs['Surface'])
        
        # Add texture nodes
        coord_node = nodes.new('ShaderNodeTexCoord')
        coord_node.location = (-800, 0)
        
        mapping_node = nodes.new('ShaderNodeMapping')
        mapping_node.location = (-600, 0)
        mapping_node.inputs['Scale'].default_value = (
            self.config.tiling[0], 
            self.config.tiling[1], 
            1.0
        )
        mapping_node.inputs['Location'].default_value = (
            self.config.offset[0],
            self.config.offset[1],
            0.0
        )
        links.new(coord_node.outputs['UV'], mapping_node.inputs['Vector'])
        
        # Albedo/Diffuse
        if pbr_config.albedo_path:
            self._add_texture_node(
                nodes, links, mapping_node, principled,
                pbr_config.albedo_path, 'Base Color',
                'ShaderNodeTexImage', (-400, 300)
            )
        
        # Roughness
        if pbr_config.roughness_path:
            self._add_texture_node(
                nodes, links, mapping_node, principled,
                pbr_config.roughness_path, 'Roughness',
                'ShaderNodeTexImage', (-400, 0),
                color_space='Non-Color'
            )
        else:
            principled.inputs['Roughness'].default_value = pbr_config.roughness_value
        
        # Metallic
        if pbr_config.metallic_path:
            self._add_texture_node(
                nodes, links, mapping_node, principled,
                pbr_config.metallic_path, 'Metallic',
                'ShaderNodeTexImage', (-400, -150),
                color_space='Non-Color'
            )
        
        # Normal map
        if pbr_config.normal_path:
            normal_tex = self._add_texture_node(
                nodes, links, mapping_node, None,
                pbr_config.normal_path, '',
