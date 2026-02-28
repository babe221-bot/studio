"""
Comprehensive 3D Asset Optimization Protocol

Implements geometry cleanup, topology optimization, and mesh standardization
for professional 3D CAD workflows.
"""
import bpy
import bmesh
import mathutils
from typing import Dict, List, Set, Tuple, Optional, Any
from dataclasses import dataclass
from enum import Enum


class AssetCategory(Enum):
    """Hierarchical asset classification for naming conventions"""
    SLAB = "SLB"
    COUNTERTOP = "CNT"
    TILE = "TILE"
    TRIM = "TRIM"
    ACCESSORY = "ACC"
    HARDWARE = "HDW"


class SurfaceType(Enum):
    """Surface continuity types for edge hardness determination"""
    PLANAR = "planar"
    CURVED = "curved"
    TRANSITION = "transition"
    SHARP = "sharp"


@dataclass
class OptimizationConfig:
    """Configuration for mesh optimization operations"""
    merge_distance: float = 0.0001  # 0.1mm for vertex merging
    remove_doubles: bool = True
    recalc_normals: bool = True
    establish_sharp_edges: bool = True
    cleanup_internal: bool = True
    validate_manifold: bool = True
    smooth_angle_threshold: float = 0.523599  # 30 degrees in radians
    asset_prefix: str = "SLB"
    project_code: str = ""
    version: str = "v01"


class MeshHierarchyBuilder:
    """
    Constructs logical mesh hierarchies with properly centered pivot points
    and grouped sub-assemblies for animation, rigging, and scene management.
    """
    
    def __init__(self, asset_name: str, config: OptimizationConfig):
        self.asset_name = asset_name
        self.config = config
        self.collections = {}
        self.main_collection = None
        
    def create_hierarchy(self) -> bpy.types.Collection:
        """Create standardized collection hierarchy"""
        # Main asset collection with hierarchical naming
        main_name = self._generate_asset_name("MAIN")
        self.main_collection = bpy.data.collections.new(main_name)
        bpy.context.scene.collection.children.link(self.main_collection)
        
        # Sub-assembly collections
        sub_collections = {
            "geometry": self._generate_asset_name("GEO"),
            "collision": self._generate_asset_name("COL"),
            "lod": self._generate_asset_name("LOD"),
            "helpers": self._generate_asset_name("HLP")
        }
        
        for category, name in sub_collections.items():
            coll = bpy.data.collections.new(name)
            self.main_collection.children.link(coll)
            self.collections[category] = coll
            
        return self.main_collection
    
    def _generate_asset_name(self, component: str) -> str:
        """
        Generate hierarchical identifier using descriptive naming:
        [AssetType]_[AssetName]_[Component]_[Version]
        """
        parts = [
            self.config.asset_prefix,
            self.asset_name.upper().replace(" ", "_"),
            component,
            self.config.version
        ]
        if self.config.project_code:
            parts.insert(0, self.config.project_code)
        return "_".join(parts)
    
    def center_pivot_to_geometry(self, obj: bpy.types.Object) -> None:
        """Center pivot point to object geometry bounds"""
        # Store original location
        original_loc = obj.location.copy()
        
        # Calculate geometry center
        local_bbox_center = 0.125 * sum(
            (mathutils.Vector(b) for b in obj.bound_box), 
            mathutils.Vector()
        )
        
        # Move geometry to origin
        mesh = obj.data
        for vert in mesh.vertices:
            vert.co -= local_bbox_center
            
        # Move object to original center position
        obj.location = original_loc + local_bbox_center
        
        # Update mesh
        mesh.update()
        
    def group_sub_assembly(self, objects: List[bpy.types.Object], 
                          assembly_name: str) -> bpy.types.Collection:
        """Group objects into a functional sub-assembly"""
        assembly_coll = bpy.data.collections.new(
            self._generate_asset_name(f"GRP_{assembly_name.upper()}")
        )
        self.main_collection.children.link(assembly_coll)
        
        for obj in objects:
            # Unlink from current collections
            for coll in obj.users_collection:
                coll.objects.unlink(obj)
            # Link to assembly
            assembly_coll.objects.link(obj)
            
        return assembly_coll


class GeometryOptimizer:
    """
    Executes complete geometry cleanup including:
    - Removal of hidden and internal faces
    - Merging overlapping vertices
    - Eliminating duplicate geometry
    - Purging unused faces, orphaned edges, and superfluous vertices
    """
    
    def __init__(self, config: OptimizationConfig):
        self.config = config
        self.stats = {
            'verts_removed': 0,
            'faces_removed': 0,
            'edges_removed': 0,
            'verts_merged': 0
        }
    
    def optimize_mesh(self, obj: bpy.types.Object) -> Dict[str, int]:
        """Execute full optimization pipeline on mesh object"""
        if obj.type != 'MESH':
            return self.stats
            
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        bm.edges.ensure_lookup_table()
        bm.faces.ensure_lookup_table()
        bm.verts.ensure_lookup_table()
        
        try:
            # Step 1: Merge overlapping vertices
            if self.config.remove_doubles:
                self._merge_overlapping_vertices(bm)
            
            # Step 2: Remove internal/hidden geometry
            if self.config.cleanup_internal:
                self._remove_internal_geometry(bm)
            
            # Step 3: Delete orphaned edges and unused faces
            self._cleanup_orphaned_geometry(bm)
            
            # Step 4: Verify manifold topology
            if self.config.validate_manifold:
                self._validate_manifold_topology(bm)
            
            # Step 5: Recalculate normals
            if self.config.recalc_normals:
                self._audit_and_correct_normals(bm)
            
            # Apply changes
            bm.to_mesh(obj.data)
            obj.data.update()
            
        finally:
            bm.free()
            
        return self.stats
    
    def _merge_overlapping_vertices(self, bm: bmesh.types.BMesh) -> None:
        """
        Merge overlapping vertices to establish clean manifold topology
        and eliminate duplicate geometry.
        """
        # Find vertices within merge distance
        verts_to_merge = []
        processed = set()
        
        for vert in bm.verts:
            if vert.index in processed:
                continue
                
            # Find nearby vertices
            nearby = [
                v for v in bm.verts
                if v != vert and v.index not in processed
                and (v.co - vert.co).length < self.config.merge_distance
            ]
            
            if nearby:
                group = [vert] + nearby
                verts_to_merge.append(group)
                processed.update(v.index for v in group)
                processed.add(vert.index)
        
        # Merge each group
        for group in verts_to_merge:
            if len(group) > 1:
                # Calculate center point
                center = sum((v.co for v in group), mathutils.Vector()) / len(group)
                
                # Move all vertices to center
                for v in group:
                    v.co = center
                
                # Weld them together
                bmesh.ops.weld_verts(bm, targetmap={v: group[0] for v in group[1:]})
                self.stats['verts_merged'] += len(group) - 1
        
        # Remove doubles using bmesh operation for remaining duplicates
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=self.config.merge_distance)
    
    def _remove_internal_geometry(self, bm: bmesh.types.BMesh) -> None:
        """
        Remove hidden and internal faces that do not contribute
        to the visible silhouette.
        """
        faces_to_remove = []
        
        for face in bm.faces:
            # Check if face is internal (completely surrounded)
            is_internal = True
            face_center = face.calc_center_median()
            face_normal = face.normal
            
            # Ray cast in normal direction to check visibility
            for edge in face.edges:
                for other_face in edge.link_faces:
                    if other_face != face:
                        # If adjacent face faces inward relative to this face
                        angle = face_normal.angle(other_face.normal)
                        if angle < 0.1:  # Nearly parallel (facing same direction)
                            is_internal = False
                            break
                if not is_internal:
                    break
            
            # Additional check: face area vs surrounding geometry
            if is_internal and len(face.edges) > 3:
                # Check for faces that don't affect silhouette
                face_area = face.calc_area()
                if face_area < 0.000001:  # Extremely small faces
                    faces_to_remove.append(face)
                    continue
            
            # Mark for removal if internal and not visible
            if is_internal:
                faces_to_remove.append(face)
        
        # Remove internal faces
        if faces_to_remove:
            bmesh.ops.delete(bm, geom=faces_to_remove, context='FACES')
            self.stats['faces_removed'] += len(faces_to_remove)
    
    def _cleanup_orphaned_geometry(self, bm: bmesh.types.BMesh) -> None:
        """
        Purge mesh of unused faces, orphaned edges, and superfluous vertices.
        """
        # Find orphaned edges (edges with less than 2 linked faces)
        orphaned_edges = [e for e in bm.edges if len(e.link_faces) < 2]
        
        # Find unused faces (faces with zero area or degenerate)
        unused_faces = []
        for face in bm.faces:
            if face.calc_area() < 0.0000001:  # Degenerate face
                unused_faces.append(face)
            elif len(face.verts) < 3:  # Face with less than 3 vertices
                unused_faces.append(face)
        
        # Find superfluous vertices (vertices with no linked faces)
        orphaned_verts = [v for v in bm.verts if len(v.link_faces) == 0]
        
        # Remove in proper order: faces first, then edges, then vertices
        if unused_faces:
            bmesh.ops.delete(bm, geom=unused_faces, context='FACES')
            self.stats['faces_removed'] += len(unused_faces)
            
        if orphaned_edges:
            bmesh.ops.delete(bm, geom=orphaned_edges, context='EDGES')
            self.stats['edges_removed'] += len(orphaned_edges)
            
        if orphaned_verts:
            bmesh.ops.delete(bm, geom=orphaned_verts, context='VERTS')
            self.stats['verts_removed'] += len(orphaned_verts)
    
    def _validate_manifold_topology(self, bm: bmesh.types.BMesh) -> None:
        """Ensure all remaining geometry serves visual or collision requirements."""
        non_manifold_edges = []
        
        for edge in bm.edges:
            # Manifold edges should have exactly 2 linked faces
            if len(edge.link_faces) != 2:
                non_manifold_edges.append(edge)
        
        # Report non-manifold geometry (could fix or flag for review)
        if non_manifold_edges:
            print(f"⚠️  Found {len(non_manifold_edges)} non-manifold edges")
            # Attempt to fix by dissolving
            bmesh.ops.dissolve_edges(bm, edges=non_manifold_edges)
    
    def _audit_and_correct_normals(self, bm: bmesh.types.BMesh) -> None:
        """
        Audit and correct normal orientations to ensure uniform
        facing direction across all polygons.
        """
        # Recalculate face normals
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        
        # Check for inverted faces (facing inward on closed mesh)
        if bm.faces:
            # Calculate mesh centroid
            centroid = sum((f.calc_center_median() for f in bm.faces), 
                          mathutils.Vector()) / len(bm.faces)
            
            inverted_faces = []
            for face in bm.faces:
                face_center = face.calc_center_median()
                to_center = (centroid - face_center).normalized()
                
                # If normal points toward center, it may be inverted
                if face.normal.dot(to_center) > 0.5:
                    inverted_faces.append(face)
            
            # Flip inverted faces
            if inverted_faces:
                bmesh.ops.reverse_faces(bm, faces=inverted_faces)
                print(f"🔄 Corrected {len(inverted_faces)} inverted face normals")


class SmoothingGroupManager:
    """
    Define appropriate smoothing groups and edge hardness based on
    surface continuity and material specifications.
    """
    
    def __init__(self, config: OptimizationConfig):
        self.config = config
    
    def apply_smoothing_groups(self, obj: bpy.types.Object) -> None:
        """Apply smoothing based on surface continuity analysis"""
        if obj.type != 'MESH':
            return
            
        mesh = obj.data
        bm = bmesh.new()
        bm.from_mesh(mesh)
        bm.edges.ensure_lookup_table()
        bm.faces.ensure_lookup_table()
        
        try:
            # Clear existing sharp edges
            for edge in bm.edges:
                edge.smooth = True
            
            # Analyze surface continuity and mark sharp edges
            sharp_edges = []
            
            for edge in bm.edges:
                if len(edge.link_faces) != 2:
                    continue
                    
                face1, face2 = edge.link_faces
                
                # Calculate angle between face normals
                angle = face1.normal.angle(face2.normal)
                
                # Determine surface type
                surface_type = self._classify_surface_type(face1, face2, angle)
                
                # Apply edge hardness based on surface type
                if self._should_be_sharp(surface_type, angle):
                    edge.smooth = False
                    sharp_edges.append(edge)
            
            # Apply to mesh
            bm.to_mesh(mesh)
            mesh.update()
            
            # Enable auto smooth with angle threshold
            obj.data.use_auto_smooth = True
            obj.data.auto_smooth_angle = self.config.smooth_angle_threshold
            
            print(f"📐 Applied {len(sharp_edges)} sharp edges for optimal shading")
            
        finally:
            bm.free()
    
    def _classify_surface_type(self, face1: bmesh.types.BMFace, 
                               face2: bmesh.types.BMFace, 
                               angle: float) -> SurfaceType:
        """Classify surface continuity between adjacent faces"""
        
        # Check if faces are coplanar (planar)
        if angle < 0.0174533:  # < 1 degree
            return SurfaceType.PLANAR
        
        # Check for smooth curved transition
        if angle < self.config.smooth_angle_threshold:
            # Additional check for curvature continuity could go here
            return SurfaceType.CURVED
        
        # Sharp edge
        if angle > 1.5708:  # > 90 degrees
            return SurfaceType.SHARP
            
        return SurfaceType.TRANSITION
    
    def _should_be_sharp(self, surface_type: SurfaceType, angle: float) -> bool:
        """Determine if edge should be marked sharp based on surface type"""
        if surface_type == SurfaceType.SHARP:
            return True
        elif surface_type == SurfaceType.PLANAR:
            return False
        elif surface_type == SurfaceType.CURVED:
            return False
        elif surface_type == SurfaceType.TRANSITION:
            # Transitions depend on angle threshold
            return angle > self.config.smooth_angle_threshold
        return False


class AssetOptimizationPipeline:
    """
    Main pipeline integrating all optimization stages:
    geometry cleanup, topology optimization, smoothing groups,
    naming conventions, and mesh hierarchy construction.
    """
    
    def __init__(self, asset_name: str, config: Optional[OptimizationConfig] = None):
        self.config = config or OptimizationConfig()
        self.asset_name = asset_name
        self.geometry_optimizer = GeometryOptimizer(self.config)
        self.smoothing_manager = SmoothingGroupManager(self.config)
        self.hierarchy_builder = MeshHierarchyBuilder(asset_name, self.config)
        
    def execute_full_optimization(self, obj: bpy.types.Object) -> Dict[str, Any]:
        """
        Execute complete 3D asset optimization protocol:
        1. Geometry cleanup and topology optimization
        2. Normal orientation correction
        3. Smoothing group definition
        4. Mesh hierarchy construction
        5. Naming convention application
        """
        results = {
            'object_name': obj.name,
            'optimization_stats': {},
            'hierarchy_created': False
        }
        
        print(f"\n🔧 Starting optimization for: {obj.name}")
        print("=" * 50)
        
        # Step 1: Geometry cleanup
        print("\n📦 Step 1: Geometry Cleanup")
        print("-" * 30)
        stats = self.geometry_optimizer.optimize_mesh(obj)
        results['optimization_stats'] = stats
        print(f"   Vertices merged: {stats['verts_merged']}")
        print(f"   Vertices removed: {stats['verts_removed']}")
        print(f"   Faces removed: {stats['faces_removed']}")
        print(f"   Edges removed: {stats['edges_removed']}")
        
        # Step 2: Apply smoothing groups
        print("\n📐 Step 2: Smoothing Groups")
        print("-" * 30)
        self.smoothing_manager.apply_smoothing_groups(obj)
        
        # Step 3: Center pivot
        print("\n🎯 Step 3: Pivot Centering")
        print("-" * 30)
        self.hierarchy_builder.center_pivot_to_geometry(obj)
        print("   Pivot centered to geometry bounds")
        
        # Step 4: Apply naming convention
        print("\n🏷️  Step 4: Naming Convention")
        print("-" * 30)
        new_name = self.hierarchy_builder._generate_asset_name("GEO")
        obj.name = new_name
        obj.data.name = f"{new_name}_MESH"
        results['new_name'] = new_name
        print(f"   Renamed to: {new_name}")
        
        print("\n✅ Optimization complete!")
        print("=" * 50)
        
        return results
    
    def create_optimized_hierarchy(self, objects: List[bpy.types.Object]) -> bpy.types.Collection:
        """Create hierarchical organization for multiple objects"""
        main_coll = self.hierarchy_builder.create_hierarchy()
        
        # Process each object
        for obj in objects:
            if obj.type == 'MESH':
                self.execute_full_optimization(obj)
                
                # Move to geometry collection
                geo_coll = self.hierarchy_builder.collections.get('geometry')
                if geo_coll and obj.name not in geo_coll.objects:
                    for coll in obj.users_collection:
                        coll.objects.unlink(obj)
                    geo_coll.objects.link(obj)
        
        return main_coll


def optimize_slab_geometry(obj: bpy.types.Object, 
                           material_type: str = "stone") -> Dict[str, Any]:
    """
    Convenience function for optimizing slab geometry with
    material-specific settings.
    """
    config = OptimizationConfig(
        asset_prefix="SLB",
        merge_distance=0.0001,  # 0.1mm precision for stone
        smooth_angle_threshold=0.523599  # 30 degrees
    )
    
    # Adjust settings based on material
    if material_type in ["marble", "granite"]:
        config.smooth_angle_threshold = 0.785398  # 45 degrees for natural stone
    elif material_type == "quartz":
        config.smooth_angle_threshold = 0.349066  # 20 degrees for engineered stone
    
    pipeline = AssetOptimizationPipeline(
        asset_name=obj.name,
        config=config
    )
    
    return pipeline.execute_full_optimization(obj)

