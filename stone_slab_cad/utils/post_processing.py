"""
Post-Processing Techniques System

Implements color grading pipelines, post-processing effects, and render validation
for professional 3D stone slab visualization.
"""
import bpy
import mathutils
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
import math


class ColorGradingMode(Enum):
    """Color grading workflow modes"""
    PRIMARY_ONLY = "primary_only"
    FULL_PIPELINE = "full_pipeline"
    LOOK_DEVELOPMENT = "look_development"
    CUSTOM = "custom"


class LUTType(Enum):
    """Types of Look-Up Tables for color grading"""
    FILM_EMULATION = "film_emulation"
    CINEMATIC = "cinematic"
    VINTAGE = "vintage"
    BLEACH_BYPASS = "bleach_bypass"
    CROSS_PROCESS = "cross_process"
    DAY_FOR_NIGHT = "day_for_night"
    CUSTOM = "custom"


class ToneMappingType(Enum):
    """Tone mapping algorithms"""
    REINHARD = "reinhard"
    FILMIC = "filmic"
    ACES = "aces"
    AGX = "agx"
    RAW = "raw"


class PostEffectType(Enum):
    """Post-processing effect types"""
    BLOOM = "bloom"
    SSAO = "ssao"
    MOTION_BLUR = "motion_blur"
    CHROMATIC_ABERRATION = "chromatic_aberration"
    VIGNETTE = "vignette"
    SHARPNESS = "sharpness"
    FILM_GRAIN = "film_grain"


@dataclass
class WhiteBalanceConfig:
    """White balance correction settings"""
    temperature: float = 6500.0  # Kelvin
    tint: float = 0.0  # Green (-) to Magenta (+)
    
    
@dataclass
class ExposureConfig:
    """Exposure and contrast settings"""
    exposure: float = 0.0  # EV stops
    contrast: float = 0.0  # -1 to 1
    highlights: float = 0.0  # -1 to 1
    shadows: float = 0.0  # -1 to 1
    whites: float = 0.0  # -1 to 1
    blacks: float = 0.0  # -1 to 1


@dataclass
class SaturationConfig:
    """Saturation and vibrance settings"""
    saturation: float = 1.0  # 0 to 2
    vibrance: float = 0.0  # -1 to 1 (preserves skin tones)


@dataclass
class ColorBalanceConfig:
    """Color balance for shadows, midtones, highlights"""
    # Shadows (RGB adjustments)
    shadows: Tuple[float, float, float] = (0.0, 0.0, 0.0)
    # Midtones (RGB adjustments)
    midtones: Tuple[float, float, float] = (0.0, 0.0, 0.0)
    # Highlights (RGB adjustments)
    highlights: Tuple[float, float, float] = (0.0, 0.0, 0.0)
    # Preserve luminosity
    preserve_luminosity: bool = True


@dataclass
class CurvesConfig:
    """Curve-based color corrections"""
    # Master curve (RGB combined)
    master_curve: List[Tuple[float, float]] = field(default_factory=list)
    # Red curve
    red_curve: List[Tuple[float, float]] = field(default_factory=list)
    # Green curve
    green_curve: List[Tuple[float, float]] = field(default_factory=list)
    # Blue curve
    blue_curve: List[Tuple[float, float]] = field(default_factory=list)
    # Hue vs Hue curve (hue shifts)
    hue_vs_hue: Dict[float, float] = field(default_factory=dict)
    # Hue vs Saturation curve
    hue_vs_sat: Dict[float, float] = field(default_factory=dict)
    # Luma vs Saturation curve
    luma_vs_sat: Dict[float, float] = field(default_factory=dict)


@dataclass
class SplitToningConfig:
    """Split toning for shadows and highlights"""
    shadows_color: Tuple[float, float, float] = (0.5, 0.5, 0.5)
    shadows_amount: float = 0.0  # 0 to 1
    highlights_color: Tuple[float, float, float] = (0.5, 0.5, 0.5)
    highlights_amount: float = 0.0  # 0 to 1
    balance: float = 0.5  # 0 = more shadows, 1 = more highlights


@dataclass
class FilmGrainConfig:
    """Film grain settings"""
    intensity: float = 0.0  # 0 to 1
    size: float = 1.0  # Grain particle size
    roughness: float = 0.5  # 0 to 1


@dataclass
class BloomConfig:
    """Bloom/glow effect settings"""
    intensity: float = 0.1  # 0 to 1 (keep subtle)
    radius: float = 0.5  # Bloom spread
    threshold: float = 0.8  # Brightness threshold
    clamp: float = 1.0  # Maximum bloom intensity


@dataclass
class SSAOConfig:
    """Screen Space Ambient Occlusion settings"""
    enabled: bool = True
    distance: float = 0.5  # AO radius
    factor: float = 0.5  # AO strength
    quality: str = "medium"  # low, medium, high
    blend: float = 0.3  # Blend opacity (keep low)


@dataclass
class MotionBlurConfig:
    """Motion blur settings"""
    enabled: bool = False
    shutter_speed: float = 0.5  # Shutter angle factor (0-1)
    samples: int = 8  # Sample count


@dataclass
class ChromaticAberrationConfig:
    """Chromatic aberration settings"""
    enabled: bool = False
    intensity: float = 0.01  # Keep minimal (0-0.05)


@dataclass
class VignetteConfig:
    """Vignette effect settings"""
    enabled: bool = False
    intensity: float = 0.3  # 0 to 1
    roundness: float = 0.5  # 0 = square, 1 = round
    feather: float = 0.5  # Edge softness
    midpoint: float = 0.5  # Falloff center


@dataclass
class SharpenConfig:
    """Sharpening filter settings"""
    enabled: bool = False
    intensity: float = 0.5  # 0 to 1
    radius: float = 1.0  # Sample radius


@dataclass
class ColorGradingConfig:
    """Complete color grading configuration"""
    mode: ColorGradingMode = ColorGradingMode.FULL_PIPELINE
    tone_mapping: ToneMappingType = ToneMappingType.FILMIC
    white_balance: WhiteBalanceConfig = field(default_factory=WhiteBalanceConfig)
    exposure: ExposureConfig = field(default_factory=ExposureConfig)
    saturation: SaturationConfig = field(default_factory=SaturationConfig)
    color_balance: ColorBalanceConfig = field(default_factory=ColorBalanceConfig)
    curves: CurvesConfig = field(default_factory=CurvesConfig)
    split_toning: SplitToningConfig = field(default_factory=SplitToningConfig)
    film_grain: FilmGrainConfig = field(default_factory=FilmGrainConfig)
    lut_type: Optional[LUTType] = None
    lut_strength: float = 1.0


@dataclass
class PostProcessingConfig:
    """Complete post-processing configuration"""
    color_grading: ColorGradingConfig = field(default_factory=ColorGradingConfig)
    bloom: BloomConfig = field(default_factory=BloomConfig)
    ssao: SSAOConfig = field(default_factory=SSAOConfig)
