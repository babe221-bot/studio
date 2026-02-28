"""
Technical Manufacturing Drawings Generator

This module generates detailed technical manufacturing drawings including:
- Exploded isometric views
- Orthographic projections (top, front, side views)
- Detail callouts highlighting edge geometry transitions
- Chamfer-to-face surface intersection details
- Drip edge integration points
- GD&T annotations
- Dimension lines and tolerances
"""

import bpy
import bmesh
import mathutils
from mathutils import Vector
import math
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
import json

from .edge_treatment_specs import (
    ManufacturingProcessSpec, EdgeOrientation, ProfileType,
    ProfileGeometry, ChamferSpecification
)


class DrawingViewType(Enum):
    """Types of technical drawing views"""
    ISOMETRIC = "isometric"
    TOP = "top"
    FRONT = "front"
    RIGHT_SIDE = "right_side"
    LEFT_SIDE = "left_side"
    REAR = "rear"
    BOTTOM = "bottom"
    DETAIL = "detail"
    SECTION_AA = "section_aa"
    SECTION_BB = "section_bb"


class AnnotationType(Enum):
    """Types of drawing annotations"""
    DIMENSION = "dimension"
    TOLERANCE = "tolerance"
    GDnT = "gdt"
    CALLOUT = "callout"
    NOTE = "note"
    SURFACE_FINISH = "surface_finish"
    CHAMFER_SYMBOL = "chamfer_symbol"


@dataclass
class DrawingSheetConfig:
    """Configuration for drawing sheet"""
    sheet_size: str = "A3"  # A0, A1, A2, A3, A4
    orientation: str = "landscape"  # landscape or portrait
    scale: str = "1:2"
    title: str = "Stone Slab Manufacturing Drawing"
    drawing_number: str = "DRW-001"
    revision: str = "A"
    material: str = "Granite"
    finish: str = "Brushed"


@dataclass
class DimensionLine:
    """Dimension line specification"""
    start_point: Tuple[float, float, float]
    end_point: Tuple[float, float, float]
    value_mm: float
    tolerance_mm: Optional[float] = None
    text_above: Optional[str] = None
    text_below: Optional[str] = None


@dataclass
class DetailCallout:
    """Detail callout specification"""
    target_position: Tuple[float, float, float]
    detail_view_position: Tuple[float, float]
    detail_scale: str = "2:1"
    callout_circle_radius: float = 10.0
    label: str = "A"
    description: str = ""


class TechnicalDrawingGenerator:
    """
    Generator for technical manufacturing drawings
    """
    
    def __init__(self):
        self.spec: Optional[ManufacturingProcessSpec] = None
        self.drawing_collection: Optional[bpy.types.Collection] = None
        self.annotation_objects: List[bpy.types.Object] = []
        self.dimension_objects: List[bpy.types.Object] = []
        
    def initialize_drawing(self, spec: ManufacturingProcessSpec):
        """Initialize the drawing environment"""
        self.spec = spec
        
        # Create drawing collection
        if "Technical_Drawings" not in bpy.data.collections:
            self.drawing_collection = bpy.data.collections.new("Technical_Drawings")
            bpy.context.scene.collection.children.link(self.drawing_collection)
        else:
            self.drawing_collection = bpy.data.collections["Technical_Drawings"]
        
        print(f"Technical Drawing Generator initialized for: {spec.specification_id}")
    
    def create_orthographic_projection(self,
                                        view_type: DrawingViewType,
                                        slab_dims: Tuple[float, float, float] = (1000, 600, 30),
                                        position: Tuple[float, float, float] = (0, 0, 0)) -> bpy.types.Object:
        """
        Create orthographic projection view of the slab
        """
        length_mm, width_mm, height_mm = slab_dims
        
        # Convert to meters for Blender
        l = length_mm / 1000.0
        w = width_mm / 1000.0
        h = height_mm / 1000.0
        
        # Create base mesh
        mesh = bpy.data.meshes.new(name=f"View_{view_type.value}")
        obj = bpy.data.objects.new(f"View_{view_type.value}", mesh)
        self.drawing_collection.objects.link(obj)
        
        # Create bmesh
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1.0)
        bmesh.ops.scale(bm, verts=bm.verts, vec=(l, h, w))
        
        # Position based on view type
        x, y, z = position
        
        if view_type == DrawingViewType.TOP:
            # Top view - looking down from +Y
            obj.location = (x, y, z + h/2 + 0.001)
            obj.rotation_euler = (0, 0, 0)
        elif view_type == DrawingViewType.FRONT:
            # Front view - looking from -Z
            obj.location = (x, y - w/2 - 0.001, z)
            obj.rotation_euler = (math.radians(90), 0, 0)
        elif view_type == DrawingViewType.RIGHT_SIDE:
            # Right side view - looking from +X
            obj.location = (x + l/2 + 0.001, y, z)
            obj.rotation_euler = (math.radians(90), 0, math.radians(90))
        elif view_type == DrawingViewType.ISOMETRIC:
            # Isometric view
            obj.location = (x, y, z)
            obj.rotation_euler = (math.radians(35.264), 0, math.radians(45))
        
        # Write mesh
        bm.to_mesh(mesh)
        bm.free()
        
        # Apply wireframe material
        self._apply_wireframe_material(obj)
        
        return obj
    
    def _apply_wireframe_material(self, obj: bpy.types.Object):
        """Apply wireframe drawing material"""
        mat = bpy.data.materials.new(name=f"Wireframe_{obj.name}")
        mat.use_nodes = True
        
        # Set up emission shader for crisp lines
        bsdf = mat.node_tree.nodes.get('Principled BSDF')
        if bsdf:
            bsdf.inputs['Base Color'].default_value = (0, 0, 0, 1)
            bsdf.inputs['Metallic'].default_value = 0.0
            bsdf.inputs['Roughness'].default_value = 1.0
        
        # Enable wireframe display
        obj.display_type = 'WIRE'
        
        if obj.data.materials:
            obj.data.materials[0] = mat
        else:
            obj.data.materials.append(mat)
    
    def create_dimension_line(self, 
                               dimension: DimensionLine,
                               offset: float = 0.05) -> bpy.types.Object:
        """
        Create a dimension line with extension lines and arrows
        """
        # Create curve for dimension line
        curve = bpy.data.curves.new(f"Dim_{dimension.value_mm:.1f}", 'CURVE')
        curve.dimensions = '3D'
        
        # Main dimension line
        spline = curve.splines.new('POLY')
        
        start = Vector(dimension.start_point)
        end = Vector(dimension.end_point)
        direction = (end - start).normalized()
        perpendicular = Vector((-direction.y, direction.x, 0))
        
        # Extension line offset
        ext_start = start + perpendicular * offset
        ext_end = end + perpendicular * offset
        
        spline.points.add(1)
        spline.points[0].co = (*ext_start, 1)
        spline.points[1].co = (*ext_end, 1)
        
        # Create object
        obj = bpy.data.objects.new(f"Dimension_{dimension.value_mm:.1f}", curve)
        self.drawing_collection.objects.link(obj)
        
        self.dimension_objects.append(obj)
        
        return obj
    
    def create_chamfer_symbol(self,
                               position: Tuple[float, float, float],
                               chamfer_spec: ChamferSpecification) -> bpy.types.Object:
        """
        Create chamfer symbol annotation
        Standard chamfer symbol with 45° line and dimension
        """
        # Create curve for chamfer symbol
        curve = bpy.data.curves.new("Chamfer_Symbol", 'CURVE')
        curve.dimensions = '2D'
        
        # Create the chamfer symbol (45° line)
        spline = curve.splines.new('POLY')
        spline.points.add(1)
        
        # Draw 45° line
        line_length = 0.02  # 20mm in meters
        x, y, z = position
        
        spline.points[0].co = (x, y, 1)
        spline.points[1].co = (x + line_length, y + line_length, 1)
        
        # Create object
        obj = bpy.data.objects.new("Chamfer_Symbol", curve)
        self.drawing_collection.objects.link(obj)
        
        # Add text annotation
        text_curve = bpy.data.curves.new("Chamfer_Text", 'FONT')
        text_curve.body = f"C{chamfer_spec.depth_mm:.0f}"
        text_curve.size = 0.005
        
        text_obj = bpy.data.objects.new("Chamfer_Text", text_curve)
        text_obj.location = (x + line_length + 0.01, y + line_length, z)
        self.drawing_collection.objects.link(text_obj)
        
        return obj
    
    def create_detail_callout(self,
                               callout: DetailCallout,
                               view_type: DrawingViewType) -> bpy.types.Object:
        """
        Create a detail callout circle with leader line
        """
        # Create circle
        bpy.ops.mesh.primitive_circle_add(
            radius=callout.callout_circle_radius / 1000.0,
            location=callout.target_position
        )
        circle = bpy.context.active_object
        circle.name = f"Callout_{callout.label}"
        
        # Create leader line
        curve = bpy.data.curves.new(f"Leader_{callout.label}", 'CURVE')
        curve.dimensions = '2D'
        
        spline = curve.splines.new('POLY')
        spline.points.add(1)
        
        tx, ty = callout.detail_view_position
        sx, sy, sz = callout.target_position
        
        spline.points[0].co = (sx, sy, 1)
        spline.points[1].co = (tx / 1000.0, ty / 1000.0, 1)
        
        leader = bpy.data.objects.new(f"Leader_{callout.label}", curve)
        self.drawing_collection.objects.link(leader)
        
        return circle
    
    def create_section_view(self,
                            section_plane: str,
                            position_ratio: float = 0.5,
                            view_position: Tuple[float, float, float] = (2, 0, 0)) -> bpy.types.Object:
        """
        Create a section view (cross-section drawing)
        """
        # Create section line indicator
        curve = bpy.data.curves.new("Section_Line", 'CURVE')
        curve.dimensions = '2D'
        
        spline = curve.splines.new('POLY')
        spline.points.add(3)
        
        # Draw section line with arrows
        x, y, z = 0, 0, 0
        
        if section_plane == "AA":
            # Longitudinal section
            spline.points[0].co = (-0.5, 0, 1)
            spline.points[1].co = (0, 0, 1)
            spline.points[2].co = (0.5, 0, 1)
            spline.points[3].co = (0.5, 0.1, 1)
        
        section_line = bpy.data.objects.new("Section_Line", curve)
        self.drawing_collection.objects.link(section_line)
        
        # Create section view representation
        mesh = bpy.data.meshes.new("Section_View_Mesh")
        section_obj = bpy.data.objects.new(f"Section_{section_plane}", mesh)
        
        # Create cross-section geometry (simplified rectangle for now)
        bm = bmesh.new()
        
        # Define cross-section profile based on edge treatment
        if self.spec and EdgeOrientation.ANTERIOR in self.spec.edge_treatments:
            profile = self.spec.edge_treatments[EdgeOrientation.ANTERIOR]
            self._create_profiled_section(bm, profile)
        else:
            # Simple rectangular section
            bmesh.ops.create_cube(bm, size=1.0)
        
        bm.to_mesh(mesh)
        bm.free()
        
        section_obj.location = view_position
        section_obj.rotation_euler = (math.radians(90), 0, 0)
        
        self.drawing_collection.objects.link(section_obj)
        
        return section_obj
    
    def _create_profiled_section(self, 
                                  bm: bmesh.types.BMesh,
                                  profile: ProfileGeometry):
        """Create cross-section with edge profile"""
        # Base rectangle
        bmesh.ops.create_cube(bm, size=1.0)
        bm.normal_update()
        
        # Apply bevel to top edge to simulate chamfer/profile
        if profile.depth_mm:
            offset = profile.depth_mm / 1000.0
            
            # Find top edges
            top_edges = [e for e in bm.edges 
                        if all(v.co.y > 0.4 for v in e.verts)]
            
            if top_edges:
                try:
                    bmesh.ops.bevel(
                        bm,
                        geom=top_edges,
                        offset=offset,
                        segments=profile.segments_count,
                        profile=profile.profile_factor
                    )
                except:
                    pass
    
    def create_gdt_annotation(self,
                               feature_position: Tuple[float, float, float],
                               gdt_type: str,
                               tolerance_value: float,
                               datum_reference: Optional[str] = None) -> bpy.types.Object:
        """
        Create GD&T feature control frame
        """
        # Create text for GD&T symbol
        text_curve = bpy.data.curves.new(f"GDT_{gdt_type}", 'FONT')
        
        # Build feature control frame text
        lines = [
            f"|{gdt_type}|",
            f"|{tolerance_value:.2f}|",
            f"|{datum_reference or '-'}|"
        ]
        text_curve.body = "\n".join(lines)
        text_curve.size = 0.004
        
        text_obj = bpy.data.objects.new(f"GDT_{gdt_type}", text_curve)
        text_obj.location = feature_position
        self.drawing_collection.objects.link(text_obj)
        
        return text_obj
    
    def create_surface_finish_symbol(self,
                                      position: Tuple[float, float, float],
                                      roughness_ra: float = 3.2,
                                      manufacturing_method: str = "M") -> bpy.types.Object:
        """
        Create surface finish symbol (check mark symbol)
        """
        curve = bpy.data.curves.new("Surface_Finish_Symbol", 'CURVE')
        curve.dimensions = '2D'
        
        # Create check mark shape
        spline = curve.splines.new('POLY')
        spline.points.add(4)
        
        x, y, z = position
        
        # Check mark lines
        spline.points[0].co = (x, y, 1)
        spline.points[1].co = (x + 0.01, y + 0.02, 1)
        spline.points[2].co = (x + 0.02, y, 1)
        spline.points[3].co = (x + 0.02, y + 0.025, 1)
        spline.points[4].co = (x + 0.025, y + 0.025, 1)
        
        symbol = bpy.data.objects.new("Surface_Finish_Symbol", curve)
        self.drawing_collection.objects.link(symbol)
        
        # Add roughness value
        text_curve = bpy.data.curves.new("Roughness_Text", 'FONT')
        text_curve.body = f"Ra {roughness_ra}"
        text_curve.size = 0.003
        
        text_obj = bpy.data.objects.new("Roughness_Text", text_curve)
        text_obj.location = (x + 0.03, y + 0.01, z)
        self.drawing_collection.objects.link(text_obj)
        
        return symbol
    
    def generate_standard_drawing_set(self,
                                       sheet_config: DrawingSheetConfig,
                                       slab_dims: Tuple[float, float, float] = (1000, 600, 30)) -> List[bpy.types.Object]:
        """
        Generate a complete standard drawing set
        """
        objects = []
        
        # Title block position
        title_x, title_y = 0.25, -0.15
        
        # Create main views
        views = [
            (DrawingViewType.TOP, (0, 0, 0)),
            (DrawingViewType.FRONT, (0, 0, 0)),
            (DrawingViewType.RIGHT_SIDE, (0, 0, 0)),
            (DrawingViewType.ISOMETRIC, (0.3, 0.1, 0))
        ]
        
        for view_type, pos in views:
            obj = self.create_orthographic_projection(view_type, slab_dims, pos)
            objects.append(obj)
        
        # Create section view
        section = self.create_section_view("AA", 0.5, (0.4, 0, 0))
        objects.append(section)
        
        # Add dimensions for main slab
        length_dim = DimensionLine(
            start_point=(-slab_dims[0]/2000, -slab_dims[1]/2000 - 0.02, 0),
            end_point=(slab_dims[0]/2000, -slab_dims[1]/2000 - 0.02, 0),
            value_mm=slab_dims[0],
            tolerance_mm=1.0
        )
        dim_obj = self.create_dimension_line(length_dim)
        objects.append(dim_obj)
        
        # Add chamfer symbols for all edges
        if self.spec and self.spec.edge_treatments:
            for orientation in EdgeOrientation:
                if orientation in self.spec.edge_treatments:
                    profile = self.spec.edge_treatments[orientation]
                    if profile.profile_type in [ProfileType.C8_CHAMFER, ProfileType.C5_CHAMFER, ProfileType.C10_CHAMFER]:
                        # Add chamfer symbol
                        pos = self._get_chamfer_symbol_position(orientation, slab_dims)
                        chamfer_obj = self.create_chamfer_symbol(pos, self.spec.c8_chamfer)
                        objects.append(chamfer_obj)
        
        # Add surface finish symbols
        surface_pos = (-slab_dims[0]/2000 + 0.02, slab_dims[1]/2000 - 0.02, 0)
        if self.spec:
            roughness = self.spec.surface_treatment.roughness_ra
            surface_obj = self.create_surface_finish_symbol(surface_pos, roughness)
            objects.append(surface_obj)
        
        print(f"Generated standard drawing set with {len(objects)} objects")
        return objects
    
    def _get_chamfer_symbol_position(self,
                                      orientation: EdgeOrientation,
                                      slab_dims: Tuple[float, float, float]) -> Tuple[float, float, float]:
        """Get position for chamfer symbol based on edge orientation"""
        l, w, h = slab_dims[0]/1000, slab_dims[1]/1000, slab_dims[2]/1000
        
        positions = {
            EdgeOrientation.ANTERIOR: (l/4, w/2, h/2),
            EdgeOrientation.POSTERIOR: (l/4, -w/2, h/2),
            EdgeOrientation.PORT: (-l/2, w/4, h/2),
            EdgeOrientation.STARBOARD: (l/2, w/4, h/2)
        }
        
        return positions.get(orientation, (0, 0, h/2))
    
    def export_to_dxf(self, output_path: str):
        # Export drawing to DXF format for CAD software
        # Placeholder - requires additional DXF export library
        print(f"DXF export not yet implemented. Would export to: {output_path}")
        
    def export_to_pdf(self, output_path: str):
        # Export drawing to PDF format
        # Placeholder - requires rendering and PDF generation
        print(f"PDF export not yet implemented. Would export to: {output_path}")


def create_manufacturing_drawing(spec: ManufacturingProcessSpec,
                                  output_path: str,
                                  slab_dims: Tuple[float, float, float] = (1000, 600, 30)):
    """
    Convenience function to create a complete manufacturing drawing
    """
    generator = TechnicalDrawingGenerator()
    generator.initialize_drawing(spec)
    
    config = DrawingSheetConfig(
        title=f"Manufacturing Drawing - {spec.specification_id}",
        material="Granite",
        finish=spec.surface_treatment.finish_type.value
    )
    
    objects = generator.generate_standard_drawing_set(config, slab_dims)
    
    return objects


__all__ = [
    'DrawingViewType',
    'AnnotationType',
    'DrawingSheetConfig',
    'DimensionLine',
    'DetailCallout',
    'TechnicalDrawingGenerator',
    'create_manufacturing_drawing'
]
