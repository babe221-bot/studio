"""
Advanced Lighting and Global Illumination System

Implements Three-Point Lighting Foundation, HDRI Environment Lighting,
Global Illumination techniques, and Volumetric/Practical lighting
for professional stone slab visualization.
"""
import bpy
import mathutils
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
import math


class LightingStyle(Enum):
    """Predefined lighting styles for different visualization purposes"""
    STUDIO = "studio"  # Clean studio lighting
    ARCHVIZ = "archviz"  # Architectural visualization
    PRODUCT = "product"  # Product photography style
    NATURAL = "natural"  # Natural daylight simulation
    DRAMATIC = "dramatic"  # High contrast dramatic lighting


class GIMethod(Enum):
    """Global Illumination calculation methods"""
    PATH_TRACING = "PATH"  # Highest quality, slowest
    BRUTE_FORCE = "BRUTE_FORCE"  # High quality GI
    IRRADIANCE_CACHE = "IRRADIANCE_CACHE"  # Medium quality, faster
    LIGHT_CACHE = "LIGHT_CACHE"  # Fast preview
    REALTIME = "REALTIME"  # Eevee real-time


class LightType(Enum):
    """Types of light sources"""
    SUN = "SUN"
    AREA = "AREA"
    POINT = "POINT"
    SPOT = "SPOT"
    EMISSIVE = "EMISSIVE"


@dataclass
class LightConfig:
    """Configuration for individual light sources"""
    type: LightType
    name: str
    location: Tuple[float, float, float]
    rotation: Tuple[float, float, float] = (0.0, 0.0, 0.0)
    energy: float = 10.0
    color: Tuple[float, float, float, float] = (1.0, 1.0, 1.0, 1.0)
    size: float = 1.0  # For area lights
    angle: float = 0.526  # For sun lights (radians)
    spot_size: float = 0.785  # For spot lights (radians)
    spot_blend: float = 0.15
    use_shadow: bool = True
    shadow_soft_size: float = 0.1


@dataclass
class ThreePointConfig:
    """Three-Point Lighting Foundation configuration"""
    key_angle: float = math.radians(45)  # 45° from camera
    key_height: float = math.radians(45)  # 45° elevation
    key_energy: float = 10.0
    key_color: Tuple[float, float, float, float] = (1.0, 0.98, 0.95, 1.0)  # Warm white
    key_size: float = 2.0
    
    fill_ratio: float = 0.5  # Fill is 50% of key
    fill_angle: float = math.radians(-45)  # Opposite side
    fill_height: float = math.radians(30)
    fill_color: Tuple[float, float, float, float] = (0.9, 0.95, 1.0, 1.0)  # Cool white
    
    rim_ratio: float = 1.2  # Rim is 120% of key
    rim_height: float = math.radians(60)
    rim_color: Tuple[float, float, float, float] = (1.0, 1.0, 1.0, 1.0)  # Pure white


@dataclass
class HDRIConfig:
    """HDRI Environment Lighting configuration"""
    hdri_path: Optional[str] = None
    strength: float = 1.0
    rotation: float = 0.0  # Z-rotation in degrees
    exposure: float = 0.0
    color_temperature: float = 6500  # Kelvin
    use_sun_matching: bool = True


@dataclass
class RenderSettings:
    """Global Illumination and render settings"""
    gi_method: GIMethod = GIMethod.PATH_TRACING
    samples: int = 128
    max_bounces: int = 4
    diffuse_bounces: int = 2
    glossy_bounces: int = 2
    transmission_bounces: int = 4
    use_denoising: bool = True
    resolution_x: int = 1920
    resolution_y: int = 1080
    resolution_percentage: int = 100


class ThreePointLighting:
    """
    Three-Point Lighting Foundation implementation.
    
    **Key Light**: Primary illumination source (45° angle, dominant intensity)
    **Fill Light**: Shadow softening (opposite key, reduced intensity)
    **Rim/Back Light**: Subject separation from background
    """
    
    def __init__(self, config: ThreePointConfig):
        self.config = config
        self.lights: Dict[str, bpy.types.Object] = {}
    
    def setup(self, target_location: mathutils.Vector = mathutils.Vector((0, 0, 0)),
              camera_direction: mathutils.Vector = mathutils.Vector((0, -1, 0))) -> Dict[str, bpy.types.Object]:
        """
        Setup three-point lighting rig around target.
        
        Args:
            target_location: Center point of the subject
            camera_direction: Direction camera is facing (for relative positioning)
        """
        # Calculate camera right vector
        camera_right = camera_direction.cross(mathutils.Vector((0, 0, 1))).normalized()
        
        # Key Light - Primary illumination at 45°
        key_pos = self._calculate_light_position(
            target_location, camera_direction, camera_right,
            self.config.key_angle, self.config.key_height, 5.0
        )
        
        key_light = self._create_area_light(
            name="Key_Light",
            location=key_pos,
            target=target_location,
            energy=self.config.key_energy,
            color=self.config.key_color,
            size=self.config.key_size
        )
        self.lights['key'] = key_light
        
        # Fill Light - Opposite side, softer
        fill_pos = self._calculate_light_position(
            target_location, camera_direction, camera_right,
            self.config.fill_angle, self.config.fill_height, 5.0
        )
        
        fill_light = self._create_area_light(
            name="Fill_Light",
            location=fill_pos,
            target=target_location,
            energy=self.config.key_energy * self.config.fill_ratio,
            color=self.config.fill_color,
            size=self.config.key_size * 1.5  # Larger for softer shadows
        )
        self.lights['fill'] = fill_light
        
        # Rim Light - Behind subject for separation
        rim_direction = -camera_direction
        rim_pos = target_location + rim_direction * 4.0 + mathutils.Vector((0, 0, 2.0))
        
        rim_light = self._create_area_light(
            name="Rim_Light",
            location=rim_pos,
            target=target_location,
            energy=self.config.key_energy * self.config.rim_ratio,
            color=self.config.rim_color,
            size=self.config.key_size * 0.8
        )
        self.lights['rim'] = rim_light
        
        print(f"✅ Three-point lighting setup complete:")
        print(f"   Key: {key_pos} (energy: {self.config.key_energy})")
        print(f"   Fill: {fill_pos} (energy: {self.config.key_energy * self.config.fill_ratio:.1f})")
        print(f"   Rim: {rim_pos} (energy: {self.config.key_energy * self.config.rim_ratio:.1f})")
        
        return self.lights
    
    def _calculate_light_position(self, target: mathutils.Vector,
                                  cam_dir: mathutils.Vector,
                                  cam_right: mathutils.Vector,
                                  angle: float, height: float, distance: float) -> mathutils.Vector:
        """Calculate light position based on angles relative to camera"""
        # Horizontal rotation
        horizontal = cam_dir * math.cos(angle) + cam_right * math.sin(angle)
        horizontal.normalize()
        
        # Apply height angle
        pos = target + horizontal * distance * math.cos(height)
        pos.z += distance * math.sin(height)
        
        return pos
    
    def _create_area_light(self, name: str, location: mathutils.Vector,
                          target: mathutils.Vector, energy: float,
                          color: Tuple[float, float, float, float],
                          size: float) -> bpy.types.Object:
        """Create area light with specified parameters"""
        # Create light data
        light_data = bpy.data.lights.new(name=name, type='AREA')
        light_data.energy = energy
        light_data.color = color[:3]
        light_data.size = size
        light_data.shape = 'RECTANGLE'
        light_data.size_y = size * 0.5
        light_data.shadow_soft_size = size * 0.1
        
        # Create object
        light_obj = bpy.data.objects.new(name=name, object_data=light_data)
        bpy.context.collection.objects.link(light_obj)
        
        # Position and orient
        light_obj.location = location
        direction = target - location
        rot_quat = direction.to_track_quat('-Z', 'Y')
        light_obj.rotation_euler = rot_quat.to_euler()
        
        return light_obj
    
    def adjust_key_intensity(self, energy: float) -> None:
        """Adjust key light intensity and propagate to fill/rim"""
        if 'key' in self.lights:
            self.lights['key'].data.energy = energy
        if 'fill' in self.lights:
            self.lights['fill'].data.energy = energy * self.config.fill_ratio
        if 'rim' in self.lights:
            self.lights['rim'].data.energy = energy * self.config.rim_ratio


class HDRILighting:
    """
    HDRI Environment Lighting implementation.
    
    Features:
    - High-quality 32-bit HDRI (4K-16K resolution)
    - Dominant light direction alignment
    - Exposure adjustment
    - Color temperature control
    """
    
    def __init__(self, config: HDRIConfig):
        self.config = config
        self.world_shader = None
    
    def setup(self) -> bpy.types.World:
        """Setup HDRI environment lighting"""
        world = bpy.data.worlds.new(name="HDRI_Environment")
        bpy.context.scene.world = world
        world.use_nodes = True
        
        nodes = world.node_tree.nodes
        links = world.node_tree.links
        nodes.clear()
        
        # Environment Texture node
        env_tex = nodes.new('ShaderNodeTexEnvironment')
        env_tex.location = (-300, 0)
        
        # Load HDRI if path provided
        if self.config.hdri_path and Path(self.config.hdri_path).exists():
            img = bpy.data.images.load(self.config.hdri_path, check_existing=True)
            env_tex.image = img
            print(f"✅ Loaded HDRI: {self.config.hdri_path}")
        else:
            # Use default gradient as fallback
            print("⚠️  No HDRI path provided, using default environment")
        
        # Mapping node for rotation
        mapping = nodes.new('ShaderNodeMapping')
        mapping.location = (-500, 0)
        mapping.inputs['Rotation'].default_value[2] = math.radians(self.config.rotation)
        
        # Texture Coordinate node
        tex_coord = nodes.new('ShaderNodeTexCoord')
        tex_coord.location = (-700, 0)
        
        # Background shader
        background = nodes.new('ShaderNodeBackground')
        background.location = (-100, 0)
        background.inputs['Strength'].default_value = self.config.strength
        
        # Apply color temperature adjustment
        if self.config.color_temperature != 6500:
            color = self._kelvin_to_rgb(self.config.color_temperature)
            background.inputs['Color'].default_value = (*color, 1.0)
        
        # Output
        output = nodes.new('ShaderNodeOutputWorld')
        output.location = (100, 0)
        
        # Link nodes
        links.new(tex_coord.outputs['Generated'], mapping.inputs['Vector'])
        links.new(mapping.outputs['Vector'], env_tex.inputs['Vector'])
        links.new(env_tex.outputs['Color'], background.inputs['Color'])
        links.new(background.outputs['Background'], output.inputs['Surface'])
        
        self.world_shader = world
        
        print(f"✅ HDRI environment setup complete:")
        print(f"   Strength: {self.config.strength}")
        print(f"   Rotation: {self.config.rotation}°")
        print(f"   Color Temp: {self.config.color_temperature}K")
        
        return world
    
    def _kelvin_to_rgb(self, kelvin: float) -> Tuple[float, float, float]:
        """Convert color temperature to RGB values"""
        # Approximate Kelvin to RGB conversion
        temp = kelvin / 100.0
        
        # Red
        if temp <= 66:
            red = 255
        else:
            red = 329.698727446 * ((temp - 60) ** -0.1332047592)
            red = max(0, min(255, red))
        
        # Green
        if temp <= 66:
            green = 99.4708025861 * math.log(temp) - 161.1195681661
        else:
            green = 288.1221695283 * ((temp - 60) ** -0.0755148492)
        green = max(0, min(255, green))
        
        # Blue
        if temp >= 66:
            blue = 255
        elif temp <= 19:
            blue = 0
        else:
            blue = 138.5177312231 * math.log(temp - 10) - 305.0447927307
            blue = max(0, min(255, blue))
        
        return (red / 255, green / 255, blue / 255)
    
    def rotate_hdri(self, degrees: float) -> None:
        """Rotate HDRI environment"""
        if self.world_shader and self.world_shader.use_nodes:
            nodes = self.world_shader.node_tree.nodes
            mapping = nodes.get("Mapping")
            if mapping:
                mapping.inputs['Rotation'].default_value[2] = math.radians(degrees)
                self.config.rotation = degrees


class GlobalIlluminationSetup:
    """
    Global Illumination technique configuration.
    
    Supports:
    - Path Tracing (Highest quality, slowest)
    - Brute Force GI (High quality, slow)
    - Irradiance Cache (Medium, faster)
    - Light Cache (Fast preview)
    - Real-Time GI (Eevee)
    """
    
    def __init__(self, config: RenderSettings):
        self.config = config
    
    def configure(self) -> None:
        """Configure render engine and GI settings"""
        scene = bpy.context.scene
        
        if self.config.gi_method == GIMethod.REALTIME:
            self._configure_eevee()
        else:
            self._configure_cycles()
        
        # Common settings
        scene.render.resolution_x = self.config.resolution_x
        scene.render.resolution_y = self.config.resolution_y
        scene.render.resolution_percentage = self.config.resolution_percentage
        
        print(f"✅ Render settings configured: {self.config.gi_method.value}")
        print(f"   Samples: {self.config.samples}")
        print(f"   Resolution: {self.config.resolution_x}x{self.config.resolution_y}")
    
    def _configure_cycles(self) -> None:
        """Configure Cycles render engine"""
        scene = bpy.context.scene
        scene.render.engine = 'CYCLES'
        
        # Device (GPU if available)
        scene.cycles.device = 'GPU' if bpy.context.preferences.addons[
            'cycles'
        ].preferences.has_active_device() else 'CPU'
        
        # GI Method
        if self.config.gi_method == GIMethod.PATH_TRACING:
            scene.cycles.progressive = 'PATH'
        elif self.config.gi_method == GIMethod.BRUTE_FORCE:
            scene.cycles.use_fast_gi = False
        
        # Samples
        scene.cycles.samples = self.config.samples
        scene.cycles.preview_samples = min(self.config.samples // 4, 32)
        
        # Bounces
        scene.cycles.max_bounces = self.config.max_bounces
        scene.cycles.diffuse_bounces = self.config.diffuse_bounces
        scene.cycles.glossy_bounces = self.config.glossy_bounces
        scene.cycles.transmission_bounces = self.config.transmission_bounces
        
        # Denoising
        scene.cycles.use_denoising = self.config.use_denoising
        scene.cycles.denoiser = 'OPTIX' if scene.cycles.device == 'GPU' else 'OPENIMAGEDENOISE'
    
    def _configure_eevee(self) -> None:
        """Configure Eevee render engine for real-time"""
        scene = bpy.context.scene
        scene.render.engine = 'BLENDER_EEVEE_NEXT'
        
        # GI settings
        scene.eevee.use_gi = True
        scene.eevee.gi_cache_size = '2048'
        
        # Screen space reflections
        scene.eevee.use_ssr = True
        scene.eevee.ssr_quality = 1.0
        
        # Shadows
        scene.eevee.shadow_ray_count = 4
        scene.eevee.shadow_step_count = 12
        
        # Bloom for emissive materials
        scene.eevee.use_bloom = True
        scene.eevee.bloom_intensity = 0.05


class VolumetricLighting:
    """
    Volumetric and Practical lighting techniques.
    
    Features:
    - God rays and atmospheric scattering
    - Light shafts
    - Emissive geometry as light sources
    - Area lights for soft shadows
    """
    
    def __init__(self):
        self.volumes: List[bpy.types.Object] = []
    
    def add_volumetric_cube(self, name: str = "Volume_Scattering",
                           location: mathutils.Vector = mathutils.Vector((0, 0, 0)),
                           size: float = 5.0,
                           density: float = 0.1) -> bpy.types.Object:
        """Add volumetric scattering cube for atmospheric effects"""
        # Create cube
        bpy.ops.mesh.primitive_cube_add(size=size, location=location)
        volume_obj = bpy.context.active_object
        volume_obj.name = name
        
        # Create volume material
        mat = bpy.data.materials.new(name=f"{name}_Material")
        mat.use_nodes = True
        nodes = mat.node_tree.nodes
        links = mat.node_tree.links
        nodes.clear()
        
        # Volume scatter shader
        volume_scatter = nodes.new('ShaderNodeVolumeScatter')
        volume_scatter.location = (0, 0)
        volume_scatter.inputs['Density'].default_value = density
        volume_scatter.inputs['Color'].default_value = (1.0, 1.0, 1.0, 1.0)
        
        # Output
        output = nodes.new('ShaderNodeOutputMaterial')
        output.location = (200, 0)
        
        links.new(volume_scatter.outputs['Volume'], output.inputs['Volume'])
        
        # Assign material
        volume_obj.data.materials.append(mat)
        
        self.volumes.append(volume_obj)
        print(f"✅ Volumetric cube added: {name} (density: {density})")
        
        return volume_obj
    
    def create_emissive_plane(self, name: str, location: mathutils.Vector,
                             size: float, energy: float,
                             color: Tuple[float, float, float, float] = (1.0, 1.0, 1.0, 1.0),
                             target: Optional[mathutils.Vector] = None) -> bpy.types.Object:
        """Create emissive geometry as a practical light source"""
        # Create plane
        bpy.ops.mesh.primitive_plane_add(size=size, location=location)
        light_obj = bpy.context.active_object
        light_obj.name = name
        
        # Orient toward target if provided
        if target:
            direction = target - location
            rot_quat = direction.to_track_quat('-Z', 'Y')
