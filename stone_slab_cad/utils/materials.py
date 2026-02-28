"""
Material definitions for 3D rendering
Uses PBR (Physically Based Rendering) system
"""
import bpy
from typing import Dict, Any
from .pbr_materials import (
    create_stone_material, get_material_preset,
    PBRMaterialBuilder, MaterialProperties, PBRWorkflow
)

def create_material(material_info: Dict[str, Any], finish_info: Dict[str, Any]) -> bpy.types.Material:
    """
    Create a new PBR Blender material from configuration.
    Uses the Metal/Roughness workflow with physical material properties.
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
        return create_stone_material(
            stone_type=preset_name,
            finish=finish,
            workflow="metal_roughness"
        )
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

# Export PBR utilities for external use
__all__ = [
    'create_material',
    'create_stone_material',
    'get_material_preset',
    'PBRMaterialBuilder',
    'MaterialProperties',
    'PBRWorkflow'
]
