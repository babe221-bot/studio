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
