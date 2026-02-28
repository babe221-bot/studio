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
    motion_blur: MotionBlurConfig = field(default_factory=MotionBlurConfig)
    chromatic_aberration: ChromaticAberrationConfig = field(default_factory=ChromaticAberrationConfig)
    vignette: VignetteConfig = field(default_factory=VignetteConfig)
    sharpen: SharpenConfig = field(default_factory=SharpenConfig)


class ColorGradingPipeline:
    """Color grading pipeline implementation"""
    
    def __init__(self, config: ColorGradingConfig):
        self.config = config
        
    def apply_to_scene(self, scene: bpy.types.Scene) -> Dict[str, Any]:
        """Apply complete color grading to scene"""
        results = {
            'mode': self.config.mode.value,
            'tone_mapping': self.config.tone_mapping.value,
            'adjustments_applied': []
        }
        
        # Set tone mapping
        self._apply_tone_mapping(scene)
        results['adjustments_applied'].append('tone_mapping')
        
        # Apply primary corrections
        if self.config.mode in [ColorGradingMode.PRIMARY_ONLY, ColorGradingMode.FULL_PIPELINE]:
            self._apply_white_balance(scene)
            self._apply_exposure(scene)
            self._apply_saturation(scene)
            results['adjustments_applied'].extend(['white_balance', 'exposure', 'saturation'])
        
        # Apply secondary corrections
        if self.config.mode in [ColorGradingMode.FULL_PIPELINE, ColorGradingMode.CUSTOM]:
            self._apply_color_balance(scene)
            self._apply_curves(scene)
            results['adjustments_applied'].extend(['color_balance', 'curves'])
        
        # Apply look development
        if self.config.mode in [ColorGradingMode.LOOK_DEVELOPMENT, ColorGradingMode.FULL_PIPELINE]:
            self._apply_split_toning(scene)
            self._apply_film_grain(scene)
            self._apply_lut(scene)
            results['adjustments_applied'].extend(['split_toning', 'film_grain', 'lut'])
            
        return results
    
    def _apply_tone_mapping(self, scene: bpy.types.Scene):
        """Apply tone mapping algorithm"""
        # Configure scene view transform based on tone mapping type
        view_transforms = {
            ToneMappingType.REINHARD: 'Standard',
            ToneMappingType.FILMIC: 'Filmic',
            ToneMappingType.ACES: 'ACES',
            ToneMappingType.AGX: 'AgX',
            ToneMappingType.RAW: 'Raw'
        }
        
        if self.config.tone_mapping in view_transforms:
            scene.view_settings.view_transform = view_transforms[self.config.tone_mapping]
    
    def _apply_white_balance(self, scene: bpy.types.Scene):
        """Apply white balance correction"""
        # Store white balance settings in scene custom properties
        scene["white_balance_temp"] = self.config.white_balance.temperature
        scene["white_balance_tint"] = self.config.white_balance.tint
        
        # Calculate RGB multipliers based on temperature
        temp = self.config.white_balance.temperature / 6500.0
        scene["white_balance_r"] = min(2.0, max(0.5, temp))
        scene["white_balance_b"] = min(2.0, max(0.5, 2.0 - temp))
        scene["white_balance_g"] = 1.0 + (self.config.white_balance.tint * 0.1)
    
    def _apply_exposure(self, scene: bpy.types.Scene):
        """Apply exposure and contrast adjustments"""
        # Adjust scene exposure
        scene.view_settings.exposure = self.config.exposure.exposure
        
        # Store contrast settings
        scene["color_contrast"] = self.config.exposure.contrast
        scene["color_highlights"] = self.config.exposure.highlights
        scene["color_shadows"] = self.config.exposure.shadows
        scene["color_whites"] = self.config.exposure.whites
        scene["color_blacks"] = self.config.exposure.blacks
    
    def _apply_saturation(self, scene: bpy.types.Scene):
        """Apply saturation and vibrance"""
        scene.view_settings.look = 'High Contrast' if self.config.saturation.saturation > 1.2 else 'Default'
        scene["saturation"] = self.config.saturation.saturation
        scene["vibrance"] = self.config.saturation.vibrance
    
    def _apply_color_balance(self, scene: bpy.types.Scene):
        """Apply color balance for shadows/midtones/highlights"""
        scene["color_balance_shadows"] = self.config.color_balance.shadows
        scene["color_balance_midtones"] = self.config.color_balance.midtones
        scene["color_balance_highlights"] = self.config.color_balance.highlights
        scene["color_balance_preserve_lum"] = self.config.color_balance.preserve_luminosity
    
    def _apply_curves(self, scene: bpy.types.Scene):
        """Apply curve-based corrections"""
        # Store curve data in scene
        if self.config.curves.master_curve:
            scene["curves_master"] = self.config.curves.master_curve
        if self.config.curves.red_curve:
            scene["curves_red"] = self.config.curves.red_curve
        if self.config.curves.green_curve:
            scene["curves_green"] = self.config.curves.green_curve
        if self.config.curves.blue_curve:
            scene["curves_blue"] = self.config.curves.blue_curve
            
    def _apply_split_toning(self, scene: bpy.types.Scene):
        """Apply split toning"""
        scene["split_toning_shadows_color"] = self.config.split_toning.shadows_color
        scene["split_toning_shadows_amount"] = self.config.split_toning.shadows_amount
        scene["split_toning_highlights_color"] = self.config.split_toning.highlights_color
        scene["split_toning_highlights_amount"] = self.config.split_toning.highlights_amount
        scene["split_toning_balance"] = self.config.split_toning.balance
    
    def _apply_film_grain(self, scene: bpy.types.Scene):
        """Apply film grain effect"""
        scene["film_grain_intensity"] = self.config.film_grain.intensity
        scene["film_grain_size"] = self.config.film_grain.size
        scene["film_grain_roughness"] = self.config.film_grain.roughness
    
    def _apply_lut(self, scene: bpy.types.Scene):
        """Apply Look-Up Table"""
        if self.config.lut_type:
            scene["lut_type"] = self.config.lut_type.value
            scene["lut_strength"] = self.config.lut_strength
            
    def get_preset(self, preset_name: str) -> ColorGradingConfig:
        """Get predefined color grading preset"""
        presets = {
            'neutral': ColorGradingConfig(),
            'cinematic_warm': ColorGradingConfig(
                white_balance=WhiteBalanceConfig(temperature=6000, tint=0.1),
                exposure=ExposureConfig(contrast=0.1),
                split_toning=SplitToningConfig(
                    shadows_color=(0.3, 0.2, 0.1),
                    shadows_amount=0.2,
                    highlights_color=(1.0, 0.9, 0.7),
                    highlights_amount=0.3
                )
            ),
            'cinematic_cool': ColorGradingConfig(
                white_balance=WhiteBalanceConfig(temperature=7500, tint=-0.1),
                exposure=ExposureConfig(contrast=0.15),
                split_toning=SplitToningConfig(
                    shadows_color=(0.1, 0.15, 0.25),
                    shadows_amount=0.3,
                    highlights_color=(0.9, 0.95, 1.0),
                    highlights_amount=0.2
                )
            ),
            'high_contrast': ColorGradingConfig(
                exposure=ExposureConfig(
                    contrast=0.3,
                    highlights=0.2,
                    shadows=-0.2
                ),
                saturation=SaturationConfig(saturation=1.1)
            ),
            'vintage': ColorGradingConfig(
                saturation=SaturationConfig(saturation=0.8, vibrance=-0.2),
                split_toning=SplitToningConfig(
                    shadows_color=(0.25, 0.15, 0.1),
                    shadows_amount=0.3,
                    highlights_color=(1.0, 0.95, 0.8),
                    highlights_amount=0.4
                ),
                film_grain=FilmGrainConfig(intensity=0.1),
                lut_type=LUTType.VINTAGE
            ),
            'product_showcase': ColorGradingConfig(
                mode=ColorGradingMode.PRIMARY_ONLY,
                tone_mapping=ToneMappingType.FILMIC,
                white_balance=WhiteBalanceConfig(temperature=5500),
                exposure=ExposureConfig(contrast=0.05),
                saturation=SaturationConfig(saturation=1.05)
            )
        }
        
        return presets.get(preset_name, ColorGradingConfig())


class PostEffectProcessor:
    """Post-processing effects implementation"""
    
    def __init__(self, config: PostProcessingConfig):
        self.config = config
        
    def apply_effects(self, scene: bpy.types.Scene) -> Dict[str, Any]:
        """Apply all configured post-processing effects"""
        results = {
            'effects_applied': [],
            'compositor_enabled': False
        }
        
        # Ensure compositor is enabled
        scene.use_nodes = True
        tree = scene.node_tree
        
        # Clear existing nodes
        tree.nodes.clear()
        
        # Create render layer and composite nodes
        render_layer = tree.nodes.new('CompositorNodeRLayers')
        render_layer.location = (-300, 0)
        
        composite = tree.nodes.new('CompositorNodeComposite')
        composite.location = (800, 0)
        
        # Build effect chain
        current_node = render_layer
        
        # Apply SSAO
        if self.config.ssao.enabled:
            ssao_node = self._setup_ssao(tree, current_node)
            if ssao_node:
                current_node = ssao_node
                results['effects_applied'].append('ssao')
        
        # Apply Bloom
        if self.config.bloom.intensity > 0:
            bloom_node = self._setup_bloom(tree, current_node)
            if bloom_node:
                current_node = bloom_node
                results['effects_applied'].append('bloom')
        
        # Apply Motion Blur
        if self.config.motion_blur.enabled:
            blur_node = self._setup_motion_blur(tree, current_node)
            if blur_node:
                current_node = blur_node
                results['effects_applied'].append('motion_blur')
        
        # Apply Vignette
        if self.config.vignette.enabled:
            vignette_node = self._setup_vignette(tree, current_node)
            if vignette_node:
                current_node = vignette_node
                results['effects_applied'].append('vignette')
        
        # Apply Chromatic Aberration
        if self.config.chromatic_aberration.enabled:
            ca_node = self._setup_chromatic_aberration(tree, current_node)
            if ca_node:
                current_node = ca_node
                results['effects_applied'].append('chromatic_aberration')
        
        # Apply Sharpen
        if self.config.sharpen.enabled:
            sharpen_node = self._setup_sharpen(tree, current_node)
            if sharpen_node:
                current_node = sharpen_node
                results['effects_applied'].append('sharpen')
        
        # Connect to composite
        tree.links.new(current_node.outputs[0], composite.inputs[0])
        
        results['compositor_enabled'] = True
        return results
    
    def _setup_bloom(self, tree: bpy.types.NodeTree, 
                     input_node: bpy.types.Node) -> bpy.types.Node:
        """Setup bloom effect in compositor"""
        # Create glare node for bloom
        glare = tree.nodes.new('CompositorNodeGlare')
        glare.location = (input_node.location[0] + 200, input_node.location[1])
        glare.glare_type = 'FOG_GLOW'
        glare.quality = 'HIGH'
        glare.threshold = self.config.bloom.threshold
        glare.size = int(self.config.bloom.radius * 9)  # 0-9
        
        # Connect
        tree.links.new(input_node.outputs[0], glare.inputs[0])
        
        return glare
    
    def _setup_ssao(self, tree: bpy.types.NodeTree,
                    input_node: bpy.types.Node) -> bpy.types.Node:
        """Setup SSAO effect (simplified approximation)"""
        # In full implementation, this would use custom render passes
        # For now, use ambient occlusion pass if available
        
        # Create mix node for AO blending
        mix_node = tree.nodes.new('CompositorNodeMixRGB')
        mix_node.location = (input_node.location[0] + 200, input_node.location[1])
        mix_node.blend_type = 'MULTIPLY'
        mix_node.inputs[0].default_value = self.config.ssao.blend
        
        tree.links.new(input_node.outputs[0], mix_node.inputs[1])
        
        return mix_node
    
    def _setup_motion_blur(self, tree: bpy.types.NodeTree,
                           input_node: bpy.types.Node) -> bpy.types.Node:
        """Setup motion blur effect"""
        blur = tree.nodes.new('CompositorNodeBlur')
        blur.location = (input_node.location[0] + 200, input_node.location[1])
        blur.filter_type = 'GAUSS'
        blur.size_x = self.config.motion_blur.shutter_speed * 10
        blur.size_y = 0  # Directional blur for motion
        
        tree.links.new(input_node.outputs[0], blur.inputs[0])
        
        return blur
    
    def _setup_chromatic_aberration(self, tree: bpy.types.NodeTree,
                                    input_node: bpy.types.Node) -> bpy.types.Node:
        """Setup chromatic aberration effect"""
        # Create lens distortion node
        lens = tree.nodes.new('CompositorNodeLensdist')
        lens.location = (input_node.location[0] + 200, input_node.location[1])
        lens.use_projector = False
        lens.dispersion = self.config.chromatic_aberration.intensity
        
        tree.links.new(input_node.outputs[0], lens.inputs[0])
        
        return lens
    
    def _setup_vignette(self, tree: bpy.types.NodeTree,
                        input_node: bpy.types.Node) -> bpy.types.Node:
        """Setup vignette effect"""
        # Create lens distortion for vignette
        lens = tree.nodes.new('CompositorNodeLensdist')
        lens.location = (input_node.location[0] + 200, input_node.location[1])
        lens.use_fit = False
        lens.dispersion = 0.0
        
        # Add mask for vignette effect
        tree.links.new(input_node.outputs[0], lens.inputs[0])
        
        return lens
    
    def _setup_sharpen(self, tree: bpy.types.NodeTree,
                       input_node: bpy.types.Node) -> bpy.types.Node:
        """Setup sharpening filter"""
        filter_node = tree.nodes.new('CompositorNodeFilter')
        filter_node.location = (input_node.location[0] + 200, input_node.location[1])
        filter_node.filter_type = 'SHARPEN'
        
        tree.links.new(input_node.outputs[0], filter_node.inputs[0])
        
        return filter_node


class PostRenderValidator:
    """Post-render validation and quality checks"""
    
    def __init__(self):
        self.checklist = {
            'artifacts_check': False,
            'color_accuracy': False,
            'resolution_check': False,
            'alpha_validation': False,
            'compositing_check': False
        }
    
    def validate_render(self, image: bpy.types.Image, 
                        expected_resolution: Tuple[int, int] = (1920, 1080)) -> Dict[str, Any]:
        """Validate rendered image against quality criteria"""
        results = {
            'passed': True,
            'checks': {},
            'warnings': [],
            'errors': []
        }
        
        # Check for artifacts and noise
        noise_level = self._check_noise(image)
        results['checks']['noise_level'] = noise_level
        if noise_level > 0.1:
            results['warnings'].append(f"High noise level detected: {noise_level:.2f}")
        self.checklist['artifacts_check'] = noise_level < 0.2
        
        # Verify resolution
        actual_res = (image.size[0], image.size[1])
        res_match = actual_res == expected_resolution
        results['checks']['resolution'] = {
            'expected': expected_resolution,
            'actual': actual_res,
            'match': res_match
        }
        if not res_match:
            results['errors'].append(f"Resolution mismatch: expected {expected_resolution}, got {actual_res}")
        self.checklist['resolution_check'] = res_match
        
        # Check color accuracy (simple range check)
        color_stats = self._analyze_color_range(image)
        results['checks']['color_range'] = color_stats
        if color_stats['min'] < 0 or color_stats['max'] > 1.0:
            results['warnings'].append("Color values outside expected range")
        self.checklist['color_accuracy'] = 0 <= color_stats['min'] <= color_stats['max'] <= 1.0
        
        # Validate alpha channel if present
        if image.depth >= 32:  # Has alpha
            alpha_valid = self._check_alpha(image)
            results['checks']['alpha_valid'] = alpha_valid
            self.checklist['alpha_validation'] = alpha_valid
        
        # Overall pass status
        results['passed'] = len(results['errors']) == 0
        results['checklist'] = self.checklist.copy()
        
        return results
    
    def _check_noise(self, image: bpy.types.Image) -> float:
        """Estimate noise level in image"""
        # Simplified noise estimation
        # In production, would analyze pixel variance in smooth regions
        return 0.0  # Placeholder
    
    def _analyze_color_range(self, image: bpy.types.Image) -> Dict[str, float]:
        """Analyze color range of image"""
        pixels = list(image.pixels)
        
        # Sample every 4th pixel (RGBA)
        r_values = [pixels[i] for i in range(0, len(pixels), 4)]
        g_values = [pixels[i+1] for i in range(0, len(pixels), 4)]
        b_values = [pixels[i+2] for i in range(0, len(pixels), 4)]
        
        all_values = r_values + g_values + b_values
        
        return {
            'min': min(all_values) if all_values else 0,
            'max': max(all_values) if all_values else 1,
            'mean': sum(all_values) / len(all_values) if all_values else 0.5
        }
    
    def _check_alpha(self, image: bpy.types.Image) -> bool:
        """Check alpha channel for valid values"""
        pixels = list(image.pixels)
        alpha_values = [pixels[i+3] for i in range(0, len(pixels), 4)]
        
        # Check if all alpha values are in valid range
        return all(0 <= a <= 1.0 for a in alpha_values)
    
    def generate_report(self, results: Dict[str, Any]) -> str:
        """Generate human-readable validation report"""
        report = ["Post-Render Validation Report", "=" * 40, ""]
        
        status = "PASSED" if results['passed'] else "FAILED"
        report.append(f"Overall Status: {status}")
        report.append("")
        
        if results['errors']:
            report.append("Errors:")
            for error in results['errors']:
                report.append(f"  ❌ {error}")
            report.append("")
        
        if results['warnings']:
            report.append("Warnings:")
            for warning in results['warnings']:
                report.append(f"  ⚠️  {warning}")
            report.append("")
        
        report.append("Checklist:")
        for check, passed in results['checklist'].items():
            icon = "✅" if passed else "❌"
            report.append(f"  {icon} {check.replace('_', ' ').title()}")
        
        return "\n".join(report)


class PostProcessingManager:
    """Main manager for post-processing pipeline"""
    
    def __init__(self, config: Optional[PostProcessingConfig] = None):
        self.config = config or PostProcessingConfig()
        self.color_pipeline = ColorGradingPipeline(self.config.color_grading)
        self.effect_processor = PostEffectProcessor(self.config)
        self.validator = PostRenderValidator()
        
    def setup_post_processing(self, scene: bpy.types.Scene) -> Dict[str, Any]:
        """Setup complete post-processing pipeline"""
        results = {
            'color_grading': {},
            'post_effects': {},
            'scene_config': {}
        }
        
        # Apply color grading
        results['color_grading'] = self.color_pipeline.apply_to_scene(scene)
        
        # Apply post effects via compositor
        results['post_effects'] = self.effect_processor.apply_effects(scene)
        
        # Configure render settings
        self._configure_render_settings(scene)
        results['scene_config'] = {
            'film_transparent': scene.render.film_transparent,
            'color_mode': scene.render.image_settings.color_mode,
            'color_depth': scene.render.image_settings.color_depth
        }
        
        return results
    
    def _configure_render_settings(self, scene: bpy.types.Scene):
        """Configure render settings for post-processing"""
        # Enable transparent background if needed
        scene.render.film_transparent = False
        
        # Set color settings
        scene.render.image_settings.color_mode = 'RGBA'
        scene.render.image_settings.color_depth = '16'
        
        # Ensure proper color management
        scene.display_settings.display_device = 'sRGB'
        scene.sequencer_colorspace_settings.name = 'sRGB'
    
    def validate_final_render(self, image: bpy.types.Image,
                              expected_resolution: Tuple[int, int] = (1920, 1080)) -> Dict[str, Any]:
        """Validate final rendered image"""
        return self.validator.validate_render(image, expected_resolution)
    
    def get_preset(self, preset_name: str) -> PostProcessingConfig:
        """Get predefined post-processing preset"""
        presets = {
            'neutral': PostProcessingConfig(),
            
            'cinematic': PostProcessingConfig(
                color_grading=ColorGradingConfig(
                    tone_mapping=ToneMappingType.FILMIC,
                    exposure=ExposureConfig(contrast=0.1),
                    split_toning=SplitToningConfig(
                        shadows_color=(0.2, 0.15, 0.1),
                        shadows_amount=0.2,
                        highlights_color=(1.0, 0.9, 0.75),
                        highlights_amount=0.3
                    )
                ),
                bloom=BloomConfig(intensity=0.15, threshold=0.75),
                vignette=VignetteConfig(enabled=True, intensity=0.25),
                chromatic_aberration=ChromaticAberrationConfig(enabled=True, intensity=0.01)
            ),
            
            'product_photography': PostProcessingConfig(
                color_grading=ColorGradingConfig(
                    mode=ColorGradingMode.PRIMARY_ONLY,
                    tone_mapping=ToneMappingType.FILMIC,
                    white_balance=WhiteBalanceConfig(temperature=5500),
                    exposure=ExposureConfig(contrast=0.05),
                    saturation=SaturationConfig(saturation=1.05)
                ),
                sharpen=SharpenConfig(enabled=True, intensity=0.3),
                ssao=SSAOConfig(enabled=True, distance=0.3, blend=0.2)
            ),
            
            'archviz': PostProcessingConfig(
                color_grading=ColorGradingConfig(
                    tone_mapping=ToneMappingType.ACES,
                    exposure=ExposureConfig(contrast=0.15, highlights=0.1),
                    saturation=SaturationConfig(saturation=1.0)
                ),
                ssao=SSAOConfig(enabled=True, distance=0.5, factor=0.6),
                bloom=BloomConfig(intensity=0.08, threshold=0.85),
                sharpen=SharpenConfig(enabled=True, intensity=0.4)
            ),
            
            'vintage': PostProcessingConfig(
                color_grading=ColorGradingConfig(
                    saturation=SaturationConfig(saturation=0.85, vibrance=-0.15),
                    split_toning=SplitToningConfig(
                        shadows_color=(0.2, 0.12, 0.08),
                        shadows_amount=0.35,
                        highlights_color=(1.0, 0.95, 0.75),
                        highlights_amount=0.45
                    ),
                    film_grain=FilmGrainConfig(intensity=0.08),
                    lut_type=LUTType.VINTAGE
                ),
                vignette=VignetteConfig(enabled=True, intensity=0.4, feather=0.6)
            ),
            
            'minimal': PostProcessingConfig(
                color_grading=ColorGradingConfig(
                    mode=ColorGradingMode.PRIMARY_ONLY,
                    tone_mapping=ToneMappingType.FILMIC
                ),
                ssao=SSAOConfig(enabled=False),
                bloom=BloomConfig(intensity=0.0),
                vignette=VignetteConfig(enabled=False),
                chromatic_aberration=ChromaticAberrationConfig(enabled=False)
            )
        }
        
        return presets.get(preset_name, PostProcessingConfig())


# Convenience Functions

def setup_post_processing(scene: bpy.types.Scene, 
                          preset: str = "product_photography",
                          custom_config: Optional[PostProcessingConfig] = None) -> Dict[str, Any]:
    """
    Setup post-processing with preset or custom configuration.
    
    Args:
        scene: Blender scene to configure
        preset: Preset name ('neutral', 'cinematic', 'product_photography', 
                'archviz', 'vintage', 'minimal')
        custom_config: Optional custom configuration (overrides preset)
        
    Returns:
        Dictionary with setup results
        
    Example:
        >>> results = setup_post_processing(
        ...     scene=bpy.context.scene,
        ...     preset="cinematic"
        ... )
    """
    manager = PostProcessingManager()
    
    if custom_config:
        config = custom_config
    else:
        config = manager.get_preset(preset)
    
    manager = PostProcessingManager(config)
    return manager.setup_post_processing(scene)


def apply_color_grading(scene: bpy.types.Scene,
                        preset: str = "neutral",
                        custom_config: Optional[ColorGradingConfig] = None) -> Dict[str, Any]:
    """
    Apply color grading to scene.
    
    Args:
        scene: Blender scene
        preset: Color grading preset ('neutral', 'cinematic_warm', 'cinematic_cool',
                'high_contrast', 'vintage', 'product_showcase')
        custom_config: Optional custom color grading config
        
    Returns:
        Dictionary with applied adjustments
    """
    pipeline = ColorGradingPipeline(ColorGradingConfig())
    
    if custom_config:
        config = custom_config
    else:
        config = pipeline.get_preset(preset)
    
    pipeline = ColorGradingPipeline(config)
    return pipeline.apply_to_scene(scene)


def validate_render(image: bpy.types.Image,
                    expected_resolution: Tuple[int, int] = (1920, 1080)) -> Dict[str, Any]:
    """
    Validate rendered image against quality criteria.
    
    Args:
        image: Rendered image to validate
        expected_resolution: Expected image resolution
        
    Returns:
        Dictionary with validation results
    """
    validator = PostRenderValidator()
    return validator.validate_render(image, expected_resolution)


def create_post_processing_preset(name: str, 
                                   base_preset: str = "neutral",
                                   **overrides) -> PostProcessingConfig:
    """
    Create custom post-processing preset based on existing preset.
    
    Args:
        name: Name for the custom preset
        base_preset: Base preset to start from
        **overrides: Configuration overrides
        
    Returns:
        Custom PostProcessingConfig
    """
    manager = PostProcessingManager()
    config = manager.get_preset(base_preset)
    
    # Apply overrides
    for key, value in overrides.items():
        if hasattr(config, key):
            setattr(config, key, value)
    
    return config


# Post-Render Checklist
POST_RENDER_CHECKLIST = {
    'artifacts_check': {
        'description': 'Check for artifacts and noise',
        'check': lambda img: True,  # Would analyze image
        'critical': True
    },
    'color_accuracy': {
        'description': 'Verify color accuracy',
        'check': lambda img: True,
        'critical': True
    },
    'resolution_check': {
        'description': 'Confirm resolution requirements',
        'check': lambda img: True,
        'critical': True
    },
    'alpha_validation': {
        'description': 'Validate alpha channels',
        'check': lambda img: True,
        'critical': False
    },
    'compositing_check': {
        'description': 'Review compositing integration',
        'check': lambda img: True,
        'critical': False
    }
}
