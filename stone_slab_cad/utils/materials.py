"""
Material definitions for 3D rendering
"""
import bpy
from typing import Dict, Any

def create_material(material_info: Dict[str, Any], finish_info: Dict[str, Any]) -> bpy.types.Material:
    """Create a new Blender material from configuration"""
    
    material_name = f"{material_info['name']}_{finish_info['name']}"
    
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
