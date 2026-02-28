"""
Material definitions for 3D rendering
Uses PBR (Physically Based Rendering) system with Surface Imperfections
"""
import bpy
from typing import Dict, Any, Optional
from .pbr_materials import (
    create_stone_material, get_material_preset,
    PBRMaterialBuilder, MaterialProperties, PBRWorkflow
)
from .surface_imperfections import (
    SurfaceImperfectionManager, SurfaceImperfectionConfig,
    WearPattern, apply_photorealistic_imperfections
)

def create_material(material_info: Dict[str, Any], finish_info: Dict[str, Any],
                   apply_imperfections: bool = True,
                   imperfection_preset: str = "realistic") -> bpy.types.Material:
    """
    Create a new PBR Blender material from configuration.
    Uses the Metal/Roughness workflow with physical material properties.
    Optionally applies photorealistic surface imperfections.
    
    Args:
        material_info: Dictionary with material details (name, type, color)
        finish_info: Dictionary with finish details (name, roughness)
        apply_imperfections: Whether to add surface imperfections
        imperfection_preset: Imperfection preset ("clean", "realistic", "weathered", "kitchen")
    """
    
    material_name = f"{material_info['name']}_{finish_info['name']}"
    material_type = material_info.get('type', 'stone')
    
    # Map material types to presets
    preset_mapping = {
        'marble': 'marble_carrara',
        'granite': 'granite_polished',
        'quartz': 'quartz_premium',
        'soapstone': 'soapstone',
        'travertine': 'travertine',
        'slate': 'slate'
    }
    
    preset_name = preset_mapping.get(material_type, 'marble_carrara')
    finish = finish_info.get('name', 'polished').lower()
    
    # Use new PBR system
    try:
        material = create_stone_material(
            stone_type=preset_name,
            finish=finish,
            workflow="metal_roughness"
        )
        
        # Apply surface imperfections if requested
        if apply_imperfections and material:
            # Get the active object that uses this material
            obj = None
            for obj in bpy.data.objects:
                if material.name in [mat.name for mat in obj.data.materials if mat]:
                    break
            
            if obj:
                apply_photorealistic_imperfections(material, obj, imperfection_preset)
            else:
                print(f"⚠️  No object found using material {material.name}, skipping imperfections")
        
        return material
    except Exception as e:
        print(f"⚠️  PBR material creation failed, using fallback: {e}")
        return _create_fallback_material(material_name, material_info, finish_info)

def _create_fallback_material(material_name: str, 
                              material_info: Dict[str, Any], 
                              finish_info: Dict[str, Any]) -> bpy.types.Material:
    """Fallback basic material creation"""
    
    # Check if material already exists
    if material_name in bpy.data.materials:
        return bpy.data.materials[material_name]
        
    # Create new material
    mat = bpy.data.materials.new(name=material_name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    
    # Set material properties
    if bsdf:
        # Set base color
        color_hex = material_info.get('color', '#FFFFFF')
        r = int(color_hex[1:3], 16) / 255.0
        g = int(color_hex[3:5], 16) / 255.0
        b = int(color_hex[5:7], 16) / 255.0
        bsdf.inputs['Base Color'].default_value = (r, g, b, 1.0)
        
        # Set roughness based on finish
        bsdf.inputs['Roughness'].default_value = finish_info.get('roughness', 0.5)
        
        # Set metallic to 0 for stone
        bsdf.inputs['Metallic'].default_value = 0.0
        
    return mat

def add_surface_imperfections(material: bpy.types.Material,
                              obj: bpy.types.Object,
                              preset: str = "realistic") -> None:
    """
    Add photorealistic surface imperfections to an existing material.
    
    Args:
        material: The material to enhance
        obj: The object using the material
        preset: Imperfection preset ("clean", "realistic", "weathered", "kitchen")
    """
    apply_photorealistic_imperfections(material, obj, preset)


# Export PBR utilities for external use
__all__ = [
    'create_material',
    'create_stone_material',
    'get_material_preset',
    'PBRMaterialBuilder',
    'MaterialProperties',
    'PBRWorkflow',
    'add_surface_imperfections',
    'SurfaceImperfectionManager',
    'SurfaceImperfectionConfig',
    'WearPattern'
]
