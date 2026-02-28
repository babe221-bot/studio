"""
Surface Imperfections and Material Wear System

Implements photorealistic micro-details for stone slab visualization:
- Micro-displacement for surface irregularities
- Fingerprint and usage wear texture overlays
- Material wear patterns (edge darkening, high-traffic zones)
- Enhanced contact shadows and ambient occlusion
"""
import bpy
import mathutils
import noise
import random
from typing import Dict, List, Tuple, Optional, Any, Union
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
import math


class ImperfectionType(Enum):
    """Types of surface imperfections"""
    MICRO_SCRATCHES = "micro_scratches"
    FINGERPRINTS = "fingerprints"
    DUST = "dust"
    WATER_SPOTS = "water_spots"
    EDGE_WEAR = "edge_wear"
    TRAFFIC_PATTERNS = "traffic_patterns"
    PITTING = "pitting"
    STAINING = "staining"


class WearPattern(Enum):
    """Material wear pattern types"""
    NONE = "none"
    EDGE_DARKENING = "edge_darkening"  # Natural edge weathering
    CENTER_TRAFFIC = "center_traffic"  # High-traffic center wear
    CORNER_WEAR = "corner_wear"  # Corner handling wear
    WATER_DAMAGE = "water_damage"  # Water exposure patterns
    HEAT_MARKS = "heat_marks"  # Heat exposure patterns


@dataclass
class SurfaceImperfectionConfig:
    """Configuration for surface imperfections"""
    # Micro-displacement settings
    displacement_scale: float = 0.001  # Subtle displacement
    displacement_detail: float = 8.0  # Noise detail level
    displacement_roughness: float = 0.5  # Noise roughness
    
    # Fingerprint settings
    fingerprint_intensity: float = 0.3  # 0-1 strength
    fingerprint_roughness_increase: float = 0.15  # Roughness boost
    fingerprint_coverage: float = 0.2  # % of surface covered
    
    # Dust settings
    dust_amount: float = 0.1  # Dust layer opacity
    dust_color: Tuple[float, float, float] = (0.9, 0.88, 0.85)  # Light gray dust
    
    # Edge wear settings
    edge_wear_width: float = 0.02  # Width of edge wear effect (meters)
    edge_wear_intensity: float = 0.4  # Darkness/intensity of wear
    edge_wear_roughness: float = 0.3  # Roughness increase at edges
    
    # Traffic pattern settings
    traffic_zone_center: Tuple[float, float, float] = (0.0, 0.0, 0.0)
    traffic_zone_radius: float = 0.3  # Radius of high-traffic area
    traffic_wear_intensity: float = 0.25  # Wear amount in traffic zone
    
    # AO enhancement
    ao_intensity: float = 1.0  # Ambient occlusion strength
    contact_shadow_distance: float = 0.01  # Contact shadow proximity


@dataclass
class ImperfectionMaps:
    """Generated imperfection texture maps"""
    displacement_path: Optional[str] = None
    roughness_path: Optional[str] = None
    normal_path: Optional[str] = None
    ao_path: Optional[str] = None
    fingerprint_mask_path: Optional[str] = None
    wear_mask_path: Optional[str] = None


class MicroDisplacementGenerator:
    """
    Generates procedural micro-displacement for surface irregularities.
    Creates realistic surface variation without high-poly geometry.
    """
    
    def __init__(self, config: SurfaceImperfectionConfig):
        self.config = config
    
    def add_micro_displacement(self, material: bpy.types.Material,
                               obj: bpy.types.Object) -> None:
        """
        Add micro-displacement to material for surface irregularities.
        
        Args:
            material: The material to modify
            obj: The object (for displacement modifier setup)
        """
        if not material.use_nodes:
            material.use_nodes = True
        
        nodes = material.node_tree.nodes
        links = material.node_tree.links
        
        # Find or create displacement node
        displacement_node = nodes.get("Displacement")
        if not displacement_node:
            displacement_node = nodes.new('ShaderNodeDisplacement')
            displacement_node.location = (400, -400)
        
        # Create procedural noise for displacement
        noise_tex = nodes.new('ShaderNodeTexNoise')
        noise_tex.location = (0, -400)
        noise_tex.inputs['Scale'].default_value = self.config.displacement_detail
        noise_tex.inputs['Detail'].default_value = 15.0
        noise_tex.inputs['Roughness'].default_value = self.config.displacement_roughness
        
        # Add mapping for UV control
        mapping = nodes.new('ShaderNodeMapping')
        mapping.location = (-200, -400)
        
        tex_coord = nodes.new('ShaderNodeTexCoord')
        tex_coord.location = (-400, -400)
        
        # Scale displacement
        math_node = nodes.new('ShaderNodeMath')
        math_node.location = (200, -400)
        math_node.operation = 'MULTIPLY'
        math_node.inputs[1].default_value = self.config.displacement_scale
        
        # Link nodes
        links.new(tex_coord.outputs['UV'], mapping.inputs['Vector'])
        links.new(mapping.outputs['Vector'], noise_tex.inputs['Vector'])
        links.new(noise_tex.outputs['Fac'], math_node.inputs[0])
        links.new(math_node.outputs['Value'], displacement_node.inputs['Height'])
        
        # Find material output
        output = nodes.get('Material Output')
        if output:
            links.new(displacement_node.outputs['Displacement'], 
                     output.inputs['Displacement'])
        
        # Enable displacement in material settings
        material.cycles.displacement_method = 'BOTH'
        
        print(f"✅ Micro-displacement added: scale={self.config.displacement_scale}")
    
    def generate_procedural_scratches(self, material: bpy.types.Material) -> None:
        """Add micro-scratches using voronoi texture"""
        if not material.use_nodes:
            material.use_nodes = True
        
        nodes = material.node_tree.nodes
        links = material.node_tree.links
        
        # Voronoi for scratch patterns
        voronoi = nodes.new('ShaderNodeTexVoronoi')
        voronoi.location = (-200, -600)
        voronoi.feature = 'DISTANCE_TO_EDGE'
        voronoi.inputs['Scale'].default_value = 250.0  # Fine scratches
        
        # Color ramp for scratch intensity
        color_ramp = nodes.new('ShaderNodeValToRGB')
        color_ramp.location = (0, -600)
        color_ramp.color_ramp.elements[0].position = 0.95
        color_ramp.color_ramp.elements[1].position = 1.0
        
        # Mix with roughness
        bsdf = nodes.get('Principled BSDF')
        if bsdf:
            mix_roughness = nodes.new('ShaderNodeMath')
            mix_roughness.location = (200, -600)
            mix_roughness.operation = 'ADD'
            mix_roughness.inputs[1].default_value = 0.05  # Subtle scratch effect
            
            # Link
            links.new(voronoi.outputs['Distance'], color_ramp.inputs['Fac'])
            links.new(color_ramp.outputs['Color'], mix_roughness.inputs[0])
            links.new(mix_roughness.outputs['Value'], bsdf.inputs['Roughness'])
        
        print("✅ Micro-scratches added to material")


class FingerprintSystem:
    """
    Generates and applies fingerprint and handling marks.
    Simulates realistic usage patterns on stone surfaces.
    """
    
    def __init__(self, config: SurfaceImperfectionConfig):
        self.config = config
    
    def add_fingerprints(self, material: bpy.types.Material,
                        seed: int = 42) -> None:
        """
        Add fingerprint smudges to material.
        
        Args:
            material: Target material
            seed: Random seed for reproducible patterns
        """
        if not material.use_nodes:
            material.use_nodes = True
        
        nodes = material.node_tree.nodes
        links = material.node_tree.links
        
        random.seed(seed)
        
        # Create multiple fingerprint patterns using musgrave texture
        fingerprint_group = nodes.new('ShaderNodeGroup')
        fingerprint_group.name = "FingerprintPattern"
        fingerprint_group.location = (-300, -800)
        
        # Use musgrave texture for organic smudge patterns
        musgrave = nodes.new('ShaderNodeTexMusgrave')
        musgrave.location = (-500, -800)
        musgrave.musgrave_type = 'RIDGED_MULTIFRACTAL'
        musgrave.inputs['Scale'].default_value = 15.0
        musgrave.inputs['Detail'].default_value = 8.0
        musgrave.inputs['Dimension'].default_value = 1.0
        musgrave.inputs['Lacunarity'].default_value = 2.5
        
        # Color ramp to isolate fingerprint shapes
        fingerprint_mask = nodes.new('ShaderNodeValToRGB')
        fingerprint_mask.location = (-300, -800)
        fingerprint_mask.color_ramp.interpolation = 'CONSTANT'
        fingerprint_mask.color_ramp.elements[0].position = 0.45
        fingerprint_mask.color_ramp.elements[1].position = 0.55
        
        # Random fingerprint placement using noise
        placement_noise = nodes.new('ShaderNodeTexNoise')
        placement_noise.location = (-700, -800)
        placement_noise.inputs['Scale'].default_value = 3.0
        placement_noise.inputs['Detail'].default_value = 0.0
        
        # Mix for coverage control
        coverage_mix = nodes.new('ShaderNodeMath')
        coverage_mix.location = (-100, -800)
        coverage_mix.operation = 'MULTIPLY'
        coverage_mix.inputs[1].default_value = self.config.fingerprint_coverage
        
        # Apply to roughness
        bsdf = nodes.get('Principled BSDF')
        if bsdf:
            # Mix current roughness with fingerprint effect
            roughness_mix = nodes.new('ShaderNodeMix')
            roughness_mix.location = (100, -800)
            roughness_mix.data_type = 'RGBA'
            roughness_mix.inputs['Factor'].default_value = self.config.fingerprint_intensity
            
            # Fingerprint increases roughness (oily smudges)
            fingerprint_roughness = nodes.new('ShaderNodeValue')
            fingerprint_roughness.location = (-100, -900)
            fingerprint_roughness.outputs[0].default_value = (
                bsdf.inputs['Roughness'].default_value + 
                self.config.fingerprint_roughness_increase
            )
            
            # Link nodes
            links.new(musgrave.outputs['Fac'], fingerprint_mask.inputs['Fac'])
            links.new(placement_noise.outputs['Fac'], coverage_mix.inputs[0])
            links.new(fingerprint_mask.outputs['Color'], roughness_mix.inputs['Color1'])
            links.new(fingerprint_roughness.outputs['Value'], roughness_mix.inputs['Color2'])
            
            # Get current roughness link or value
            current_roughness = bsdf.inputs['Roughness'].links[0].from_socket if \
                bsdf.inputs['Roughness'].links else None
            
            if current_roughness:
                links.new(current_roughness, roughness_mix.inputs['Color1'])
            
            links.new(roughness_mix.outputs['Color'], bsdf.inputs['Roughness'])
        
        print(f"✅ Fingerprints added: intensity={self.config.fingerprint_intensity}, "
              f"coverage={self.config.fingerprint_coverage}")
    
    def add_dust_layer(self, material: bpy.types.Material) -> None:
        """Add subtle dust accumulation to surface"""
        if not material.use_nodes:
            material.use_nodes = True
        
        nodes = material.node_tree.nodes
        links = material.node_tree.links
        
        # Noise for dust distribution
        dust_noise = nodes.new('ShaderNodeTexNoise')
        dust_noise.location = (-300, -1000)
        dust_noise.inputs['Scale'].default_value = 50.0
        dust_noise.inputs['Detail'].default_value = 4.0
        
        # Color ramp for dust patches
        dust_ramp = nodes.new('ShaderNodeValToRGB')
        dust_ramp.location = (-100, -1000)
        dust_ramp.color_ramp.elements[0].position = 0.6
        dust_ramp.color_ramp.elements[1].position = 0.8
        
        # Dust color
        dust_color = nodes.new('ShaderNodeRGB')
        dust_color.location = (100, -1000)
        dust_color.outputs[0].default_value = (*self.config.dust_color, 1.0)
        
        # Mix with base color
        bsdf = nodes.get('Principled BSDF')
        if bsdf:
            color_mix = nodes.new('ShaderNodeMix')
            color_mix.location = (300, -1000)
            color_mix.data_type = 'RGBA'
            color_mix.inputs['Factor'].default_value = self.config.dust_amount
            color_mix.blend_type = 'MIX'
            
            links.new(dust_noise.outputs['Fac'], dust_ramp.inputs['Fac'])
            links.new(dust_ramp.outputs['Color'], color_mix.inputs['Factor'])
            links.new(dust_color.outputs['Color'], color_mix.inputs['Color2'])
            
            # Get current base color
            current_color = bsdf.inputs['Base Color'].links[0].from_socket if \
                bsdf.inputs['Base Color'].links else None
            
            if current_color:
                links.new(current_color, color_mix.inputs['Color1'])
            else:
                color_mix.inputs['Color1'].default_value = \
                    bsdf.inputs['Base Color'].default_value
            
            links.new(color_mix.outputs['Color'], bsdf.inputs['Base Color'])
        
        print(f"✅ Dust layer added: amount={self.config.dust_amount}")


class MaterialWearSystem:
    """
    Generates realistic material wear patterns.
    Includes edge darkening, traffic patterns, and aging effects.
    """
    
    def __init__(self, config: SurfaceImperfectionConfig):
        self.config = config
    
    def add_edge_wear(self, material: bpy.types.Material,
                     obj: bpy.types.Object) -> None:
        """
        Add edge darkening and wear to material edges.
        Simulates natural handling wear on stone edges.
        """
        if not material.use_nodes:
            material.use_nodes = True
        
        nodes = material.node_tree.nodes
        links = material.node_tree.links
        
        # Bevel node for edge detection
        bevel = nodes.new('ShaderNodeBevel')
        bevel.location = (-300, -1200)
        bevel.inputs['Radius'].default_value = self.config.edge_wear_width
        bevel.samples = 8
        
        # Color ramp for edge mask
        edge_mask = nodes.new('ShaderNodeValToRGB')
        edge_mask.location = (-100, -1200)
        edge_mask.color_ramp.elements[0].position = 0.0
        edge_mask.color_ramp.elements[0].color = (0, 0, 0, 1)
        edge_mask.color_ramp.elements[1].position = 0.5
        edge_mask.color_ramp.elements[1].color = (1, 1, 1, 1)
        
        # Darken color at edges
        bsdf = nodes.get('Principled BSDF')
        if bsdf:
            # Edge darkening mix
            edge_darken = nodes.new('ShaderNodeMix')
            edge_darken.location = (100, -1200)
            edge_darken.data_type = 'RGBA'
            edge_darken.blend_type = 'DARKEN'
            edge_darken.inputs['Factor'].default_value = self.config.edge_wear_intensity
            
            # Get current base color
            current_color_val = bsdf.inputs['Base Color'].default_value
            edge_color = (
                current_color_val[0] * 0.7,
                current_color_val[1] * 0.7,
                current_color_val[2] * 0.7,
                1.0
            )
            edge_darken.inputs['Color2'].default_value = edge_color
            
            # Increase roughness at edges
            edge_roughness = nodes.new('ShaderNodeMath')
            edge_roughness.location = (100, -1350)
            edge_roughness.operation = 'ADD'
            edge_roughness.inputs[1].default_value = self.config.edge_wear_roughness
            
            # Link nodes
            links.new(bevel.outputs['Normal'], edge_mask.inputs['Fac'])
            links.new(edge_mask.outputs['Color'], edge_darken.inputs['Factor'])
            
            current_color = bsdf.inputs['Base Color'].links[0].from_socket if \
                bsdf.inputs['Base Color'].links else None
            
            if current_color:
                links.new(current_color, edge_darken.inputs['Color1'])
            else:
                edge_darken.inputs['Color1'].default_value = current_color_val
            
            links.new(edge_darken.outputs['Color'], bsdf.inputs['Base Color'])
            
            # Edge roughness
            current_roughness = bsdf.inputs['Roughness'].links[0].from_socket if \
                bsdf.inputs['Roughness'].links else None
            
            if current_roughness:
                links.new(current_roughness, edge_roughness.inputs[0])
            else:
                edge_roughness.inputs[0].default_value = bsdf.inputs['Roughness'].default_value
            
            links.new(edge_mask.outputs['Color'], edge_roughness.inputs[1])
            
            roughness_mix = nodes.new('ShaderNodeMath')
            roughness_mix.location = (300, -1350)
            roughness_mix.operation = 'MULTIPLY'
            links.new(edge_roughness.outputs['Value'], roughness_mix.inputs[0])
            links.new(edge_mask.outputs['Color'], roughness_mix.inputs[1])
            links.new(roughness_mix.outputs['Value'], bsdf.inputs['Roughness'])
        
        print(f"✅ Edge wear added: width={self.config.edge_wear_width}m, "
              f"intensity={self.config.edge_wear_intensity}")
    
    def add_traffic_pattern(self, material: bpy.types.Material,
                           pattern_type: WearPattern = WearPattern.CENTER_TRAFFIC) -> None:
        """
        Add high-traffic wear patterns to material.
        Simulates wear in commonly touched areas.
        """
        if not material.use_nodes:
            material.use_nodes = True
        
        nodes = material.node_tree.nodes
        links = material.node_tree.links
        
        # Texture coordinate for positioning
        tex_coord = nodes.new('ShaderNodeTexCoord')
        tex_coord.location = (-600, -1500)
        
        # Mapping for traffic zone center
        mapping = nodes.new('ShaderNodeMapping')
        mapping.location = (-400, -1500)
        mapping.inputs['Location'].default_value = self.config.traffic_zone_center
        
        # Gradient texture for traffic zone
        gradient = nodes.new('ShaderNodeTexGradient')
        gradient.location = (-200, -1500)
        gradient.gradient_type = 'SPHERICAL'
        
        # Color ramp for traffic mask
        traffic_mask = nodes.new('ShaderNodeValToRGB')
        traffic_mask.location = (0, -1500)
        traffic_mask.color_ramp.elements[0].position = 0.0
        traffic_mask.color_ramp.elements[0].color = (1, 1, 1, 1)  # Full wear at center
        traffic_mask.color_ramp.elements[1].position = self.config.traffic_zone_radius
        traffic_mask.color_ramp.elements[1].color = (0, 0, 0, 1)  # No wear at edge
        
        # Apply wear effect
        bsdf = nodes.get('Principled BSDF')
        if bsdf:
            # Wear darkens and smooths the surface
            wear_mix = nodes.new('ShaderNodeMix')
            wear_mix.location = (200, -1500)
            wear_mix.data_type = 'RGBA'
            wear_mix.inputs['Factor'].default_value = self.config.traffic_wear_intensity
            
            # Worn color (slightly darker and warmer)
            current_color = bsdf.inputs['Base Color'].default_value
            worn_color = (
                current_color[0] * 0.85,
                current_color[1] * 0.82,
                current_color[2] * 0.78,
                1.0
            )
            wear_mix.inputs['Color2'].default_value = worn_color
            
            # Link nodes
            links.new(tex_coord.outputs['Generated'], mapping.inputs['Vector'])
            links.new(mapping.outputs['Vector'], gradient.inputs['Vector'])
            links.new(gradient.outputs['Color'], traffic_mask.inputs['Fac'])
            links.new(traffic_mask.outputs['Color'], wear_mix.inputs['Factor'])
            
            # Get current base color
            current_color_link = bsdf.inputs['Base Color'].links[0].from_socket if \
                bsdf.inputs['Base Color'].links else None
            
            if current_color_link:
                links.new(current_color_link, wear_mix.inputs['Color1'])
            else:
                wear_mix.inputs['Color1'].default_value = current_color
            
            links.new(wear_mix.outputs['Color'], bsdf.inputs['Base Color'])
            
            # Traffic areas are smoother (polished by use)
            current_roughness = bsdf.inputs['Roughness'].default_value
            polished_roughness = max(0.0, current_roughness - 0.1)
            
            roughness_mix = nodes.new('ShaderNodeMix')
            roughness_mix.location = (200, -1650)
            roughness_mix.data_type = 'RGBA'
            roughness_mix.inputs['Factor'].default_value = self.config.traffic_wear_intensity
            roughness_mix.inputs['Color1'].default_value = (current_roughness, current_roughness, current_roughness, 1.0)
            roughness_mix.inputs['Color2'].default_value = (polished_roughness, polished_roughness, polished_roughness, 1.0)
            
            links.new(traffic_mask.outputs['Color'], roughness_mix.inputs['Factor'])
            links.new(roughness_mix.outputs['Color'], bsdf.inputs['Roughness'])
        
        print(f"✅ Traffic pattern added: type={pattern_type.value}, "
              f"intensity={self.config.traffic_wear_intensity}")


class ContactShadowEnhancer:
    """
    Enhances contact shadows and ambient occlusion for added realism.
    Improves grounding of objects in the scene.
    """
    
    def __init__(self, config: SurfaceImperfectionConfig):
        self.config = config
    
    def enhance_ao(self, material: bpy.types.Material) -> None:
        """
        Add enhanced ambient occlusion to material.
        Darkens crevices and contact areas.
        """
        if not material.use_nodes:
            material.use_nodes = True
        
        nodes = material.node_tree.nodes
        links = material.node_tree.links
        
        # AO node
        ao_node = nodes.new('ShaderNodeAmbientOcclusion')
        ao_node.location = (-300, -1800)
        ao_node.inputs['Distance'].default_value = self.config.contact_shadow_distance
        ao_node.samples = 16
        
        # Color ramp for AO control
        ao_ramp = nodes.new('ShaderNodeValToRGB')
        ao_ramp.location = (-100, -1800)
        ao_ramp.color_ramp.elements[0].position = 0.0
        ao_ramp.color_ramp.elements[0].color = (0.3, 0.3, 0.3, 1.0)  # Dark crevices
        ao_ramp.color_ramp.elements[1].position = 1.0
        ao_ramp.color_ramp.elements[1].color = (1.0, 1.0, 1.0, 1.0)  # Lit areas
        
        # Mix with base color
        bsdf = nodes.get('Principled BSDF')
        if bsdf:
            ao_mix = nodes.new('ShaderNodeMix')
            ao_mix.location = (100, -1800)
            ao_mix.data_type = 'RGBA'
            ao_mix.blend_type = 'MULTIPLY'
            ao_mix.inputs['Factor'].default_value = self.config.ao_intensity
            
            # Link
            links.new(ao_node.outputs['Color'], ao_ramp.inputs['Fac'])
            links.new(ao_ramp.outputs['Color'], ao_mix.inputs['Color2'])
            
            # Get current base color
            current_color = bsdf.inputs['Base Color'].links[0].from_socket if \
                bsdf.inputs['Base Color'].links else None
            
            if current_color:
                links.new(current_color, ao_mix.inputs['Color1'])
            else:
                ao_mix.inputs['Color1'].default_value = \
                    bsdf.inputs['Base Color'].default_value
            
            links.new(ao_mix.outputs['Color'], bsdf.inputs['Base Color'])
        
        print(f"✅ Enhanced AO added: intensity={self.config.ao_intensity}")
    
    def add_contact_shadow(self, obj: bpy.types.Object,
                          ground_plane: Optional[bpy.types.Object] = None) -> bpy.types.Object:
        """
        Add contact shadow object beneath the slab.
        Creates realistic grounding shadow.
        
        Args:
            obj: The stone slab object
            ground_plane: Optional ground plane to use as shadow catcher
            
        Returns:
            The shadow plane object
        """
        # Create shadow plane if no ground provided
        if not ground_plane:
            # Get object bounds
            bbox = [obj.matrix_world @ mathutils.Vector(corner) for corner in obj.bound_box]
            min_x = min(v.x for v in bbox)
            max_x = max(v.x for v in bbox)
            min_y = min(v.y for v in bbox)
            max_y = max(v.y for v in bbox)
            min_z = min(v.z for v in bbox)
            
            # Create shadow plane
            size_x = (max_x - min_x) * 1.5
            size_y = (max_y - min_y) * 1.5
            
            bpy.ops.mesh.primitive_plane_add(
                size=1.0,
                location=(obj.location.x, obj.location.y, min_z - 0.001)
            )
            shadow_plane = bpy.context.active_object
            shadow_plane.name = f"{obj.name}_ContactShadow"
            shadow_plane.scale = (size_x / 2, size_y / 2, 1.0)
            
            # Create shadow material
            shadow_mat = bpy.data.materials.new(name=f"{obj.name}_ShadowMat")
            shadow_mat.use_nodes = True
            shadow_mat.shadow_method = 'NONE'
            
            nodes = shadow_mat.node_tree.nodes
            links = shadow_mat.node_tree.links
            nodes.clear()
            
            # Transparent BSDF for shadow catcher
            transparent = nodes.new('ShaderNodeBsdfTransparent')
            transparent.location = (0, 0)
            
            output = nodes.new('ShaderNodeOutputMaterial')
            output.location = (200, 0)
            
            links.new(transparent.outputs['BSDF'], output.inputs['Surface'])
            
            # Enable shadow catcher
            shadow_plane.cycles.is_shadow_catcher = True
            shadow_plane.data.materials.append(shadow_mat)
            
            print(f"✅ Contact shadow plane created: {shadow_plane.name}")
            return shadow_plane
        else:
            # Enable shadow catcher on existing ground
            ground_plane.cycles.is_shadow_catcher = True
            print(f"✅ Ground plane set as shadow catcher: {ground_plane.name}")
            return ground_plane


class SurfaceImperfectionManager:
    """
    Main manager class for applying all surface imperfections.
    Provides a unified interface for photorealistic detailing.
    """
    
    def __init__(self, config: Optional[SurfaceImperfectionConfig] = None):
        self.config = config or SurfaceImperfectionConfig()
        self.displacement_gen = MicroDisplacementGenerator(self.config)
        self.fingerprint_sys = FingerprintSystem(self.config)
        self.wear_sys = MaterialWearSystem(self.config)
        self.shadow_enhancer = ContactShadowEnhancer(self.config)
    
    def apply_all_imperfections(self, material: bpy.types.Material,
                                obj: bpy.types.Object,
                                wear_pattern: WearPattern = WearPattern.EDGE_DARKENING,
                                add_shadows: bool = True) -> None:
        """
        Apply all surface imperfections for maximum photorealism.
        
        Args:
            material: The material to enhance
            obj: The object to apply imperfections to
            wear_pattern: Type of wear pattern to apply
            add_shadows: Whether to add contact shadows
        """
        print(f"\n🎨 Applying surface imperfections to: {material.name}")
        print("=" * 60)
        
        # 1. Micro-displacement for surface irregularities
        self.displacement_gen.add_micro_displacement(material, obj)
        self.displacement_gen.generate_procedural_scratches(material)
        
        # 2. Fingerprints and handling marks
        self.fingerprint_sys.add_fingerprints(material)
        self.fingerprint_sys.add_dust_layer(material)
        
        # 3. Material wear patterns
        if wear_pattern != WearPattern.NONE:
            self.wear_sys.add_edge_wear(material, obj)
            if wear_pattern == WearPattern.CENTER_TRAFFIC:
                self.wear_sys.add_traffic_pattern(material, wear_pattern)
        
        # 4. Enhanced AO
        self.shadow_enhancer.enhance_ao(material)
        
        # 5. Contact shadows
        if add_shadows:
            self.shadow_enhancer.add_contact_shadow(obj)
        
        print("=" * 60)
        print(f"✅ All imperfections applied to: {material.name}\n")
    
    def apply_preset(self, material: bpy.types.Material,
                    obj: bpy.types.Object,
                    preset: str = "realistic") -> None:
        """
        Apply a predefined imperfection preset.
        
        Presets:
            - "clean": Minimal imperfections, showroom quality
            - "realistic": Moderate wear, typical installation
            - "weathered": Heavy wear, aged appearance
            - "kitchen": Kitchen counter with traffic patterns
        """
        presets = {
            "clean": SurfaceImperfectionConfig(
                displacement_scale=0.0005,
                fingerprint_intensity=0.1,
                fingerprint_coverage=0.05,
                dust_amount=0.02,
                edge_wear_intensity=0.1,
                traffic_wear_intensity=0.05,
                ao_intensity=0.5
            ),
            "realistic": SurfaceImperfectionConfig(),  # Default values
            "weathered": SurfaceImperfectionConfig(
                displacement_scale=0.002,
                fingerprint_intensity=0.5,
                fingerprint_coverage=0.4,
                dust_amount=0.2,
                edge_wear_intensity=0.6,
                edge_wear_roughness=0.5,
                traffic_wear_intensity=0.4,
                ao_intensity=1.2
            ),
            "kitchen": SurfaceImperfectionConfig(
                displacement_scale=0.001,
                fingerprint_intensity=0.4,
                fingerprint_coverage=0.3,
                dust_amount=0.08,
                edge_wear_intensity=0.35,
                traffic_zone_radius=0.4,
                traffic_wear_intensity=0.3,
                ao_intensity=0.8
            )
        }
        
        if preset in presets:
            self.config = presets[preset]
            self.displacement_gen = MicroDisplacementGenerator(self.config)
            self.fingerprint_sys = FingerprintSystem(self.config)
            self.wear_sys = MaterialWearSystem(self.config)
            self.shadow_enhancer = ContactShadowEnhancer(self.config)
            
            wear_map = {
                "clean": WearPattern.NONE,
                "realistic": WearPattern.EDGE_DARKENING,
                "weathered": WearPattern.CENTER_TRAFFIC,
                "kitchen": WearPattern.CENTER_TRAFFIC
            }
            
            self.apply_all_imperfections(material, obj, wear_map[preset])
            print(f"✅ Applied '{preset}' preset")
        else:
            print(f"⚠️ Unknown preset: {preset}. Using 'realistic'.")
            self.apply_all_imperfections(material, obj)


# Convenience function for quick application
def apply_photorealistic_imperfections(material: bpy.types.Material,
                                      obj: bpy.types.Object,
                                      preset: str = "realistic") -> None:
    """
    Quick function to apply all photorealistic imperfections.
    
    Args:
        material: Material to enhance
        obj: Object to apply to
        preset: Imperfection preset ("clean", "realistic", "weathered", "kitchen")
    """
    manager = SurfaceImperfectionManager()
    manager.apply_preset(material, obj, preset)


# Export classes for use in other modules
__all__ = [
    'SurfaceImperfectionConfig',
    'ImperfectionType',
    'WearPattern',
    'MicroDisplacementGenerator',
    'FingerprintSystem',
    'MaterialWearSystem',
    'ContactShadowEnhancer',
    'SurfaceImperfectionManager',
    'apply_photorealistic_imperfections'
]
