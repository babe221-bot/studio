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
    Comprehensive mesh topology refinement system executing three critical cleanup phases:
    
    Phase 1: Sub-millimeter Vertex Consolidation
        - Welds coincident vertices within 0.1mm tolerance using bmesh operations
        - Establishes watertight manifold topology
        - Eliminates redundant coordinate data
    
    Phase 2: Occluded Geometry Elimination
        - Ray-casting visibility analysis from multiple external viewpoints
        - Identifies and removes internal faces hidden from all external views
        - Removes geometry contributing no visible silhouette information
    
    Phase 3: Topological Sanitation
        - Purges degenerate zero-area faces
        - Dissolves orphaned edges lacking dual-face connectivity
        - Deletes superfluous vertices with null face adjacency
        - Ensures optimal geometric data structures with only render-relevant elements
    """
    
    def __init__(self, config: OptimizationConfig):
        self.config = config
        self.stats = {
            'verts_removed': 0,
            'faces_removed': 0,
            'edges_removed': 0,
            'verts_merged': 0,
            'internal_faces_removed': 0,
            'degenerate_faces_removed': 0,
            'orphaned_edges_dissolved': 0,
            'superfluous_verts_deleted': 0
        }
        # 0.1mm tolerance for sub-millimeter vertex consolidation
        self.weld_tolerance = 0.0001  # 0.1mm in Blender units (meters)
    
    def optimize_mesh(self, obj: bpy.types.Object) -> Dict[str, int]:
        """
        Execute comprehensive three-phase optimization pipeline on mesh object.
        Returns detailed statistics for each cleanup phase.
        """
        if obj.type != 'MESH':
            return self.stats
            
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        
        # Ensure lookup tables for efficient processing
        bm.verts.ensure_lookup_table()
        bm.edges.ensure_lookup_table()
        bm.faces.ensure_lookup_table()
        
        try:
            print(f"\n🔧 GeometryOptimizer: Processing '{obj.name}'")
            print("=" * 60)
            
            # Phase 1: Sub-millimeter Vertex Consolidation
            print("\n📌 Phase 1: Sub-millimeter Vertex Consolidation (0.1mm tolerance)")
            print("-" * 60)
            self._phase1_vertex_consolidation(bm)
            print(f"   ✓ Vertices merged: {self.stats['verts_merged']}")
            
            # Phase 2: Occluded Geometry Elimination
            print("\n📌 Phase 2: Occluded Geometry Elimination (Ray-casting)")
            print("-" * 60)
            self._phase2_occluded_geometry_removal(bm)
            print(f"   ✓ Internal faces removed: {self.stats['internal_faces_removed']}")
            
            # Phase 3: Topological Sanitation
            print("\n📌 Phase 3: Topological Sanitation")
            print("-" * 60)
            self._phase3_topological_sanitation(bm)
            print(f"   ✓ Degenerate faces removed: {self.stats['degenerate_faces_removed']}")
            print(f"   ✓ Orphaned edges dissolved: {self.stats['orphaned_edges_dissolved']}")
            print(f"   ✓ Superfluous vertices deleted: {self.stats['superfluous_verts_deleted']}")
            
            # Final validation and normal correction
            if self.config.validate_manifold:
                self._validate_manifold_topology(bm)
            
            if self.config.recalc_normals:
                self._audit_and_correct_normals(bm)
            
            # Apply changes to mesh
            bm.to_mesh(obj.data)
            obj.data.update()
            
            print("\n✅ GeometryOptimizer: Optimization complete!")
            print("=" * 60)
            
        finally:
            bm.free()
            
        return self.stats
    
    def _phase1_vertex_consolidation(self, bm: bmesh.types.BMesh) -> None:
        """
        Phase 1: Sub-millimeter Vertex Consolidation
        
        Welds coincident vertices within 0.1mm tolerance using bmesh operations
        to establish watertight manifold topology while eliminating redundant 
        coordinate data.
        """
        initial_vert_count = len(bm.verts)
        
        # Use bmesh's find_doubles for efficient spatial search
        # This finds all vertices within the weld tolerance
        welded_verts = bmesh.ops.find_doubles(
            bm,
            verts=bm.verts,
            dist=self.weld_tolerance
        )['targetmap']
        
        # Count vertices that will be welded
        verts_to_weld_count = len(welded_verts)
        
        if verts_to_weld_count > 0:
            # Weld the found doubles using bmesh weld_verts operation
            # This merges vertices at their average position
            bmesh.ops.weld_verts(bm, targetmap=welded_verts)
            self.stats['verts_merged'] += verts_to_weld_count
            
            # Re-ensure lookup tables after structural changes
            bm.verts.ensure_lookup_table()
            bm.edges.ensure_lookup_table()
            bm.faces.ensure_lookup_table()
        
        # Secondary pass: Remove any remaining doubles with bmesh operation
        # This catches any edge cases from the first pass
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=self.weld_tolerance)
        
        final_vert_count = len(bm.verts)
        actual_merged = initial_vert_count - final_vert_count
        self.stats['verts_merged'] = actual_merged
        
        print(f"   Initial vertices: {initial_vert_count}")
        print(f"   Final vertices: {final_vert_count}")
        print(f"   Weld tolerance: {self.weld_tolerance * 1000:.2f}mm")
    
    def _phase2_occluded_geometry_removal(self, bm: bmesh.types.BMesh) -> None:
        """
        Phase 2: Occluded Geometry Elimination
        
        Performs ray-casting visibility analysis from multiple external viewpoints
        to identify and remove internal faces hidden from external viewpoints that
        contribute no visible silhouette information to rendered output.
        """
        if not bm.faces:
            return
            
        # Calculate mesh bounding box for ray origin calculation
        bbox_min = mathutils.Vector((float('inf'), float('inf'), float('inf')))
        bbox_max = mathutils.Vector((float('-inf'), float('-inf'), float('-inf')))
        
        for vert in bm.verts:
            bbox_min.x = min(bbox_min.x, vert.co.x)
            bbox_min.y = min(bbox_min.y, vert.co.y)
            bbox_min.z = min(bbox_min.z, vert.co.z)
            bbox_max.x = max(bbox_max.x, vert.co.x)
            bbox_max.y = max(bbox_max.y, vert.co.y)
            bbox_max.z = max(bbox_max.z, vert.co.z)
        
        bbox_center = (bbox_min + bbox_max) * 0.5
        bbox_size = (bbox_max - bbox_min).length
        
        # Define multiple external viewpoints for comprehensive visibility testing
        # These positions surround the mesh to catch all potentially visible faces
        ray_origins = self._generate_viewpoints(bbox_center, bbox_size)
        
        # Track faces visible from any viewpoint
        visible_faces = set()
        
        # Create a BVH tree for efficient ray-mesh intersection
        # This is more accurate than simple normal checks
        bvh = mathutils.bvhtree.BVHTree.FromBMesh(bm, epsilon=0.00001)
        
        # For each face, check visibility from multiple viewpoints
        for face in bm.faces:
            face_center = face.calc_center_median()
            face_normal = face.normal.normalized()
            
            is_visible = False
            
            for view_origin in ray_origins:
                # Calculate ray direction from viewpoint to face center
                ray_dir = (face_center - view_origin).normalized()
                
                # Skip if ray direction is opposite to face normal (back-facing)
                if face_normal.dot(ray_dir) < -0.1:
                    continue
                
                # Cast ray from viewpoint toward face center
                # Add small offset to avoid self-intersection
                ray_start = view_origin
                ray_end = face_center + face_normal * 0.0001
                
                # Perform ray cast
                hit_location, hit_normal, hit_index, hit_distance = bvh.ray_cast(
                    ray_start, ray_dir, bbox_size * 2.0
                )
                
                if hit_index is not None:
                    # Check if the hit is close to this face center
                    if (hit_location - face_center).length < self.weld_tolerance * 10:
                        is_visible = True
                        break
                    
                    # Alternative: Check if this face is the closest hit
                    # by comparing face indices
                    try:
                        hit_face = bm.faces[hit_index]
                        if hit_face == face:
                            is_visible = True
                            break
                    except IndexError:
                        pass
            
            if is_visible:
                visible_faces.add(face.index)
        
        # Identify internal (occluded) faces
        internal_faces = [face for face in bm.faces if face.index not in visible_faces]
        
        # Remove internal faces
        if internal_faces:
            bmesh.ops.delete(bm, geom=internal_faces, context='FACES')
            self.stats['internal_faces_removed'] = len(internal_faces)
            self.stats['faces_removed'] += len(internal_faces)
            
            # Update lookup tables
            bm.faces.ensure_lookup_table()
            bm.edges.ensure_lookup_table()
            bm.verts.ensure_lookup_table()
        
        print(f"   Viewpoints tested: {len(ray_origins)}")
        print(f"   Total faces: {len(bm.faces) + len(internal_faces)}")
        print(f"   Visible faces: {len(visible_faces)}")
        print(f"   Internal faces removed: {len(internal_faces)}")
    
    def _generate_viewpoints(self, center: mathutils.Vector, size: float) -> List[mathutils.Vector]:
        """
        Generate external viewpoints surrounding the mesh for comprehensive
        visibility analysis.
        """
        offset = size * 1.5  # Viewpoints at 1.5x bounding box size
        
        # Primary cardinal directions
        viewpoints = [
            center + mathutils.Vector((offset, 0, 0)),      # +X
            center + mathutils.Vector((-offset, 0, 0)),     # -X
            center + mathutils.Vector((0, offset, 0)),      # +Y
            center + mathutils.Vector((0, -offset, 0)),     # -Y
            center + mathutils.Vector((0, 0, offset)),      # +Z
            center + mathutils.Vector((0, 0, -offset)),     # -Z
        ]
        
        # Diagonal viewpoints for edge coverage
        diagonal_offset = offset * 0.707  # 1/sqrt(2)
        viewpoints.extend([
            center + mathutils.Vector((diagonal_offset, diagonal_offset, 0)),
            center + mathutils.Vector((-diagonal_offset, diagonal_offset, 0)),
            center + mathutils.Vector((diagonal_offset, -diagonal_offset, 0)),
            center + mathutils.Vector((-diagonal_offset, -diagonal_offset, 0)),
            center + mathutils.Vector((diagonal_offset, 0, diagonal_offset)),
            center + mathutils.Vector((-diagonal_offset, 0, diagonal_offset)),
            center + mathutils.Vector((0, diagonal_offset, diagonal_offset)),
            center + mathutils.Vector((0, -diagonal_offset, diagonal_offset)),
        ])
        
        return viewpoints
    
    def _phase3_topological_sanitation(self, bm: bmesh.types.BMesh) -> None:
        """
        Phase 3: Topological Sanitation
        
        Purges degenerate zero-area faces, dissolves orphaned edges lacking 
        dual-face connectivity, and deletes superfluous vertices with null 
        face adjacency, ensuring optimal geometric data structures containing 
        only render-relevant elements.
        """
        # Step 3a: Remove degenerate zero-area faces
        degenerate_faces = []
        for face in bm.faces:
            # Check for zero or near-zero area
            face_area = face.calc_area()
            if face_area < 1e-12:  # Zero-area threshold
                degenerate_faces.append(face)
            # Check for faces with less than 3 valid vertices
            elif len(face.verts) < 3:
                degenerate_faces.append(face)
            # Check for collapsed faces (all vertices coincident)
            elif self._is_face_collapsed(face):
                degenerate_faces.append(face)
        
        if degenerate_faces:
            bmesh.ops.delete(bm, geom=degenerate_faces, context='FACES')
            self.stats['degenerate_faces_removed'] = len(degenerate_faces)
            self.stats['faces_removed'] += len(degenerate_faces)
            
            bm.faces.ensure_lookup_table()
            bm.edges.ensure_lookup_table()
        
        # Step 3b: Dissolve orphaned edges (edges with < 2 linked faces)
        orphaned_edges = []
        for edge in bm.edges:
            face_count = len(edge.link_faces)
            # Orphaned: 0 faces (wire edge) or 1 face (boundary on open mesh)
            # For watertight manifold, we want exactly 2 faces per edge
            if face_count < 2:
                orphaned_edges.append(edge)
        
        if orphaned_edges:
            # Use dissolve to cleanly remove without creating holes
            bmesh.ops.dissolve_edges(bm, edges=orphaned_edges, use_verts=True)
            self.stats['orphaned_edges_dissolved'] = len(orphaned_edges)
            self.stats['edges_removed'] += len(orphaned_edges)
            
            bm.edges.ensure_lookup_table()
            bm.verts.ensure_lookup_table()
        
        # Step 3c: Delete superfluous vertices (no face adjacency)
        superfluous_verts = []
        for vert in bm.verts:
            if len(vert.link_faces) == 0:
                # Vertex has no connected faces
                superfluous_verts.append(vert)
        
        if superfluous_verts:
            bmesh.ops.delete(bm, geom=superfluous_verts, context='VERTS')
            self.stats['superfluous_verts_deleted'] = len(superfluous_verts)
            self.stats['verts_removed'] += len(superfluous_verts)
            
            bm.verts.ensure_lookup_table()
        
        print(f"   Degenerate faces purged: {self.stats['degenerate_faces_removed']}")
        print(f"   Orphaned edges dissolved: {self.stats['orphaned_edges_dissolved']}")
        print(f"   Superfluous vertices deleted: {self.stats['superfluous_verts_deleted']}")
    
    def _is_face_collapsed(self, face: bmesh.types.BMFace) -> bool:
        """
        Check if a face is collapsed (all vertices are coincident).
        """
        verts = list(face.verts)
        if len(verts) < 2:
            return True
        
        first_co = verts[0].co
        for vert in verts[1:]:
            if (vert.co - first_co).length > self.weld_tolerance:
                return False
        return True
    
    def _validate_manifold_topology(self, bm: bmesh.types.BMesh) -> None:
        """
        Ensure watertight manifold topology - each edge should have exactly
        2 linked faces for a closed mesh.
        """
        non_manifold_edges = []
        boundary_edges = []
        
        for edge in bm.edges:
            face_count = len(edge.link_faces)
            if face_count > 2:
                non_manifold_edges.append(edge)
            elif face_count == 1:
                boundary_edges.append(edge)
        
        if non_manifold_edges:
            print(f"   ⚠️  Found {len(non_manifold_edges)} non-manifold edges (>{2} faces)")
            # Attempt to fix by dissolving problematic edges
            bmesh.ops.dissolve_edges(bm, edges=non_manifold_edges, use_verts=False)
        
        if boundary_edges:
            print(f"   ℹ️  Found {len(boundary_edges)} boundary edges (open mesh)")
        else:
            print("   ✓ Mesh is watertight (no boundary edges)")
    
    def _audit_and_correct_normals(self, bm: bmesh.types.BMesh) -> None:
        """
        Audit and correct normal orientations to ensure uniform
        facing direction across all polygons.
        """
        # Recalculate face normals using bmesh operation
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        
        # Verify normals are consistent (outward facing for closed meshes)
        if bm.faces:
            # Calculate mesh centroid
            centroid = mathutils.Vector((0, 0, 0))
            for face in bm.faces:
                centroid += face.calc_center_median()
            centroid /= len(bm.faces)
            
            # Check for inverted faces
            inverted_faces = []
            for face in bm.faces:
                face_center = face.calc_center_median()
                to_center = (centroid - face_center).normalized()
                
                # If normal points significantly toward center, likely inverted
                if face.normal.dot(to_center) > 0.7:
                    inverted_faces.append(face)
            
            # Flip inverted faces
            if inverted_faces:
                bmesh.ops.reverse_faces(bm, faces=inverted_faces)
                print(f"   🔄 Corrected {len(inverted_faces)} inverted face normals")


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

