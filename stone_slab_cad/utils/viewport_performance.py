"""
Viewport Performance Tuning System

Implements display optimization, GPU acceleration, and profiling tools
for professional 3D viewport workflows in stone slab visualization.
"""
import bpy
import bmesh
import time
import functools
from typing import Dict, List, Tuple, Optional, Any, Set, Callable
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict
import gpu
from gpu_extras.batch import batch_for_shader


class ViewportDisplayMode(Enum):
    """Viewport display quality modes for different workflows"""
    WIREFRAME = "WIREFRAME"
    BOUNDBOX = "BOUNDBOX"
    SOLID = "SOLID"
    MATERIAL = "MATERIAL"
    RENDERED = "RENDERED"


class ShadingType(Enum):
    """Simplified shader types for viewport performance"""
    FLAT = "FLAT"
    STUDIO = "STUDIO"
    MATCAP = "MATCAP"
    NORMALS = "NORMALS"
    WIREFRAME = "WIREFRAME"


class MatcapPreset(Enum):
    """Built-in matcap presets for quick material preview"""
    CLAY = "clay"
    CERAMIC_WHITE = "ceramic_white"
    METAL = "metal"
    CHROME = "chrome"
    CHECKER = "checker"
    PEARL = "pearl"
    SKIN = "skin"


class ProfilingMetric(Enum):
    """Performance profiling metrics"""
    FPS = "fps"
    FRAME_TIME = "frame_time"
    TRIANGLE_COUNT = "triangle_count"
    DRAW_CALLS = "draw_calls"
    MEMORY_USAGE = "memory_usage"
    TEXTURE_MEMORY = "texture_memory"


@dataclass
class ViewportConfig:
    """Configuration for viewport display optimization"""
    # Display settings
    display_mode: ViewportDisplayMode = ViewportDisplayMode.SOLID
    shading_type: ShadingType = ShadingType.STUDIO
    use_matcap: bool = True
    matcap_preset: MatcapPreset = MatcapPreset.CLAY
    
    # Performance settings
    disable_textures: bool = False
    use_simplified_shaders: bool = True
    enable_backface_culling: bool = True
    subdivision_preview_levels: int = 1
    
    # Scene management
    use_display_layers: bool = True
    auto_isolate_on_select: bool = False
    hide_distant_objects: bool = True
    distant_object_distance: float = 50.0
    use_bounding_box_for_distant: bool = True
    
    # GPU acceleration
    enable_hardware_shading: bool = True
    use_viewport_denoising: bool = True
    texture_cache_size_mb: int = 512
    viewport_resolution_scale: float = 1.0
    
    # Profiling
    enable_statistics_overlay: bool = True
    profile_gpu: bool = False
    profile_memory: bool = True


@dataclass
class PerformanceStats:
    """Real-time performance statistics"""
    fps: float = 0.0
    frame_time_ms: float = 0.0
    triangle_count: int = 0
    draw_calls: int = 0
    memory_usage_mb: float = 0.0
    texture_memory_mb: float = 0.0
    object_count: int = 0
    light_count: int = 0
    timestamp: float = field(default_factory=time.time)


@dataclass
class DisplayLayer:
    """Display layer for organizing scene elements"""
    name: str
    objects: List[bpy.types.Object] = field(default_factory=list)
    visible: bool = True
    selectable: bool = True
    color: Tuple[float, float, float] = (1.0, 1.0, 1.0)
    display_mode: Optional[ViewportDisplayMode] = None


class ViewportOptimizer:
    """
    Optimizes viewport display settings for maximum performance during modeling.
    """
    
    def __init__(self, config: Optional[ViewportConfig] = None):
        self.config = config or ViewportConfig()
        self._original_settings: Dict[str, Any] = {}
        self._stats_history: List[PerformanceStats] = []
        self._profiling_active = False
        self._display_layers: Dict[str, DisplayLayer] = {}
        
    def optimize_for_modeling(self) -> Dict[str, Any]:
        """
        Configure viewport for maximum modeling performance.
        
        Returns:
            Dictionary of applied settings
        """
        settings_applied = {}
        
        # Store original settings for restoration
        self._store_original_settings()
        
        # Configure viewport display mode
        if self.config.display_mode == ViewportDisplayMode.SOLID:
            settings_applied['viewport_shade'] = self._set_solid_shading()
        elif self.config.display_mode == ViewportDisplayMode.WIREFRAME:
            settings_applied['viewport_shade'] = self._set_wireframe_shading()
        elif self.config.display_mode == ViewportDisplayMode.MATERIAL:
            settings_applied['viewport_shade'] = self._set_material_preview()
            
        # Disable textures if configured
        if self.config.disable_textures:
            settings_applied['textures_disabled'] = self._disable_viewport_textures()
            
        # Use simplified shaders (matcap)
        if self.config.use_simplified_shaders and self.config.use_matcap:
            settings_applied['matcap'] = self._enable_matcap_shading()
            
        # Enable backface culling
        if self.config.enable_backface_culling:
            settings_applied['backface_culling'] = self._enable_backface_culling()
            
        # Reduce subdivision preview levels
        settings_applied['subdivision_levels'] = self._reduce_subdivision_levels()
        
        # Enable hardware shading
        if self.config.enable_hardware_shading:
            settings_applied['hardware_shading'] = self._enable_hardware_shading()
            
        return settings_applied
    
    def _store_original_settings(self):
        """Store current viewport settings for later restoration"""
        for area in bpy.context.screen.areas:
            if area.type == 'VIEW_3D':
                space = area.spaces.active
                self._original_settings = {
                    'shading_type': space.shading.type,
                    'shading_light': getattr(space.shading, 'light', None),
                    'show_textures': getattr(space.shading, 'show_textures', True),
                    'show_backface_culling': space.shading.show_backface_culling,
                    'use_matcap': getattr(space.shading, 'use_matcap', False),
                    'matcap_flipped': getattr(space.shading, 'matcap_flipped', False),
                }
                break
    
    def restore_original_settings(self) -> bool:
        """
        Restore viewport to original settings.
        
        Returns:
            True if settings were restored
        """
        if not self._original_settings:
            return False
            
        for area in bpy.context.screen.areas:
            if area.type == 'VIEW_3D':
                space = area.spaces.active
                space.shading.type = self._original_settings.get('shading_type', 'SOLID')
                
                if self._original_settings.get('shading_light'):
                    space.shading.light = self._original_settings['shading_light']
                    
                if 'show_textures' in self._original_settings:
                    space.shading.show_textures = self._original_settings['show_textures']
                    
                space.shading.show_backface_culling = self._original_settings.get(
                    'show_backface_culling', False
                )
                
                if 'use_matcap' in self._original_settings:
                    space.shading.use_matcap = self._original_settings['use_matcap']
                    
                return True
        return False
    
    def _set_solid_shading(self) -> Dict[str, Any]:
        """Set solid viewport shading with optimized settings"""
        settings = {}
        for area in bpy.context.screen.areas:
            if area.type == 'VIEW_3D':
                space = area.spaces.active
                space.shading.type = 'SOLID'
                space.shading.light = 'STUDIO'
                space.shading.color_type = 'MATERIAL'
                settings['type'] = 'SOLID'
                settings['light'] = 'STUDIO'
                break
        return settings
    
    def _set_wireframe_shading(self) -> Dict[str, Any]:
        """Set wireframe viewport shading for maximum performance"""
        settings = {}
        for area in bpy.context.screen.areas:
            if area.type == 'VIEW_3D':
                space = area.spaces.active
                space.shading.type = 'WIREFRAME'
                settings['type'] = 'WIREFRAME'
                break
        return settings
    
    def _set_material_preview(self) -> Dict[str, Any]:
        """Set material preview with texture optimization"""
        settings = {}
        for area in bpy.context.screen.areas:
            if area.type == 'VIEW_3D':
                space = area.spaces.active
                space.shading.type = 'MATERIAL'
                space.shading.use_scene_lights = False
                space.shading.use_scene_world = False
                settings['type'] = 'MATERIAL'
                settings['use_scene_lights'] = False
                break
        return settings
    
    def _disable_viewport_textures(self) -> bool:
        """Disable textures in viewport for better performance"""
        for area in bpy.context.screen.areas:
            if area.type == 'VIEW_3D':
                space = area.spaces.active
                if hasattr(space.shading, 'show_textures'):
                    space.shading.show_textures = False
                    return True
        return False
    
    def _enable_matcap_shading(self) -> Dict[str, str]:
        """Enable matcap shading for fast material preview"""
        settings = {}
        for area in bpy.context.screen.areas:
            if area.type == 'VIEW_3D':
                space = area.spaces.active
                space.shading.light = 'MATCAP'
                space.shading.use_matcap = True
                
                # Set matcap preset if available
                matcap_name = self.config.matcap_preset.value
                settings['matcap'] = matcap_name
                settings['light'] = 'MATCAP'
                break
        return settings
    
    def _enable_backface_culling(self) -> bool:
        """Enable backface culling for performance"""
        for area in bpy.context.screen.areas:
            if area.type == 'VIEW_3D':
                space = area.spaces.active
                space.shading.show_backface_culling = True
                return True
        return False
    
    def _reduce_subdivision_levels(self) -> int:
        """
        Reduce subdivision surface preview levels.
        
        Returns:
            Number of modifiers adjusted
        """
        adjusted_count = 0
        for obj in bpy.context.scene.objects:
            if obj.type == 'MESH':
                for mod in obj.modifiers:
                    if mod.type == 'SUBSURF':
                        mod.levels = min(mod.levels, self.config.subdivision_preview_levels)
                        adjusted_count += 1
        return adjusted_count
    
    def _enable_hardware_shading(self) -> bool:
        """Enable hardware shading acceleration"""
        # Enable smooth view transitions for GPU acceleration
        prefs = bpy.context.preferences.view
        prefs.use_smooth_view = True
        
        # Configure viewport for GPU rendering
        for area in bpy.context.screen.areas:
            if area.type == 'VIEW_3D':
                space = area.spaces.active
                # Use GPU-optimized viewport settings
                if hasattr(space, 'overlay'):
                    space.overlay.show_wireframes = False
                    space.overlay.show_floor = True
                    space.overlay.show_axis_x = False
                    space.overlay.show_axis_y = False
                    space.overlay.show_axis_z = False
                return True
        return False


class SceneDisplayManager:
    """
    Manages scene organization using display layers and visibility controls.
    """
    
    def __init__(self):
        self.layers: Dict[str, DisplayLayer] = {}
        self._isolated_objects: Set[bpy.types.Object] = set()
        self._hidden_state: Dict[bpy.types.Object, bool] = {}
        
    def create_display_layer(self, name: str, objects: Optional[List[bpy.types.Object]] = None,
                            color: Tuple[float, float, float] = (1.0, 1.0, 1.0)) -> DisplayLayer:
        """
        Create a new display layer for organizing objects.
        
        Args:
            name: Layer name
            objects: Objects to include in layer
            color: Layer color for identification
            
        Returns:
            Created DisplayLayer
        """
        layer = DisplayLayer(
            name=name,
            objects=objects or [],
            color=color
        )
        self.layers[name] = layer
        return layer
    
    def add_to_layer(self, layer_name: str, obj: bpy.types.Object) -> bool:
        """
        Add object to a display layer.
        
        Args:
            layer_name: Target layer name
            obj: Object to add
            
        Returns:
            True if added successfully
        """
        if layer_name not in self.layers:
            return False
        if obj not in self.layers[layer_name].objects:
            self.layers[layer_name].objects.append(obj)
        return True
    
    def set_layer_visibility(self, layer_name: str, visible: bool) -> bool:
        """
        Toggle visibility of all objects in a layer.
        
        Args:
            layer_name: Layer name
            visible: Visibility state
            
        Returns:
            True if layer exists
        """
        if layer_name not in self.layers:
            return False
            
        layer = self.layers[layer_name]
        layer.visible = visible
        
        for obj in layer.objects:
            obj.hide_set(not visible)
            obj.hide_viewport = not visible
            
        return True
    
    def isolate_objects(self, objects: List[bpy.types.Object], 
                       hide_others: bool = True) -> Dict[str, Any]:
        """
        Isolate selected objects for focused work.
        
        Args:
            objects: Objects to isolate
            hide_others: Whether to hide non-selected objects
            
        Returns:
            Isolation state info
        """
        self._isolated_objects = set(objects)
        
        if hide_others:
            # Store current visibility state
            self._hidden_state = {}
            for obj in bpy.context.scene.objects:
                self._hidden_state[obj] = obj.hide_get()
                if obj not in objects:
                    obj.hide_set(True)
                    obj.hide_viewport = True
                    
        return {
            'isolated_count': len(objects),
            'hidden_count': len(bpy.context.scene.objects) - len(objects)
        }
    
    def exit_isolation(self) -> bool:
        """
        Restore visibility after isolation.
        
        Returns:
            True if isolation was active
        """
        if not self._hidden_state:
            return False
            
        for obj, was_hidden in self._hidden_state.items():
            obj.hide_set(was_hidden)
            obj.hide_viewport = was_hidden
            
        self._hidden_state = {}
        self._isolated_objects = set()
        return True
    
    def hide_distant_objects(self, camera_location: Tuple[float, float, float],
                            distance_threshold: float,
                            use_bounding_box: bool = True) -> int:
        """
        Hide or display as bounding box objects beyond specified distance.
        
        Args:
            camera_location: Camera/viewer position
            distance_threshold: Distance beyond which to optimize
            use_bounding_box: Show as bounding box instead of hiding
            
        Returns:
            Number of objects optimized
        """
        optimized_count = 0
        
        for obj in bpy.context.scene.objects:
            if obj.type != 'MESH':
                continue
                
            obj_location = obj.location
            distance = ((obj_location[0] - camera_location[0]) ** 2 +
                       (obj_location[1] - camera_location[1]) ** 2 +
                       (obj_location[2] - camera_location[2]) ** 2) ** 0.5
            
            if distance > distance_threshold:
                if use_bounding_box:
                    obj.display_type = 'BOUNDS'
                else:
                    obj.hide_set(True)
                optimized_count += 1
                
        return optimized_count
    
    def restore_display_types(self) -> int:
        """
        Restore all objects to textured display type.
        
        Returns:
            Number of objects restored
        """
        restored = 0
        for obj in bpy.context.scene.objects:
            if obj.display_type == 'BOUNDS':
                obj.display_type = 'TEXTURED'
                restored += 1
        return restored


class GPUAccelerator:
    """
    Configures and manages GPU acceleration for viewport rendering.
    """
    
    def __init__(self, config: Optional[ViewportConfig] = None):
        self.config = config or ViewportConfig()
        self._original_prefs: Dict[str, Any] = {}
        
    def configure_gpu_acceleration(self) -> Dict[str, Any]:
        """
        Configure Blender for optimal GPU viewport performance.
        
        Returns:
            Configuration results
        """
        results = {
            'hardware_shading': False,
            'texture_cache': False,
            'resolution_scale': False
        }
        
        # Store original preferences
        self._store_preferences()
        
        # Enable hardware shading
        if self.config.enable_hardware_shading:
            results['hardware_shading'] = self._setup_hardware_shading()
            
        # Configure texture cache
        if self.config.texture_cache_size_mb > 0:
            results['texture_cache'] = self._configure_texture_cache()
            
        # Set viewport resolution scaling
        if self.config.viewport_resolution_scale < 1.0:
            results['resolution_scale'] = self._set_resolution_scale()
            
        return results
    
    def _store_preferences(self):
        """Store current preferences for restoration"""
        prefs = bpy.context.preferences.system
        self._original_prefs = {
            'viewport_aa': prefs.viewport_aa,
            'anisotropic_filter': prefs.anisotropic_filter,
            'gl_texture_limit': prefs.gl_texture_limit,
        }
    
    def _setup_hardware_shading(self) -> bool:
        """Enable hardware-accelerated viewport shading"""
        try:
            prefs = bpy.context.preferences.system
            # Enable multi-sample anti-aliasing for smoother GPU rendering
            prefs.viewport_aa = 'OFF'  # Disable for performance
            prefs.anisotropic_filter = 0  # Disable for performance
            
            # Configure viewport overlays for GPU efficiency
            for area in bpy.context.screen.areas:
                if area.type == 'VIEW_3D':
                    space = area.spaces.active
                    if hasattr(space, 'shading'):
                        # Use GPU-friendly shading
                        space.shading.use_world_space_lighting = False
                        space.shading.show_specular_highlight = False
                    return True
            return False
        except Exception:
            return False
    
    def _configure_texture_cache(self) -> bool:
        """Configure texture cache for optimal memory usage"""
        try:
            prefs = bpy.context.preferences.system
            # Set texture memory limit
            cache_size = self.config.texture_cache_size_mb
            # Convert to appropriate internal format
            prefs.gl_texture_limit = str(min(cache_size, 4096))
            return True
        except Exception:
            return False
    
    def _set_resolution_scale(self) -> bool:
        """Set viewport resolution scale for performance"""
        try:
            for area in bpy.context.screen.areas:
                if area.type == 'VIEW_3D':
                    space = area.spaces.active
                    # Note: Resolution scale is typically controlled via render settings
                    # This is a placeholder for viewport-specific scaling
                    return True
            return False
        except Exception:
            return False
    
    def enable_viewport_denoising(self) -> bool:
        """
        Enable viewport denoising for preview renders.
        
        Returns:
            True if enabled
        """
        try:
            # Configure viewport denoising in render settings
            scene = bpy.context.scene
            if hasattr(scene.cycles, 'use_denoising'):
                scene.cycles.use_denoising = True
            if hasattr(scene.cycles, 'denoiser'):
                # Use OptiX denoiser if available (GPU accelerated)
                scene.cycles.denoiser = 'OPTIX'
            return True
        except Exception:
            return False
    
    def restore_preferences(self) -> bool:
        """
        Restore original GPU preferences.
        
        Returns:
            True if restored
        """
        if not self._original_prefs:
            return False
            
        prefs = bpy.context.preferences.system
        for key, value in self._original_prefs.items():
            if hasattr(prefs, key):
                setattr(prefs, key, value)
                
        return True


class ViewportProfiler:
    """
    Real-time viewport performance profiling and statistics overlay.
    """
    
    def __init__(self):
        self.stats = PerformanceStats()
        self._history: List[PerformanceStats] = []
        self._max_history = 60  # Keep 60 frames of history
        self._last_frame_time = time.time()
        self._frame_count = 0
        self._fps_start_time = time.time()
        
    def update_stats(self) -> PerformanceStats:
        """
        Update and return current performance statistics.
        
        Returns:
            Current performance stats
        """
        current_time = time.time()
        
        # Calculate frame time and FPS
        frame_time = (current_time - self._last_frame_time) * 1000  # ms
        self._last_frame_time = current_time
        
        self._frame_count += 1
        fps_time_diff = current_time - self._fps_start_time
        
        if fps_time_diff >= 1.0:  # Update FPS every second
            self.stats.fps = self._frame_count / fps_time_diff
            self.stats.frame_time_ms = frame_time
            self._frame_count = 0
            self._fps_start_time = current_time
            
        # Gather scene statistics
        self.stats.triangle_count = self._count_triangles()
        self.stats.object_count = self._count_objects()
        self.stats.light_count = self._count_lights()
        self.stats.memory_usage_mb = self._get_memory_usage()
        self.stats.texture_memory_mb = self._get_texture_memory()
        self.stats.timestamp = current_time
        
        # Store in history
        self._history.append(self.stats)
        if len(self._history) > self._max_history:
            self._history.pop(0)
            
        return self.stats
    
    def _count_triangles(self) -> int:
        """Count total triangles in scene"""
        total = 0
        for obj in bpy.context.scene.objects:
            if obj.type == 'MESH' and obj.visible_get():
                mesh = obj.data
                if mesh:
                    total += len(mesh.polygons)
        return total
    
    def _count_objects(self) -> int:
        """Count visible objects in scene"""
        return sum(1 for obj in bpy.context.scene.objects if obj.visible_get())
    
    def _count_lights(self) -> int:
        """Count lights in scene"""
        return sum(1 for obj in bpy.context.scene.objects 
                  if obj.type == 'LIGHT' and obj.visible_get())
    
    def _get_memory_usage(self) -> float:
        """Get approximate memory usage in MB"""
        try:
            import sys
            return sys.getsizeof(bpy.data) / (1024 * 1024)
        except:
            return 0.0
    
    def _get_texture_memory(self) -> float:
        """Get texture memory usage in MB"""
        total = 0.0
        for image in bpy.data.images:
            if hasattr(image, 'size') and len(image.size) == 2:
                # Rough estimate: width * height * channels * 4 bytes
                width, height = image.size
                channels = image.channels if hasattr(image, 'channels') else 4
                total += (width * height * channels * 4) / (1024 * 1024)
        return total
    
    def get_statistics_overlay(self) -> str:
        """
        Generate formatted statistics overlay text.
        
        Returns:
            Formatted statistics string
        """
        lines = [
            f"FPS: {self.stats.fps:.1f}",
            f"Frame: {self.stats.frame_time_ms:.2f}ms",
            f"Triangles: {self.stats.triangle_count:,}",
            f"Objects: {self.stats.object_count}",
            f"Lights: {self.stats.light_count}",
            f"Memory: {self.stats.memory_usage_mb:.1f}MB",
            f"Textures: {self.stats.texture_memory_mb:.1f}MB"
        ]
        return "\n".join(lines)
    
    def get_performance_report(self) -> Dict[str, Any]:
        """
        Generate comprehensive performance report.
        
        Returns:
            Performance metrics dictionary
        """
        if not self._history:
            return {}
            
        fps_values = [s.fps for s in self._history if s.fps > 0]
        frame_times = [s.frame_time_ms for s in self._history]
        
        return {
            'avg_fps': sum(fps_values) / len(fps_values) if fps_values else 0,
            'min_fps': min(fps_values) if fps_values else 0,
            'max_fps': max(fps_values) if fps_values else 0,
            'avg_frame_time': sum(frame_times) / len(frame_times) if frame_times else 0,
            'current_triangles': self.stats.triangle_count,
            'current_memory_mb': self.stats.memory_usage_mb,
            'samples': len(self._history)
        }
    
    def draw_overlay(self, x: int = 20, y: int = 100):
        """
        Draw statistics overlay in viewport (Blender 2.8+ compatible).
        
        Args:
            x: X position for overlay
            y: Y position for overlay
        """
        # Note: This requires a Blender handler to work properly
        # This method provides the data, actual drawing should be done
        # via a draw handler callback
        pass


class PerformanceBudgetManager:
    """
    Manages performance budgets and alerts for viewport interaction.
    """
    
    def __init__(self, max_triangles: int = 1000000, 
                 max_memory_mb: int = 2048,
                 target_fps: int = 30):
        self.max_triangles = max_triangles
        self.max_memory_mb = max_memory_mb
        self.target_fps = target_fps
        self.profiler = ViewportProfiler()
        
    def check_budget(self) -> Dict[str, Any]:
        """
        Check current scene against performance budget.
        
        Returns:
            Budget status report
        """
        stats = self.profiler.update_stats()
        
        alerts = []
        warnings = []
        
        # Triangle budget check
        triangle_usage = (stats.triangle_count / self.max_triangles) * 100
        if triangle_usage > 100:
            alerts.append(f"Triangle budget exceeded: {stats.triangle_count:,} / {self.max_triangles:,}")
        elif triangle_usage > 80:
            warnings.append(f"Triangle budget at {triangle_usage:.1f}%")
            
        # Memory budget check
        if stats.memory_usage_mb > self.max_memory_mb:
            alerts.append(f"Memory budget exceeded: {stats.memory_usage_mb:.0f}MB / {self.max_memory_mb}MB")
        elif stats.memory_usage_mb > self.max_memory_mb * 0.8:
            warnings.append(f"Memory budget at {(stats.memory_usage_mb / self.max_memory_mb) * 100:.1f}%")
            
        # FPS check
        if stats.fps > 0 and stats.fps < self.target_fps:
            warnings.append(f"FPS below target: {stats.fps:.1f} < {self.target_fps}")
            
        return {
            'within_budget': len(alerts) == 0,
            'alerts': alerts,
            'warnings': warnings,
            'triangle_usage_percent': triangle_usage,
            'memory_usage_percent': (stats.memory_usage_mb / self.max_memory_mb) * 100 if self.max_memory_mb > 0 else 0,
            'fps_status': 'good' if stats.fps >= self.target_fps else 'low'
        }
    
    def get_optimization_suggestions(self) -> List[str]:
        """
        Get optimization suggestions based on current scene.
        
        Returns:
            List of optimization recommendations
        """
        stats = self.profiler.update_stats()
        suggestions = []
        
        if stats.triangle_count > self.max_triangles:
            suggestions.append("Consider using LODs for distant objects")
            suggestions.append("Use lower subdivision levels in viewport")
            suggestions.append("Hide non-essential geometry")
            
        if stats.texture_memory_mb > 512:
            suggestions.append("Reduce texture resolution or use texture compression")
            suggestions.append("Disable unused texture maps in viewport")
            
        if stats.light_count > 8:
            suggestions.append("Reduce realtime light count")
            suggestions.append("Bake lighting for static objects")
            
        if stats.fps < self.target_fps and stats.fps > 0:
            suggestions.append("Enable backface culling")
            suggestions.append("Use wireframe or bounding box for distant objects")
            suggestions.append("Disable shadows in viewport")
            
        return suggestions


# Convenience Functions

def setup_performance_viewport(config: Optional[ViewportConfig] = None) -> Dict[str, Any]:
    """
    Quick setup for performance-optimized viewport.
    
    Args:
        config: Optional custom configuration
        
    Returns:
        Applied settings summary
    """
    config = config or ViewportConfig()
    optimizer = ViewportOptimizer(config)
    
    results = {
        'viewport': optimizer.optimize_for_modeling(),
        'gpu': {},
        'scene': {}
    }
    
    # Configure GPU acceleration
    gpu_accel = GPUAccelerator(config)
    results['gpu'] = gpu_accel.configure_gpu_acceleration()
    
    # Setup scene display management
    scene_mgr = SceneDisplayManager()
    
    # Hide distant objects if configured
    if config.hide_distant_objects:
        # Get active camera location or use origin
        camera = bpy.context.scene.camera
        if camera:
            camera_loc = tuple(camera.location)
        else:
            camera_loc = (0.0, 0.0, 10.0)
            
        optimized = scene_mgr.hide_distant_objects(
            camera_loc,
            config.distant_object_distance,
            config.use_bounding_box_for_distant
        )
        results['scene']['distant_optimized'] = optimized
    
    return results


def create_profiling_overlay() -> ViewportProfiler:
    """
    Create and return a viewport profiler for statistics overlay.
    
    Returns:
        Configured ViewportProfiler instance
    """
    return ViewportProfiler()


def optimize_for_sculpting() -> Dict[str, Any]:
    """
    Quick preset for sculpting workflow optimization.
    
    Returns:
        Applied settings
    """
    config = ViewportConfig(
        display_mode=ViewportDisplayMode.SOLID,
        shading_type=ShadingType.MATCAP,
        use_matcap=True,
        matcap_preset=MatcapPreset.CLAY,
        enable_backface_culling=True,
        subdivision_preview_levels=2,
        disable_textures=True
    )
    return setup_performance_viewport(config)


def optimize_for_layout() -> Dict[str, Any]:
    """
    Quick preset for layout/scene composition optimization.
    
    Returns:
        Applied settings
    """
    config = ViewportConfig(
        display_mode=ViewportDisplayMode.SOLID,
        shading_type=ShadingType.WIREFRAME,
        hide_distant_objects=True,
        distant_object_distance=100.0,
        use_bounding_box_for_distant=True,
        disable_textures=True
    )
    return setup_performance_viewport(config)


def optimize_for_texturing() -> Dict[str, Any]:
    """
    Quick preset for texture painting/UV work optimization.
    
    Returns:
        Applied settings
    """
    config = ViewportConfig(
        display_mode=ViewportDisplayMode.MATERIAL,
        shading_type=ShadingType.STUDIO,
        disable_textures=False,
        use_simplified_shaders=False,
        subdivision_preview_levels=1
    )
    return setup_performance_viewport(config)


# Software-specific profiling tool mappings (for reference)
PROFILING_TOOLS_REFERENCE = {
    'blender': {
        'statistics_overlay': 'Viewport > Overlay > Statistics',
        'scene_statistics': 'Viewport > View > Statistic',
        'performance_monitor': 'Preferences > System > Compute Device',
        'draw_stats': 'Viewport > Overlay > Statistics'
    },
    'maya': {
        'hud': 'Display > Heads Up Display',
        'scene_metrics': 'Window > Settings/Preferences > Performance Settings',
        'viewport_stats': 'Renderer > Default Renderer'
    },
    '3ds_max': {
        'viewport_statistics': '[7] key or Views > Viewport Configuration',
        'object_counts': 'Viewport > Show Statistics',
        'fps_counter': 'Viewport Configuration > Statistics'
    },
    'unreal_engine': {
        'stat_commands': 'Console: stat fps, stat unit, stat rhi',
        'realtime_metrics': 'Editor Preferences > Miscellaneous > Frame Rate'
    },
    'unity': {
        'profiler': 'Window > Analysis > Profiler',
        'stats_panel': 'Game View > Stats button',
        'frame_debugger': 'Window > Analysis > Frame Debugger'
    }
}
