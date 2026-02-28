"""
Physically Based Rendering (PBR) Materials System

Implements Metal/Roughness and Specular/Glossiness workflows,
material properties reference database, subsurface scattering,
and advanced material techniques for professional stone visualization.
"""
import bpy
import mathutils
from typing import Dict, List, Tuple, Optional, Any, Union
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
import math
import noise


class PBRWorkflow(Enum):
    """PBR workflow types"""
    METAL_ROUGHNESS = "metal_roughness"
    SPECULAR_GLOSSINESS = "specular_glossiness"


class MaterialType(Enum):
    """Material categories"""
    STONE_NATURAL = "stone_natural"  # Marble, granite
    STONE_ENGINEERED = "stone_engineered"  # Quartz, sintered
    METAL_RAW = "metal_raw"
    METAL_PAINTED = "metal_painted"
    PLASTIC = "plastic"
    CONCRETE = "concrete"
    GLASS = "glass"
    CERAMIC = "ceramic"
    WOOD = "wood"


@dataclass
class MaterialProperties:
    """Physical material properties for PBR"""
    name: str
    material_type: MaterialType
    
    # Metal/Roughness workflow
    base_color: Tuple[float, float, float] = (0.8, 0.8, 0.8)
    metallic: float = 0.0
    roughness: float = 0.5
    
    # Specular/Glossiness workflow (alternative)
    specular_color: Tuple[float, float, float] = (0.04, 0.04, 0.04)
    glossiness: float = 0.5
    
    # Common properties
    ior: float = 1.45  # Index of refraction
    transmission: float = 0.0
    emission: Tuple[float, float, float] = (0.0, 0.0, 0.0)
    emission_strength: float = 0.0
    alpha: float = 1.0
    
    # Normal and displacement
    normal_strength: float = 1.0
    displacement_scale: float = 0.0
    
    # Subsurface scattering
    subsurface_radius: Tuple[float, float, float] = (1.0, 0.5, 0.25)
    subsurface_scale: float = 0.0
    subsurface_color: Tuple[float, float, float] = (0.8, 0.8, 0.8)
    
    # Clear coat (for polished surfaces)
    clearcoat: float = 0.0
    clearcoat_roughness: float = 0.03
    
    # Sheen (for velvet-like surfaces)
    sheen: float = 0.0
    sheen_tint: float = 0.5
    
    # Anisotropic (for brushed metals)
    anisotropic: float = 0.0
    anisotropic_rotation: float = 0.0
    
    # Texture paths
    textures: Dict[str, Optional[str]] = field(default_factory=dict)
    
    def __post_init__(self):
        """Initialize default texture paths"""
        default_textures = {
            'albedo': None,
            'normal': None,
            'roughness': None,
            'metallic': None,
            'specular': None,
            'glossiness': None,
            'ao': None,
            'height': None,
            'emissive': None,
            'subsurface': None,
            'opacity': None
        }
        self.textures = {**default_textures, **self.textures}


# Material Properties Reference Database
MATERIAL_DATABASE: Dict[str, MaterialProperties] = {
    # Stone Materials
    'marble_carrara': MaterialProperties(
        name="Carrara Marble",
        material_type=MaterialType.STONE_NATURAL,
        base_color=(0.95, 0.95, 0.93),
        metallic=0.0,
        roughness=0.15,
        ior=1.486,
        subsurface_scale=0.02,
        subsurface_radius=(1.0, 0.8, 0.6),
        clearcoat=0.1
    ),
    'marble_calacatta': MaterialProperties(
        name="Calacatta Marble",
        material_type=MaterialType.STONE_NATURAL,
        base_color=(0.98, 0.96, 0.92),
        metallic=0.0,
        roughness=0.12,
        ior=1.486,
        subsurface_scale=0.025,
        subsurface_radius=(1.0, 0.8, 0.6),
        clearcoat=0.15
    ),
    'granite_polished': MaterialProperties(
        name="Polished Granite",
        material_type=MaterialType.STONE_NATURAL,
        base_color=(0.35, 0.35, 0.37),
        metallic=0.0,
        roughness=0.08,
        ior=1.54,
        clearcoat=0.2
    ),
    'granite_honed': MaterialProperties(
        name="Honed Granite",
        material_type=MaterialType.STONE_NATURAL,
        base_color=(0.35, 0.35, 0.37),
        metallic=0.0,
        roughness=0.45,
        ior=1.54
    ),
    'quartz_premium': MaterialProperties(
        name="Engineered Quartz",
        material_type=MaterialType.STONE_ENGINEERED,
        base_color=(0.9, 0.9, 0.88),
        metallic=0.0,
        roughness=0.1,
        ior=1.54,
        clearcoat=0.3
    ),
    'quartz_leather': MaterialProperties(
        name="Leather Finish Quartz",
        material_type=MaterialType.STONE_ENGINEERED,
        base_color=(0.85, 0.85, 0.83),
        metallic=0.0,
        roughness=0.65,
        ior=1.54
    ),
    'soapstone': MaterialProperties(
        name="Soapstone",
        material_type=MaterialType.STONE_NATURAL,
        base_color=(0.25, 0.28, 0.26),
        metallic=0.0,
        roughness=0.7,
        ior=1.53,
        subsurface_scale=0.05,
        subsurface_radius=(0.8, 1.0, 0.9)
    ),
    'travertine': MaterialProperties(
        name="Travertine",
        material_type=MaterialType.STONE_NATURAL,
        base_color=(0.82, 0.75, 0.65),
        metallic=0.0,
        roughness=0.55,
        ior=1.52,
        subsurface_scale=0.03,
        subsurface_radius=(1.0, 0.7, 0.5)
    ),
    'slate': MaterialProperties(
        name="Slate",
        material_type=MaterialType.STONE_NATURAL,
        base_color=(0.18, 0.2, 0.22),
        metallic=0.0,
        roughness=0.8,
        ior=1.57
    ),
    
    # Metal Materials
    'steel_raw': MaterialProperties(
        name="Raw Steel",
        material_type=MaterialType.METAL_RAW,
        base_color=(0.72, 0.73, 0.72),
        metallic=1.0,
        roughness=0.3,
        ior=2.5,
        anisotropic=0.3
    ),
    'gold': MaterialProperties(
        name="Gold",
        material_type=MaterialType.METAL_RAW,
        base_color=(1.0, 0.78, 0.34),
        metallic=1.0,
        roughness=0.15,
        ior=0.18
    ),
    'copper': MaterialProperties(
        name="Copper",
        material_type=MaterialType.METAL_RAW,
        base_color=(0.96, 0.64, 0.38),
        metallic=1.0,
        roughness=0.2,
        ior=0.29
    ),
    
    # Other Materials
    'concrete': MaterialProperties(
        name="Concrete",
        material_type=MaterialType.CONCRETE,
        base_color=(0.55, 0.55, 0.55),
        metallic=0.0,
        roughness=0.95,
        ior=1.5
    ),
    'glass_clear': MaterialProperties(
        name="Clear Glass",
        material_type=MaterialType.GLASS,
        base_color=(1.0, 1.0, 1.0),
        metallic=0.0,
        roughness=0.0,
        ior=1.45,
        transmission=1.0,
        alpha=0.1
    ),
    'ceramic_glazed': MaterialProperties(
        name="Glazed Ceramic",
        material_type=MaterialType.CERAMIC,
        base_color=(0.9, 0.9, 0.9),
        metallic=0.0,
        roughness=0.05,
        ior=1.5,
        clearcoat=1.0
    ),
}


class PBRMaterialBuilder:
    """
    Builder for creating PBR materials using Metal/Roughness or
    Specular/Glossiness workflows.
    """
    
    def __init__(self, workflow: PBRWorkflow = PBRWorkflow.METAL_ROUGHNESS):
        self.workflow = workflow
        self.material: Optional[bpy.types.Material] = None
    
    def create_material(self, props: MaterialProperties, 
                       name: Optional[str] = None) -> bpy.types.Material:
        """
        Create a complete PBR material with all properties and textures.
        """
        mat_name = name or props.name
        
        # Check if material already exists
        if mat_name in bpy.data.materials:
            return bpy.data.materials[mat_name]
        
        # Create new material
        self.material = bpy.data.materials.new(name=mat_name)
        self.material.use_nodes = True
        
        # Clear default nodes
        nodes = self.material.node_tree.nodes
        links = self.material.node_tree.links
        nodes.clear()
        
        # Create output node
        output = nodes.new('ShaderNodeOutputMaterial')
        output.location = (400, 0)
        
        if self.workflow == PBRWorkflow.METAL_ROUGHNESS:
            self._build_metal_roughness(nodes, links, output, props)
        else:
            self._build_specular_glossiness(nodes, links, output, props)
        
        # Setup displacement if height map exists
        if props.textures.get('height') or props.displacement_scale > 0:
            self._setup_displacement(nodes, links, output, props)
        
        print(f"✅ PBR material created: {mat_name} ({self.workflow.value})")
        return self.material
    
    def _build_metal_roughness(self, nodes, links, output, props: MaterialProperties):
        """Build Metal/Roughness workflow material"""
        # Principled BSDF
        principled = nodes.new('ShaderNodeBsdfPrincipled')
        principled.location = (0, 0)
        
        # Set base properties
        principled.inputs['Base Color'].default_value = (*props.base_color, 1.0)
        principled.inputs['Metallic'].default_value = props.metallic
        principled.inputs['Roughness'].default_value = props.roughness
        principled.inputs['IOR'].default_value = props.ior
        principled.inputs['Alpha'].default_value = props.alpha
        
        # Transmission for glass
        principled.inputs['Transmission Weight'].default_value = props.transmission
        
        # Emission
        if props.emission_strength > 0:
            principled.inputs['Emission Color'].default_value = (*props.emission, 1.0)
            principled.inputs['Emission Strength'].default_value = props.emission_strength
        
        # Clearcoat for polished surfaces
        principled.inputs['Coat Weight'].default_value = props.clearcoat
        principled.inputs['Coat Roughness'].default_value = props.clearcoat_roughness
        
        # Sheen
        principled.inputs['Sheen Weight'].default_value = props.sheen
        principled.inputs['Sheen Tint'].default_value = props.sheen_tint
        
        # Anisotropic
        principled.inputs['Anisotropic'].default_value = props.anisotropic
        principled.inputs['Anisotropic Rotation'].default_value = props.anisotropic_rotation
        
        # Subsurface scattering
        if props.subsurface_scale > 0:
            principled.inputs['Subsurface Weight'].default_value = props.subsurface_scale
            principled.inputs['Subsurface Radius'].default_value = props.subsurface_radius
            principled.inputs['Subsurface Color'].default_value = (*props.subsurface_color, 1.0)
        
        # Link to output
        links.new(principled.outputs['BSDF'], output.inputs['Surface'])
        
        # Add texture nodes
        self._add_texture_nodes(nodes, links, principled, props)
    
    def _build_specular_glossiness(self, nodes, links, output, props: MaterialProperties):
        """Build Specular/Glossiness workflow material"""
        # Use Principled BSDF but interpret parameters for spec/gloss
        principled = nodes.new('ShaderNodeBsdfPrincipled')
        principled.location = (0, 0)
        
        # In spec/gloss workflow:
        # - Diffuse color becomes base color
        # - Specular color controls reflections
        # - Glossiness is inverse of roughness
        
        # Convert glossiness to roughness (1.0 - glossiness)
        roughness = 1.0 - props.glossiness
        
        principled.inputs['Base Color'].default_value = (*props.base_color, 1.0)
        principled.inputs['Metallic'].default_value = 0.0  # Specular workflow uses non-metallic
        principled.inputs['Roughness'].default_value = roughness
        principled.inputs['IOR'].default_value = props.ior
        principled.inputs['Alpha'].default_value = props.alpha
        
        # Specular tint (approximation)
        specular_intensity = sum(props.specular_color) / 3.0
        principled.inputs['Specular IOR Level'].default_value = specular_intensity * 2.0
        
        # Transmission
        principled.inputs['Transmission Weight'].default_value = props.transmission
        
        # Emission
        if props.emission_strength > 0:
            principled.inputs['Emission Color'].default_value = (*props.emission, 1.0)
            principled.inputs['Emission Strength'].default_value = props.emission_strength
        
        # Subsurface
        if props.subsurface_scale > 0:
            principled.inputs['Subsurface Weight'].default_value = props.subsurface_scale
            principled.inputs['Subsurface Radius'].default_value = props.subsurface_radius
            principled.inputs['Subsurface Color'].default_value = (*props.subsurface_color, 1.0)
        
        # Link to output
        links.new(principled.outputs['BSDF'], output.inputs['Surface'])
        
        # Add texture nodes (specular/gloss versions)
        self._add_specular_texture_nodes(nodes, links, principled, props)
    
    def _add_texture_nodes(self, nodes, links, principled, props: MaterialProperties):
        """Add texture nodes for Metal/Roughness workflow"""
        # UV Mapping
        tex_coord = nodes.new('ShaderNodeTexCoord')
        tex_coord.location = (-800, 0)
        
        mapping = nodes.new('ShaderNodeMapping')
        mapping.location = (-600, 0)
        links.new(tex_coord.outputs['UV'], mapping.inputs['Vector'])
        
        # Albedo/Base Color
        if props.textures.get('albedo'):
            albedo = self._create_image_node(nodes, props.textures['albedo'], (-400, 300), 'sRGB')
            links.new(mapping.outputs['Vector'], albedo.inputs['Vector'])
            links.new(albedo.outputs['Color'], principled.inputs['Base Color'])
        
        # Roughness
        if props.textures.get('roughness'):
            roughness = self._create_image_node(nodes, props.textures['roughness'], (-400, 0), 'Non-Color')
            links.new(mapping.outputs['Vector'], roughness.inputs['Vector'])
            links.new(roughness.outputs['Color'], principled.inputs['Roughness'])
        
        # Metallic
        if props.textures.get('metallic'):
            metallic = self._create_image_node(nodes, props.textures['metallic'], (-400, -150), 'Non-Color')
            links.new(mapping.outputs['Vector'], metallic.inputs['Vector'])
            links.new(metallic.outputs['Color'], principled.inputs['Metallic'])
        
        # Normal
        if props.textures.get('normal'):
            normal_tex = self._create_image_node(nodes, props.textures['normal'], (-400, -300), 'Non-Color')
            normal_map = nodes.new('ShaderNodeNormalMap')
            normal_map.location = (-200, -300)
            normal_map.inputs['Strength'].default_value = props.normal_strength
            
            links.new(mapping.outputs['Vector'], normal_tex.inputs['Vector'])
            links.new(normal_tex.outputs['Color'], normal_map.inputs['Color'])
            links.new(normal_map.outputs['Normal'], principled.inputs['Normal'])
        
        # Ambient Occlusion
        if props.textures.get('ao'):
            ao = self._create_image_node(nodes, props.textures['ao'], (-400, -500), 'Non-Color')
            
            # Mix AO with base color
            mix = nodes.new('ShaderNodeMix')
            mix.location = (-100, 200)
            mix.data_type = 'RGBA'
            mix.inputs['Factor'].default_value = 0.5
            
            if props.textures.get('albedo'):
                albedo_node = nodes.get(Path(props.textures['albedo']).stem)
                if albedo_node:
                    links.new(albedo_node.outputs['Color'], mix.inputs['Color1'])
            else:
                mix.inputs['Color1'].default_value = (*props.base_color, 1.0)
            
            links.new(ao.outputs['Color'], mix.inputs['Color2'])
            links.new(mix.outputs['Color'], principled.inputs['Base Color'])
            links.new(mapping.outputs['Vector'], ao.inputs['Vector'])
        
        # Emissive
        if props.textures.get('emissive'):
            emissive = self._create_image_node(nodes, props.textures['emissive'], (-400, -650), 'sRGB')
            links.new(mapping.outputs['Vector'], emissive.inputs['Vector'])
            links.new(emissive.outputs['Color'], principled.inputs['Emission Color'])
    
    def _add_specular_texture_nodes(self, nodes, links, principled, props: MaterialProperties):
        """Add texture nodes for Specular/Glossiness workflow"""
        tex_coord = nodes.new('ShaderNodeTexCoord')
        tex_coord.location = (-800, 0)
        
        mapping = nodes.new('ShaderNodeMapping')
        mapping.location = (-600, 0)
        links.new(tex_coord.outputs['UV'], mapping.inputs['Vector'])
        
        # Diffuse
        if props.textures.get('diffuse'):
            diffuse = self._create_image_node(nodes, props.textures['diffuse'], (-400, 300), 'sRGB')
            links.new(mapping.outputs['Vector'], diffuse.inputs['Vector'])
            links.new(diffuse.outputs['Color'], principled.inputs['Base Color'])
        
        # Specular
        if props.textures.get('specular'):
            specular = self._create_image_node(nodes, props.textures['specular'], (-400, 0), 'Non-Color')
            links.new(mapping.outputs['Vector'], specular.inputs['Vector'])
            links.new(specular.outputs['Color'], principled.inputs['Specular IOR Level'])
        
        # Glossiness (inverted to roughness)
        if props.textures.get('glossiness'):
            gloss = self._create_image_node(nodes, props.textures['glossiness'], (-400, -150), 'Non-Color')
            invert = nodes.new('ShaderNodeInvert')
            invert.location = (-200, -150)
            
            links.new(mapping.outputs['Vector'], gloss.inputs['Vector'])
            links.new(gloss.outputs['Color'], invert.inputs['Color'])
            links.new(invert.outputs['Color'], principled.inputs['Roughness'])
        
        # Normal
        if props.textures.get('normal'):
            normal_tex = self._create_image_node(nodes, props.textures['normal'], (-400, -300), 'Non-Color')
            normal_map = nodes.new('ShaderNodeNormalMap')
            normal_map.location = (-200, -300)
            normal_map.inputs['Strength'].default_value = props.normal_strength
            
            links.new(mapping.outputs['Vector'], normal_tex.inputs['Vector'])
            links.new(normal_tex.outputs['Color'], normal_map.inputs['Color'])
            links.new(normal_map.outputs['Normal'], principled.inputs['Normal'])
    
    def _create_image_node(self, nodes, image_path, location, color_space) -> bpy.types.Node:
        """Create and configure an image texture node"""
        node = nodes.new('ShaderNodeTexImage')
        node.location = location
        
        try:
            img = bpy.data.images.load(image_path, check_existing=True)
            node.image = img
            node.image.colorspace_settings.name = color_space
        except:
            print(f"⚠️  Could not load image: {image_path}")
        
        return node
    
    def _setup_displacement(self, nodes, links, output, props: MaterialProperties):
        """Setup displacement mapping"""
        # Displacement shader
        displacement = nodes.new('ShaderNodeDisplacement')
        displacement.location = (200, -300)
        displacement.inputs['Scale'].default_value = props.displacement_scale
        
        if props.textures.get('height'):
            # Add height texture
            tex_coord = nodes.get('Texture Coordinate')
            mapping = nodes.get('Mapping')
            
            height = self._create_image_node(nodes, props.textures['height'], (-400, -800), 'Non-Color')
            
            if mapping:
                links.new(mapping.outputs['Vector'], height.inputs['Vector'])
            links.new(height.outputs['Color'], displacement.inputs['Height'])
        else:
            # Use procedural noise as fallback
            noise = nodes.new('ShaderNodeTexNoise')
            noise.location = (0, -600)
            noise.inputs['Scale'].default_value = 50.0
            links.new(noise.outputs['Fac'], displacement.inputs['Height'])
        
        links.new(displacement.outputs['Displacement'], output.inputs['Displacement'])
        
        # Enable displacement in material settings
        self.material.cycles.displacement_method = 'BOTH'


class LayeredMaterialBuilder:
    """
    Builder for complex layered materials (e.g., stone with coating).
    """
    
    def create_layered_material(self, base_props: MaterialProperties,
                               coat_props: MaterialProperties,
                               blend_factor: float = 0.5,
                               name: str = "Layered_Material") -> bpy.types.Material:
        """
        Create a layered material with base and coat layers.
        """
        mat = bpy.data.materials.new(name=name)
        mat.use_nodes = True
        nodes = mat.node_tree.nodes
        links = mat.node_tree.links
        nodes.clear()
        
        # Create two BSDFs
        base_bsdf = nodes.new('ShaderNodeBsdfPrincipled')
        base_bsdf.location = (-200, 200)
        self._apply_properties_to_bsdf(base_bsdf, base_props)
        
        coat_bsdf = nodes.new('ShaderNodeBsdfPrincipled')
        coat_bsdf.location = (-200, -200)
        self._apply_properties_to_bsdf(coat_bsdf, coat_props)
        
        # Mix shader
        mix = nodes.new('ShaderNodeMixShader')
        mix.location = (100, 0)
        mix.inputs['Fac'].default_value = blend_factor
        
        links.new(base_bsdf.outputs['BSDF'], mix.inputs[1])
        links.new(coat_bsdf.outputs['BSDF'], mix.inputs[2])
        
        # Output
        output = nodes.new('ShaderNodeOutputMaterial')
        output.location = (400, 0)
        links.new(mix.outputs['Shader'], output.inputs['Surface'])
        
        return mat
    
    def _apply_properties_to_bsdf(self, bsdf: bpy.types.Node, props: MaterialProperties):
        """Apply material properties to a BSDF node"""
        bsdf.inputs['Base Color'].default_value = (*props.base_color, 1.0)
        bsdf.inputs['Metallic'].default_value = props.metallic
        bsdf.inputs['Roughness'].default_value = props.roughness
        bsdf.inputs['IOR'].default_value = props.ior
        bsdf.inputs['Coat Weight'].default_value = props.clearcoat


class ProceduralStoneMaterial:
    """
    Create procedural stone materials with noise-based variation.
    """
    
    def create_marble_material(self, name: str = "Procedural_Marble",
                              vein_color: Tuple[float, float, float] = (0.3, 0.3, 0.35),
                              base_color: Tuple[float, float, float] = (0.95, 0.95, 0.93),
                              vein_scale: float = 5.0) -> bpy.types.Material:
        """Create procedural marble with vein patterns"""
        mat = bpy.data.materials.new(name=name)
        mat.use_nodes = True
        nodes = mat.node_tree.nodes
        links = mat.node_tree.links
        nodes.clear()
        
        # Marble texture (Musgrave noise for veins)
        musgrave = nodes.new('ShaderNodeTexMusgrave')
        musgrave.location = (-600, 0)
        musgrave.inputs['Scale'].default_value = vein_scale
        musgrave.inputs['Detail'].default_value = 15.0
        musgrave.musgrave_type = 'RIDGED_MULTIFRACTAL'
        
        # Color ramp for vein definition
        color_ramp = nodes.new('ShaderNodeValToRGB')
        color_ramp.location = (-400, 0)
        color_ramp.color_ramp.elements[0].position = 0.4
        color_ramp.color_ramp.elements[0].color = (*vein_color, 1.0)
        color_ramp.color_ramp.elements[1].position = 0.6
        color_ramp.color_ramp.elements[1].color = (*base_color, 1.0)
        
        links.new(musgrave.outputs['Fac'], color_ramp.inputs['Fac'])
        
        # Principled BSDF
        principled = nodes.new('ShaderNodeBsdfPrincipled')
        principled.location = (0, 0)
        principled.inputs['Roughness'].default_value = 0.15
        principled.inputs['IOR'].default_value = 1.486
        
        links.new(color_ramp.outputs['Color'], principled.inputs['Base Color'])
        
        # Output
        output = nodes.new('ShaderNodeOutputMaterial')
        output.location = (300, 0)
        links.new(principled.outputs['BSDF'], output.inputs['Surface'])
        
        return mat
    
    def create_granite_material(self, name: str = "Procedural_Granite",
                               scale: float = 20.0) -> bpy.types.Material:
        """Create procedural granite with crystalline structure"""
        mat = bpy.data.materials.new(name=name)
        mat.use_nodes = True
        nodes = mat.node_tree.nodes
        links = mat.node_tree.links
        nodes.clear()
        
        # Voronoi for crystalline pattern
        voronoi = nodes.new('ShaderNodeTexVoronoi')
        voronoi.location = (-600, 0)
        voronoi.inputs['Scale'].default_value = scale
        voronoi.feature = 'F2_F1'
        
        # Color ramp for granite speckles
        color_ramp = nodes.new('ShaderNodeValToRGB')
        color_ramp.location = (-400, 0)
        color_ramp.color_ramp.elements[0].color = (0.15, 0.15, 0.17, 1.0)  # Dark speckles
        color_ramp.color_ramp.elements[1].color = (0.65, 0.65, 0.68, 1.0)  # Light matrix
        
        links.new(voronoi.outputs['Distance'], color_ramp.inputs['Fac'])
        
        # BSDF
        principled = nodes.new('ShaderNodeBsdfPrincipled')
        principled.location = (0, 0)
        principled.inputs['Roughness'].default_value = 0.1
        principled.inputs['IOR'].default_value = 1.54
        
        links.new(color_ramp.outputs['Color'], principled.inputs['Base Color'])
        
        # Output
        output = nodes.new('ShaderNodeOutputMaterial')
        output.location = (300, 0)
        links.new(principled.outputs['BSDF'], output.inputs['Surface'])
        
        return mat


def get_material_preset(preset_name: str) -> MaterialProperties:
    """Get a material preset from the database"""
    if preset_name in MATERIAL_DATABASE:
        return MATERIAL_DATABASE[preset_name]
    else:
        raise ValueError(f"Unknown material preset: {preset_name}. "
                        f"Available: {list(MATERIAL_DATABASE.keys())}")


def create_stone_material(stone_type: str, 
                         finish: str = "polished",
                         workflow: str = "metal_roughness") -> bpy.types.Material:
    """
    Convenience function for creating stone materials.
    
    Args:
        stone_type: Type of stone (e.g., 'marble_carrara', 'granite_polished')
        finish: Surface finish ('polished', 'honed', 'leather', 'flamed')
        workflow: 'metal_roughness' or 'specular_glossiness'
    
    Returns:
        Configured Blender material
    """
    # Get base properties
    props = get_material_preset(stone_type)
    
    # Adjust for finish
    finish_adjustments = {
        'polished': {'roughness': 0.08, 'clearcoat': 0.2},
        'honed': {'roughness': 0.4, 'clearcoat': 0.0},
        'leather': {'roughness': 0.65, 'clearcoat': 0.0},
        'flamed': {'roughness': 0.85, 'clearcoat': 0.0},
        'brushed': {'roughness': 0.3, 'clearcoat': 0.05, 'anisotropic': 0.2}
    }
    
    if finish in finish_adjustments:
        for key, value in finish_adjustments[finish].items():
            setattr(props, key, value)
    
    # Create material
    workflow_enum = PBRWorkflow.METAL_ROUGHNESS if workflow == "metal_roughness" else PBRWorkflow.SPECULAR_GLOSSINESS
    builder = PBRMaterialBuilder(workflow_enum)
    
    return builder.create_material(props, name=f"{stone_type}_{finish}")
