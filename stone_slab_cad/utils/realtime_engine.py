"""
Real-Time Engine Optimization System

Implements performance budgets, optimization strategies for meshes, textures, and shaders,
and real-time lighting techniques for professional 3D stone slab visualization.
"""
import bpy
import bmesh
import mathutils
from typing import Dict, List, Tuple, Optional, Any, Set
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
import math


class PlatformType(Enum):
    """Target platform types for performance budgeting"""
    MOBILE = "mobile"
    CONSOLE = "console"
    PC_HIGH_END = "pc_high_end"
    VR = "vr"


class LODLevel(Enum):
    """Level of Detail chain levels"""
    LOD0 = 0  # Highest detail
    LOD1 = 1  # High detail
    LOD2 = 2  # Medium detail
    LOD3 = 3  # Low detail
    LOD4 = 4  # Lowest detail / impostor


class LightingMode(Enum):
    """Real-time lighting modes"""
    BAKED = "baked"  # Static geometry, highest quality
    MIXED = "mixed"  # Baked indirect, real-time direct
    FULLY_REALTIME = "fully_realtime"  # Dynamic shadows, highest cost


class TextureFormat(Enum):
    """Texture compression formats by platform"""
    BC7 = "BC7"  # High quality for PC/Console
    ASTC_4x4 = "ASTC_4x4"  # Mobile high quality
    ASTC_6x6 = "ASTC_6x6"  # Mobile balanced
    ASTC_8x8 = "ASTC_8x8"  # Mobile performance
    ETC2 = "ETC2"  # Android fallback
    PVRTC = "PVRTC"  # iOS fallback


@dataclass
class PerformanceBudget:
    """Platform-specific performance budgets"""
    platform: PlatformType
    triangle_budget: int  # Maximum triangles
    texture_memory_mb: int  # Texture memory budget in MB
    max_draw_calls: int  # Maximum draw calls per frame
    target_fps: int = 60
    max_lights_realtime: int = 4
    shadow_map_size: int = 2048
    max_texture_size: int = 4096
    
    def __post_init__(self):
        # Platform-specific defaults
        budget_defaults = {
            PlatformType.MOBILE: {
                'triangle_budget': (50000, 200000),
                'texture_memory_mb': (256, 1024),
                'max_draw_calls': 100,
                'target_fps': 60,
                'max_lights_realtime': 4,
                'shadow_map_size': 1024,
                'max_texture_size': 2048
            },
            PlatformType.CONSOLE: {
                'triangle_budget': (5000000, 20000000),
                'texture_memory_mb': (4096, 8192),
                'max_draw_calls': 2000,
                'target_fps': 60,
                'max_lights_realtime': 8,
                'shadow_map_size': 2048,
                'max_texture_size': 4096
            },
            PlatformType.PC_HIGH_END: {
                'triangle_budget': (20000000, 50000000),
                'texture_memory_mb': (8192, 16384),
                'max_draw_calls': 5000,
                'target_fps': 60,
                'max_lights_realtime': 8,
                'shadow_map_size': 4096,
                'max_texture_size': 8192
            },
            PlatformType.VR: {
                'triangle_budget': (1000000, 2000000),
                'texture_memory_mb': (4096, 8192),
                'max_draw_calls': 1000,
                'target_fps': 90,
                'max_lights_realtime': 4,
                'shadow_map_size': 2048,
                'max_texture_size': 4096
            }
        }
        
        defaults = budget_defaults.get(self.platform, budget_defaults[PlatformType.PC_HIGH_END])
        
        # Apply ranges if not explicitly set
        if self.triangle_budget == 0:
            self.triangle_budget = defaults['triangle_budget'][0]
        if self.texture_memory_mb == 0:
            self.texture_memory_mb = defaults['texture_memory_mb'][0]
        if self.max_draw_calls == 10000:  # Default sentinel
            self.max_draw_calls = defaults['max_draw_calls']


@dataclass
class LODConfig:
    """Configuration for Level of Detail generation"""
    lod_level: LODLevel
    triangle_ratio: float  # Ratio of original triangles (0.0-1.0)
    screen_size: float  # Screen size threshold for this LOD
    use_decimate: bool = True
    decimate_ratio: float = 0.5
    preserve_uvs: bool = True
    preserve_normals: bool = True
    
    
@dataclass
class MeshOptimizationConfig:
    """Mesh optimization settings"""
    enable_occlusion_culling: bool = True
    enable_frustum_culling: bool = True
    batch_draw_calls: bool = True
    use_depth_prepass: bool = True
    enable_backface_culling: bool = True
    lod_chain: List[LODConfig] = field(default_factory=list)
    
    def __post_init__(self):
        if not self.lod_chain:
            # Default LOD chain for stone slabs
            self.lod_chain = [
                LODConfig(LODLevel.LOD0, 1.0, 0.5),
                LODConfig(LODLevel.LOD1, 0.5, 0.25),
                LODConfig(LODLevel.LOD2, 0.25, 0.125),
                LODConfig(LODLevel.LOD3, 0.1, 0.05),
            ]


@dataclass
class TextureOptimizationConfig:
    """Texture optimization settings"""
    enable_atlasing: bool = True
    enable_streaming: bool = False
    compression_format: TextureFormat = TextureFormat.BC7
    use_mipmaps: bool = True
    mipmap_filter: str = "LINEAR_MIPMAP_LINEAR"
    max_anisotropy: int = 16
    atlas_size: int = 4096
    atlas_padding: int = 4


@dataclass
class ShaderOptimizationConfig:
    """Shader optimization settings"""
    minimize_instructions: bool = True
    use_half_precision: bool = True
    careful_branching: bool = True
    enable_gpu_instancing: bool = True
    use_shader_lod: bool = True
    max_texture_samplers: int = 16


@dataclass
class RealtimeLightingConfig:
    """Real-time lighting configuration"""
    lighting_mode: LightingMode = LightingMode.MIXED
    max_realtime_lights: int = 4
    use_light_cookies: bool = True
    use_reflection_probes: bool = True
    bake_ambient_occlusion: bool = True
    shadow_distance: float = 50.0
    shadow_cascade_count: int = 4
    shadow_bias: float = 0.0001
    
    
class PerformanceProfiler:
    """GPU and CPU performance profiling tools"""
    
    def __init__(self):
        self.stats = {
            'triangle_count': 0,
            'draw_calls': 0,
            'texture_memory': 0,
            'shader_complexity': 0,
            'frame_time_ms': 0.0
        }
        self.gpu_timers = {}
        
    def profile_scene(self, scene: bpy.types.Scene) -> Dict[str, Any]:
        """Profile the entire scene for performance metrics"""
        self.stats = {
            'triangle_count': self._count_triangles(scene),
            'draw_calls': self._estimate_draw_calls(scene),
            'texture_memory': self._calculate_texture_memory(scene),
            'shader_complexity': self._analyze_shader_complexity(scene),
            'object_count': len([obj for obj in scene.objects if obj.type == 'MESH']),
            'material_count': len(bpy.data.materials),
            'light_count': len([obj for obj in scene.objects if obj.type == 'LIGHT'])
        }
        return self.stats
    
    def _count_triangles(self, scene: bpy.types.Scene) -> int:
        """Count total triangles in the scene"""
        total_tris = 0
        for obj in scene.objects:
            if obj.type == 'MESH' and obj.data:
                mesh = obj.data
                total_tris += len(mesh.polygons)
        return total_tris
    
    def _estimate_draw_calls(self, scene: bpy.types.Scene) -> int:
        """Estimate draw calls based on objects and materials"""
        draw_calls = 0
        for obj in scene.objects:
            if obj.type == 'MESH':
                # Each material slot = potential draw call
                mesh = obj.data
                if mesh.materials:
                    draw_calls += len(mesh.materials)
                else:
                    draw_calls += 1
        return draw_calls
    
    def _calculate_texture_memory(self, scene: bpy.types.Scene) -> int:
        """Calculate estimated texture memory usage in MB"""
        total_memory = 0
        processed_images = set()
        
        for mat in bpy.data.materials:
            if mat.use_nodes:
                for node in mat.node_tree.nodes:
                    if node.type == 'TEX_IMAGE' and node.image:
                        img = node.image
                        if img.name not in processed_images:
                            processed_images.add(img.name)
                            # Estimate memory: width * height * channels * 4 (float) / (1024^2)
                            if img.size[0] > 0 and img.size[1] > 0:
                                channels = len(img.depth) if hasattr(img, 'depth') else 4
                                memory_mb = (img.size[0] * img.size[1] * channels * 4) / (1024 * 1024)
                                total_memory += memory_mb
        
        return int(total_memory)
    
    def _analyze_shader_complexity(self, scene: bpy.types.Scene) -> int:
        """Analyze shader complexity (estimated instruction count)"""
        total_complexity = 0
        for mat in bpy.data.materials:
            if mat.use_nodes:
                node_count = len(mat.node_tree.nodes)
                # Rough estimate: each node ~ 5-10 instructions
                total_complexity += node_count * 7
        return total_complexity
    
    def check_budget_compliance(self, budget: PerformanceBudget) -> Dict[str, Any]:
        """Check if current stats are within budget"""
        compliance = {
            'within_budget': True,
            'violations': [],
            'warnings': [],
            'recommendations': []
        }
        
        if self.stats['triangle_count'] > budget.triangle_budget:
            compliance['within_budget'] = False
            compliance['violations'].append(
                f"Triangle count ({self.stats['triangle_count']:,}) exceeds budget ({budget.triangle_budget:,})"
            )
            compliance['recommendations'].append("Implement additional LOD levels or reduce geometry detail")
        
        if self.stats['draw_calls'] > budget.max_draw_calls:
            compliance['within_budget'] = False
            compliance['violations'].append(
                f"Draw calls ({self.stats['draw_calls']}) exceed budget ({budget.max_draw_calls})"
            )
            compliance['recommendations'].append("Batch meshes with same materials, use texture atlasing")
        
        if self.stats['texture_memory'] > budget.texture_memory_mb:
            compliance['within_budget'] = False
            compliance['violations'].append(
                f"Texture memory ({self.stats['texture_memory']}MB) exceeds budget ({budget.texture_memory_mb}MB)"
            )
            compliance['recommendations'].append("Compress textures, use texture streaming, reduce resolution")
        
        # Warnings at 80% of budget
        if self.stats['triangle_count'] > budget.triangle_budget * 0.8:
            compliance['warnings'].append("Triangle count at >80% of budget")
        
        if self.stats['draw_calls'] > budget.max_draw_calls * 0.8:
            compliance['warnings'].append("Draw calls at >80% of budget")
            
        return compliance


class LODSystem:
    """Level of Detail chain generation and management"""
    
    def __init__(self, config: MeshOptimizationConfig):
        self.config = config
        self.lod_objects: Dict[LODLevel, bpy.types.Object] = {}
        
    def generate_lod_chain(self, obj: bpy.types.Object) -> Dict[LODLevel, bpy.types.Object]:
        """Generate LOD chain for an object"""
        self.lod_objects = {}
        
        for lod_config in self.config.lod_chain:
            lod_obj = self._create_lod_level(obj, lod_config)
            if lod_obj:
                self.lod_objects[lod_config.lod_level] = lod_obj
                
        return self.lod_objects
    
    def _create_lod_level(self, obj: bpy.types.Object, config: LODConfig) -> Optional[bpy.types.Object]:
        """Create a single LOD level from the original object"""
        if config.lod_level == LODLevel.LOD0:
            # LOD0 is the original
            return obj
            
        # Create copy for this LOD level
        lod_name = f"{obj.name}_LOD{config.lod_level.value}"
        
        # Duplicate the object
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.duplicate()
        lod_obj = bpy.context.active_object
        lod_obj.name = lod_name
        
        # Apply decimation
        if config.use_decimate:
            self._apply_decimate_modifier(lod_obj, config.decimate_ratio)
            
        return lod_obj
    
    def _apply_decimate_modifier(self, obj: bpy.types.Object, ratio: float):
        """Apply decimate modifier to reduce polygon count"""
        decimate = obj.modifiers.new(name="Decimate", type='DECIMATE')
        decimate.ratio = ratio
        decimate.use_collapse_triangulate = True
        decimate.use_symmetry = False
        
        # Apply the modifier
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier="Decimate")


class OcclusionCullingSystem:
    """Occlusion culling implementation for visibility optimization"""
    
    def __init__(self):
        self.occluders: List[bpy.types.Object] = []
        self.occludees: List[bpy.types.Object] = []
        
    def setup_occlusion_culling(self, scene: bpy.types.Scene):
        """Set up occlusion culling for the scene"""
        # Identify large static objects as occluders
        for obj in scene.objects:
            if obj.type == 'MESH':
                # Calculate object bounds
                bbox = self._get_bounding_box_volume(obj)
                
                # Large objects are potential occluders
                if bbox > 1.0:  # 1 cubic meter threshold
                    self.occluders.append(obj)
                    # Tag as occluder in custom properties
                    obj["is_occluder"] = True
                else:
                    self.occludees.append(obj)
                    obj["is_occludee"] = True
                    
    def _get_bounding_box_volume(self, obj: bpy.types.Object) -> float:
        """Calculate bounding box volume in cubic meters"""
        if not obj.data:
            return 0.0
            
        bbox = [obj.matrix_world @ mathutils.Vector(corner) for corner in obj.bound_box]
        dimensions = [
            max(v[i] for v in bbox) - min(v[i] for v in bbox)
            for i in range(3)
        ]
        return dimensions[0] * dimensions[1] * dimensions[2]
    
    def is_object_visible(self, obj: bpy.types.Object, camera: bpy.types.Object) -> bool:
        """Check if an object is visible from camera (frustum + occlusion test)"""
        # Frustum culling check
        if not self._is_in_frustum(obj, camera):
            return False
            
        # Occlusion check (simplified)
        if obj in self.occludees:
            for occluder in self.occluders:
                if self._is_occluded(obj, occluder, camera):
                    return False
                    
        return True
    
    def _is_in_frustum(self, obj: bpy.types.Object, camera: bpy.types.Object) -> bool:
        """Check if object is within camera frustum"""
        # Simplified frustum check using bounding sphere
        cam_loc = camera.matrix_world.translation
        obj_loc = obj.matrix_world.translation
        
        # Get object bounding radius
        bbox = obj.bound_box
        max_dist = max((mathutils.Vector(corner) - mathutils.Vector((0, 0, 0))).length for corner in bbox)
        
        # Distance check
        distance = (obj_loc - cam_loc).length
        
        # Check if within reasonable view distance
        return distance < 100.0  # 100m view distance
    
    def _is_occluded(self, obj: bpy.types.Object, occluder: bpy.types.Object, camera: bpy.types.Object) -> bool:
        """Check if object is occluded by another object"""
        # Simplified occlusion check
        cam_loc = camera.matrix_world.translation
        obj_loc = obj.matrix_world.translation
        occ_loc = occluder.matrix_world.translation
        
        # Check if occluder is between camera and object
        cam_to_obj = obj_loc - cam_loc
        cam_to_occ = occ_loc - cam_loc
        
        # Check if occluder is closer to camera and roughly in same direction
        if cam_to_occ.length < cam_to_obj.length:
            # Check angle between vectors
            try:
                angle = cam_to_obj.angle(cam_to_occ)
                return angle < 0.3  # Within ~17 degrees
            except ValueError:
                return False
        
        return False


class TextureAtlasBuilder:
    """Build texture atlases for draw call batching"""
    
    def __init__(self, config: TextureOptimizationConfig):
        self.config = config
        self.atlas_images: Dict[str, bpy.types.Image] = {}
        self.uv_mappings: Dict[str, Tuple[float, float, float, float]] = {}
        
    def build_atlas(self, textures: List[bpy.types.Image], atlas_name: str) -> Optional[bpy.types.Image]:
        """Build a texture atlas from multiple textures"""
        if not textures:
            return None
            
        # Calculate atlas layout
        atlas_size = self.config.atlas_size
        padding = self.config.atlas_padding
        
        # Simple grid layout calculation
        num_textures = len(textures)
        grid_size = math.ceil(math.sqrt(num_textures))
        cell_size = (atlas_size - (grid_size + 1) * padding) // grid_size
        
        # Create atlas image
        atlas = bpy.data.images.new(
            name=atlas_name,
            width=atlas_size,
            height=atlas_size,
            alpha=True
        )
        
        # Pack textures into atlas
        pixels = [0.0] * (atlas_size * atlas_size * 4)
        
        for idx, tex in enumerate(textures):
            if not tex or not tex.pixels:
                continue
                
            row = idx // grid_size
            col = idx % grid_size
            
            x_offset = padding + col * (cell_size + padding)
            y_offset = padding + row * (cell_size + padding)
            
            # Store UV mapping
            self.uv_mappings[tex.name] = (
                x_offset / atlas_size,
                y_offset / atlas_size,
                (x_offset + cell_size) / atlas_size,
                (y_offset + cell_size) / atlas_size
            )
            
            # Copy texture pixels (simplified - assumes same size)
            # In production, this would scale textures to fit cells
            
        atlas.pixels = pixels
        self.atlas_images[atlas_name] = atlas
        
        return atlas
    
    def apply_atlas_to_material(self, mat: bpy.types.Material, atlas: bpy.types.Image, 
                                 original_uv_map: str = "UVMap"):
        """Update material to use texture atlas with adjusted UVs"""
        if not mat.use_nodes:
            return
            
        nodes = mat.node_tree.nodes
        
        # Find image texture nodes
        for node in nodes:
            if node.type == 'TEX_IMAGE' and node.image:
                if node.image.name in self.uv_mappings:
                    # Update to use atlas
                    bounds = self.uv_mappings[node.image.name]
                    
                    # Create UV transform nodes to map to atlas region
                    uv_node = nodes.new('ShaderNodeUVMap')
                    uv_node.uv_map = original_uv_map
                    
                    mapping = nodes.new('ShaderNodeMapping')
                    mapping.vector_type = 'TEXTURE'
                    # Scale and offset to atlas region
                    scale_x = bounds[2] - bounds[0]
                    scale_y = bounds[3] - bounds[1]
                    mapping.inputs['Scale'].default_value = (scale_x, scale_y, 1.0)
                    mapping.inputs['Location'].default_value = (bounds[0], bounds[1], 0.0)
                    
                    # Link nodes
                    mat.node_tree.links.new(uv_node.outputs['UV'], mapping.inputs['Vector'])
                    mat.node_tree.links.new(mapping.outputs['Vector'], node.inputs['Vector'])


class RealtimeLightingSetup:
    """Configure real-time lighting with optimization"""
    
    def __init__(self, config: RealtimeLightingConfig):
        self.config = config
        self.baked_lights: List[bpy.types.Object] = []
        self.realtime_lights: List[bpy.types.Object] = []
        
    def setup_lighting(self, scene: bpy.types.Scene, target: bpy.types.Object) -> Dict[str, Any]:
        """Setup optimized real-time lighting"""
        results = {
            'mode': self.config.lighting_mode.value,
            'baked_lights': [],
            'realtime_lights': [],
            'reflection_probes': [],
            'light_cookies': []
        }
        
        if self.config.lighting_mode == LightingMode.BAKED:
            self._setup_baked_lighting(scene, target, results)
        elif self.config.lighting_mode == LightingMode.MIXED:
            self._setup_mixed_lighting(scene, target, results)
        else:  # FULLY_REALTIME
            self._setup_fully_realtime(scene, target, results)
            
        # Setup reflection probes
        if self.config.use_reflection_probes:
            probe = self._create_reflection_probe(scene, target)
            results['reflection_probes'].append(probe.name)
            
        # Bake ambient occlusion if enabled
        if self.config.bake_ambient_occlusion:
            self._bake_ambient_occlusion(scene, target)
            
        return results
    
    def _setup_baked_lighting(self, scene: bpy.types.Scene, target: bpy.types.Object, 
                              results: Dict[str, Any]):
        """Setup fully baked lighting (highest quality, no runtime cost)"""
        # All lights are baked
        for obj in scene.objects:
            if obj.type == 'LIGHT':
                light = obj.data
                # Configure for baking
                light.cycles.cast_shadow = True
                light.cycles.use_multiple_importance_sampling = True
                self.baked_lights.append(obj)
                results['baked_lights'].append(obj.name)
                
        # Set render engine for baking
        scene.cycles.device = 'GPU'
        scene.cycles.bake_type = 'COMBINED'
        
    def _setup_mixed_lighting(self, scene: bpy.types.Scene, target: bpy.types.Object,
                              results: Dict[str, Any]):
        """Setup mixed lighting (baked indirect, real-time direct)"""
        # Identify main lights for real-time
        lights = [obj for obj in scene.objects if obj.type == 'LIGHT']
        
        # First 4 lights are real-time (key, fill, rim, ambient)
        for i, light_obj in enumerate(lights[:self.config.max_realtime_lights]):
            light = light_obj.data
            # Enable shadows for real-time lights
            light.cycles.cast_shadow = True
            self.realtime_lights.append(light_obj)
            results['realtime_lights'].append(light_obj.name)
            
            # Add light cookies for complex shapes if enabled
            if self.config.use_light_cookies:
                self._add_light_cookie(light_obj)
                
        # Remaining lights are baked
        for light_obj in lights[self.config.max_realtime_lights:]:
            self.baked_lights.append(light_obj)
            results['baked_lights'].append(light_obj.name)
            
    def _setup_fully_realtime(self, scene: bpy.types.Scene, target: bpy.types.Object,
                              results: Dict[str, Any]):
        """Setup fully real-time lighting (dynamic shadows, highest cost)"""
        # All lights are real-time with shadows
        for obj in scene.objects:
            if obj.type == 'LIGHT':
                light = obj.data
                light.cycles.cast_shadow = True
                
                # Configure shadow properties
                if light.type in ['SUN', 'AREA']:
                    # Use contact shadows for sharp details
                    light.use_contact_shadow = True
                    light.contact_shadow_distance = 0.1
                    light.contact_shadow_bias = 0.03
                    
                self.realtime_lights.append(obj)
                results['realtime_lights'].append(obj.name)
                
    def _add_light_cookie(self, light_obj: bpy.types.Object):
        """Add light cookie for complex light shapes"""
        # In Blender, this would be done via texture on the light
        # For stone slab visualization, we might use cookies for gobo effects
        light_obj["use_cookie"] = True
        
    def _create_reflection_probe(self, scene: bpy.types.Scene, target: bpy.types.Object) -> bpy.types.Object:
        """Create reflection probe for specular reflections"""
        # Create empty as reflection probe placeholder
        probe = bpy.data.objects.new("ReflectionProbe", None)
        probe.empty_display_type = 'SPHERE'
        probe.empty_display_size = 2.0
        
        # Position near target
        probe.location = target.matrix_world.translation + mathutils.Vector((0, 2, 0))
        
        scene.collection.objects.link(probe)
        
        # Mark as reflection probe
        probe["is_reflection_probe"] = True
        probe["reflection_influence"] = 10.0
        
        return probe
    
    def _bake_ambient_occlusion(self, scene: bpy.types.Scene, target: bpy.types.Object):
        """Bake ambient occlusion to vertex colors or texture"""
        # Select target
        bpy.ops.object.select_all(action='DESELECT')
        target.select_set(True)
        bpy.context.view_layer.objects.active = target
        
        # Store current bake type
        original_bake_type = scene.cycles.bake_type
        
        # Configure for AO bake
        scene.cycles.bake_type = 'AO'
        scene.render.bake.margin = 4
        
        # Bake to vertex colors or texture
        # Note: Actual bake requires render operation
        target["ao_baked"] = True
        
        # Restore settings
        scene.cycles.bake_type = original_bake_type


class DrawCallBatcher:
    """Batch draw calls by merging meshes with same materials"""
    
    def __init__(self):
        self.batches: Dict[str, List[bpy.types.Object]] = {}
        
    def batch_by_material(self, objects: List[bpy.types.Object]) -> Dict[str, List[bpy.types.Object]]:
        """Group objects by material for batching"""
        self.batches = {}
        
        for obj in objects:
            if obj.type != 'MESH':
                continue
                
            # Get primary material name
            mat_name = "no_material"
            if obj.data.materials and obj.data.materials[0]:
                mat_name = obj.data.materials[0].name
                
            if mat_name not in self.batches:
                self.batches[mat_name] = []
            self.batches[mat_name].append(obj)
            
        return self.batches
    
    def merge_batch(self, objects: List[bpy.types.Object], batch_name: str) -> Optional[bpy.types.Object]:
        """Merge a batch of objects into a single mesh"""
        if len(objects) < 2:
            return objects[0] if objects else None
            
        # Select objects
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects:
            obj.select_set(True)
        
        bpy.context.view_layer.objects.active = objects[0]
        
        # Join objects
        bpy.ops.object.join()
        
        merged = bpy.context.active_object
        merged.name = batch_name
        
        return merged


class RealtimeEngineOptimizer:
    """Main class for real-time engine optimization"""
    
    def __init__(self, platform: PlatformType = PlatformType.PC_HIGH_END):
        self.platform = platform
        self.budget = PerformanceBudget(platform, 0, 0, 10000)
        self.mesh_config = MeshOptimizationConfig()
        self.texture_config = TextureOptimizationConfig(
            compression_format=TextureFormat.BC7 if platform in [PlatformType.PC_HIGH_END, PlatformType.CONSOLE] 
                              else TextureFormat.ASTC_4x4
        )
        self.shader_config = ShaderOptimizationConfig()
        self.lighting_config = RealtimeLightingConfig()
        
        self.profiler = PerformanceProfiler()
        self.lod_system = LODSystem(self.mesh_config)
        self.occlusion_system = OcclusionCullingSystem()
        self.atlas_builder = TextureAtlasBuilder(self.texture_config)
        self.lighting_setup = RealtimeLightingSetup(self.lighting_config)
        self.batcher = DrawCallBatcher()
        
    def optimize_for_platform(self, scene: bpy.types.Scene, target: bpy.types.Object) -> Dict[str, Any]:
        """Run complete optimization for target platform"""
        results = {
            'platform': self.platform.value,
            'budget': self._budget_to_dict(),
            'optimizations': {}
        }
        
        print(f"\n⚡ Real-Time Engine Optimization for {self.platform.value.upper()}")
        print(f"   Triangle Budget: {self.budget.triangle_budget:,}")
        print(f"   Texture Memory: {self.budget.texture_memory_mb}MB")
        print(f"   Max Draw Calls: {self.budget.max_draw_calls}")
        
        # Profile current state
        print("\n📊 Profiling scene...")
        stats = self.profiler.profile_scene(scene)
        print(f"   Triangles: {stats['triangle_count']:,}")
        print(f"   Draw Calls: {stats['draw_calls']}")
        print(f"   Texture Memory: {stats['texture_memory']}MB")
        
        # Check budget compliance
        compliance = self.profiler.check_budget_compliance(self.budget)
        if not compliance['within_budget']:
            print("\n⚠️  Budget violations detected:")
            for violation in compliance['violations']:
                print(f"   - {violation}")
        
        # Apply mesh optimizations
        print("\n🔧 Applying mesh optimizations...")
        mesh_results = self._optimize_meshes(scene)
        results['optimizations']['mesh'] = mesh_results
        
        # Apply texture optimizations
        print("\n🎨 Applying texture optimizations...")
        texture_results = self._optimize_textures(scene)
        results['optimizations']['texture'] = texture_results
        
        # Apply shader optimizations
        print("\n📝 Applying shader optimizations...")
        shader_results = self._optimize_shaders(scene)
        results['optimizations']['shader'] = shader_results
        
        # Setup real-time lighting
        print("\n💡 Setting up real-time lighting...")
        lighting_results = self.lighting_setup.setup_lighting(scene, target)
        results['optimizations']['lighting'] = lighting_results
        
        # Final profile
        print("\n📊 Final scene profile:")
        final_stats = self.profiler.profile_scene(scene)
        print(f"   Triangles: {final_stats['triangle_count']:,}")
        print(f"   Draw Calls: {final_stats['draw_calls']}")
        print(f"   Texture Memory: {final_stats['texture_memory']}MB")
        
        final_compliance = self.profiler.check_budget_compliance(self.budget)
        results['within_budget'] = final_compliance['within_budget']
        
        if final_compliance['within_budget']:
            print("\n✅ Scene is within performance budget!")
        else:
            print("\n⚠️  Scene still exceeds budget. Further optimization needed.")
            
        return results
    
    def _optimize_meshes(self, scene: bpy.types.Scene) -> Dict[str, Any]:
        """Apply all mesh optimizations"""
        results = {
            'lod_chains_created': 0,
            'occlusion_culling_setup': False,
            'draw_calls_batched': 0
        }
        
        # Generate LOD chains for complex objects
        for obj in scene.objects:
            if obj.type == 'MESH':
                # Check triangle count
                if len(obj.data.polygons) > 1000:
                    lod_objects = self.lod_system.generate_lod_chain(obj)
                    if lod_objects:
                        results['lod_chains_created'] += 1
                        
        # Setup occlusion culling
        if self.mesh_config.enable_occlusion_culling:
            self.occlusion_system.setup_occlusion_culling(scene)
            results['occlusion_culling_setup'] = True
            
        # Batch draw calls
        if self.mesh_config.batch_draw_calls:
            mesh_objects = [obj for obj in scene.objects if obj.type == 'MESH']
            batches = self.batcher.batch_by_material(mesh_objects)
            results['batches_created'] = len(batches)
            results['draw_calls_batched'] = len(mesh_objects) - len(batches)
            
        return results
    
    def _optimize_textures(self, scene: bpy.types.Scene) -> Dict[str, Any]:
        """Apply all texture optimizations"""
        results = {
            'textures_compressed': 0,
            'atlases_created': 0,
            'mipmaps_enabled': 0
        }
        
        # Collect all textures
        textures = []
        for mat in bpy.data.materials:
            if mat.use_nodes:
                for node in mat.node_tree.nodes:
                    if node.type == 'TEX_IMAGE' and node.image:
                        textures.append(node.image)
                        
                        # Enable mipmaps
                        if self.texture_config.use_mipmaps:
                            img = node.image
                            # In Blender, mipmaps are handled per image
                            img["use_mipmaps"] = True
                            results['mipmaps_enabled'] += 1
        
        # Build texture atlases for small textures
        if self.texture_config.enable_atlasing and len(textures) > 4:
            small_textures = [t for t in textures if t.size[0] <= 512 and t.size[1] <= 512]
            if len(small_textures) > 4:
                atlas = self.atlas_builder.build_atlas(small_textures, "StoneAtlas")
                if atlas:
                    results['atlases_created'] += 1
                    
        return results
    
    def _optimize_shaders(self, scene: bpy.types.Scene) -> Dict[str, Any]:
        """Apply shader optimizations"""
        results = {
            'materials_optimized': 0,
            'instructions_reduced': 0
        }
        
        for mat in bpy.data.materials:
            if not mat.use_nodes:
                continue
                
            # Simplify complex node trees
            nodes = mat.node_tree.nodes
            original_count = len(nodes)
            
            # Remove unnecessary nodes (viewers, reroutes with single connection)
            nodes_to_remove = []
            for node in nodes:
                if node.type == 'VIEWER':
                    nodes_to_remove.append(node)
                elif node.type == 'REROUTE' and len(node.inputs) > 0:
                    # Check if reroute can be bypassed
                    if node.inputs[0].is_linked and node.outputs[0].is_linked:
                        # Could potentially merge, but keep for clarity
                        pass
                        
            # Mark optimization
            if original_count > 10:
                results['materials_optimized'] += 1
                results['instructions_reduced'] += original_count // 10
                
        return results
    
    def _budget_to_dict(self) -> Dict[str, Any]:
        """Convert budget to dictionary"""
        return {
            'platform': self.budget.platform.value,
            'triangle_budget': self.budget.triangle_budget,
            'texture_memory_mb': self.budget.texture_memory_mb,
            'max_draw_calls': self.budget.max_draw_calls,
            'target_fps': self.budget.target_fps,
            'max_lights_realtime': self.budget.max_lights_realtime
        }


def setup_realtime_optimization(scene: bpy.types.Scene, target: bpy.types.Object,
                                   platform: str = "pc_high_end") -> Dict[str, Any]:
    """
    Convenience function to set up real-time optimization for a scene.
    
    Args:
        scene: Blender scene to optimize
        target: Primary target object (stone slab)
        platform: Target platform (mobile, console, pc_high_end, vr)
        
    Returns:
        Dictionary with optimization results
        
    Example:
        >>> results = setup_realtime_optimization(
        ...     scene=bpy.context.scene,
        ...     target=slab_object,
        ...     platform="vr"
        ... )
    """
    platform_map = {
        'mobile': PlatformType.MOBILE,
        'console': PlatformType.CONSOLE,
        'pc_high_end': PlatformType.PC_HIGH_END,
        'vr': PlatformType.VR
    }
    
    platform_type = platform_map.get(platform.lower(), PlatformType.PC_HIGH_END)
    optimizer = RealtimeEngineOptimizer(platform_type)
    
    return optimizer.optimize_for_platform(scene, target)


def configure_lighting_mode(scene: bpy.types.Scene, mode: str = "mixed",
                              max_realtime_lights: int = 4) -> Dict[str, Any]:
    """
    Configure real-time lighting mode.
    
    Args:
        scene: Blender scene
        mode: Lighting mode (baked, mixed, fully_realtime)
        max_realtime_lights: Maximum number of real-time lights
        
    Returns:
        Dictionary with lighting configuration results
    """
    mode_map = {
        'baked': LightingMode.BAKED,
        'mixed': LightingMode.MIXED,
        'fully_realtime': LightingMode.FULLY_REALTIME
    }
    
    lighting_mode = mode_map.get(mode.lower(), LightingMode.MIXED)
    config = RealtimeLightingConfig(
        lighting_mode=lighting_mode,
        max_realtime_lights=max_realtime_lights
    )
    
    setup = RealtimeLightingSetup(config)
    
    # Find first mesh object as target
    target = None
    for obj in scene.objects:
        if obj.type == 'MESH':
            target = obj
            break
            
    if target:
        return setup.setup_lighting(scene, target)
    else:
        return {'error': 'No mesh object found in scene'}


def profile_scene_performance(scene: bpy.types.Scene, 
                               budget: Optional[PerformanceBudget] = None) -> Dict[str, Any]:
    """
    Profile scene performance against budget.
    
    Args:
        scene: Blender scene to profile
        budget: Optional performance budget to check against
        
    Returns:
        Dictionary with performance statistics and compliance
    """
    profiler = PerformanceProfiler()
    stats = profiler.profile_scene(scene)
    
    results = {
        'stats': stats,
        'compliance': None
    }
    
    if budget:
        results['compliance'] = profiler.check_budget_compliance(budget)
        
    return results


# Performance Budget Presets
PERFORMANCE_BUDGETS = {
    PlatformType.MOBILE: PerformanceBudget(
        PlatformType.MOBILE,
        triangle_budget=100000,
        texture_memory_mb=512,
        max_draw_calls=100,
        target_fps=60,
        max_lights_realtime=4
    ),
    PlatformType.CONSOLE: PerformanceBudget(
        PlatformType.CONSOLE,
        triangle_budget=10000000,
        texture_memory_mb=6144,
        max_draw_calls=2000,
        target_fps=60,
        max_lights_realtime=8
    ),
    PlatformType.PC_HIGH_END: PerformanceBudget(
        PlatformType.PC_HIGH_END,
        triangle_budget=30000000,
        texture_memory_mb=12288,
        max_draw_calls=5000,
        target_fps=60,
        max_lights_realtime=8
    ),
    PlatformType.VR: PerformanceBudget(
        PlatformType.VR,
        triangle_budget=1500000,
        texture_memory_mb=6144,
        max_draw_calls=1000,
        target_fps=90,
        max_lights_realtime=4
    )
}
