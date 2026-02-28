"""
Workflow Efficiency System

Implements asset organization, automation tools, collaboration workflows,
and quality assurance protocols for professional 3D stone slab visualization.
"""
import bpy
import os
import re
import json
import shutil
from typing import Dict, List, Tuple, Optional, Any, Set, Callable
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime
from pathlib import Path
import hashlib


class AssetType(Enum):
    """Asset classification for naming conventions"""
    SLAB = "SLB"
    COUNTERTOP = "CNT"
    TILE = "TILE"
    TRIM = "TRIM"
    ACCESSORY = "ACC"
    HARDWARE = "HDW"
    REFERENCE = "REF"
    CONCEPT = "CON"
    RENDER = "RND"
    COMPOSITE = "COMP"


class ProjectPhase(Enum):
    """Project workflow phases"""
    REFERENCE = "01_Reference"
    CONCEPTS = "02_Concepts"
    MODELS = "03_Models"
    TEXTURES = "04_Textures"
    MATERIALS = "05_Materials"
    LIGHTING = "06_Lighting"
    CAMERAS = "07_Cameras"
    RENDERS = "08_Renders"
    COMPOSITING = "09_Compositing"
    OUTPUT = "10_Output"


class RenderType(Enum):
    """Render output types"""
    PREVIEW = "Preview"
    FINAL = "Final"
    WIP = "WIP"
    TECHNICAL = "Technical"


class QualityCheckStatus(Enum):
    """Quality assurance check status"""
    PENDING = "pending"
    PASSED = "passed"
    FAILED = "failed"
    WARNING = "warning"
    NA = "not_applicable"


@dataclass
class NamingConvention:
    """File naming convention configuration"""
    project_code: str
    asset_type: AssetType
    asset_name: str
    version: int = 1
    variation: Optional[str] = None
    
    def generate_name(self) -> str:
        """Generate standardized file name"""
        version_str = f"v{self.version:02d}"
        if self.variation:
            return f"{self.project_code}_{self.asset_type.value}_{self.asset_name}_{version_str}_{self.variation}"
        return f"{self.project_code}_{self.asset_type.value}_{self.asset_name}_{version_str}"
    
    @staticmethod
    def parse_name(filename: str) -> Optional[Dict[str, Any]]:
        """Parse a standardized file name"""
        # Remove extension
        name = os.path.splitext(filename)[0]
        parts = name.split('_')
        
        if len(parts) < 4:
            return None
            
        return {
            'project_code': parts[0],
            'asset_type': parts[1],
            'asset_name': parts[2],
            'version': parts[3] if len(parts) > 3 else None,
            'variation': parts[4] if len(parts) > 4 else None
        }


@dataclass
class FolderStructure:
    """Project folder structure configuration"""
    root_path: str
    project_name: str
    create_subfolders: bool = True
    
    STRUCTURE = {
        "01_Reference": ["Images", "Documents", "Measurements"],
        "02_Concepts": ["Sketches", "Moodboards", "Ideas"],
        "03_Models": ["HighPoly", "LowPoly", "Rigged", "Archive"],
        "04_Textures": ["Source", "Export", "TrimSheets", "HDRIs"],
        "05_Materials": ["Shaders", "Libraries", "Presets"],
        "06_Lighting": ["HDRI", "Setups", "Baked"],
        "07_Cameras": ["Presets", "Animations"],
        "08_Renders": ["Preview", "Final", "WIP", "Technical"],
        "09_Compositing": ["Layers", "Passes", "ProjectFiles"],
        "10_Output": ["Client", "Internal", "Archive"]
    }
    
    def create_structure(self) -> Dict[str, Any]:
        """Create project folder structure"""
        project_path = Path(self.root_path) / self.project_name
        created_folders = []
        
        for main_folder, subfolders in self.STRUCTURE.items():
            main_path = project_path / main_folder
            main_path.mkdir(parents=True, exist_ok=True)
            created_folders.append(str(main_path))
            
            if self.create_subfolders:
                for sub in subfolders:
                    sub_path = main_path / sub
                    sub_path.mkdir(parents=True, exist_ok=True)
                    created_folders.append(str(sub_path))
        
        return {
            'project_path': str(project_path),
            'folders_created': len(created_folders),
            'folder_list': created_folders
        }


@dataclass
class QualityCheckItem:
    """Quality assurance checklist item"""
    name: str
    category: str  # 'pre_render' or 'post_render'
    description: str
    status: QualityCheckStatus = QualityCheckStatus.PENDING
    notes: str = ""
    checked_at: Optional[datetime] = None
    
    def mark_passed(self, notes: str = ""):
        self.status = QualityCheckStatus.PASSED
        self.notes = notes
        self.checked_at = datetime.now()
    
    def mark_failed(self, notes: str = ""):
        self.status = QualityCheckStatus.FAILED
        self.notes = notes
        self.checked_at = datetime.now()
    
    def mark_warning(self, notes: str = ""):
        self.status = QualityCheckStatus.WARNING
        self.notes = notes
        self.checked_at = datetime.now()


class AssetNamingManager:
    """
    Manages standardized asset naming conventions.
    """
    
    def __init__(self, project_code: str = "PRJ"):
        self.project_code = project_code
        self._version_history: Dict[str, int] = {}
        
    def generate_asset_name(self, asset_type: AssetType, asset_name: str,
                           variation: Optional[str] = None) -> str:
        """
        Generate standardized asset name with auto-incrementing version.
        
        Args:
            asset_type: Type of asset
            asset_name: Base asset name
            variation: Optional variation descriptor
            
        Returns:
            Standardized file name
        """
        key = f"{asset_type.value}_{asset_name}_{variation or 'default'}"
        version = self._version_history.get(key, 0) + 1
        self._version_history[key] = version
        
        convention = NamingConvention(
            project_code=self.project_code,
            asset_type=asset_type,
            asset_name=asset_name,
            version=version,
            variation=variation
        )
        
        return convention.generate_name()
    
    def validate_name(self, filename: str) -> bool:
        """
        Validate if filename follows naming convention.
        
        Args:
            filename: File name to validate
            
        Returns:
            True if valid
        """
        parsed = NamingConvention.parse_name(filename)
        if not parsed:
            return False
            
        # Check if asset type is valid
        try:
            AssetType(parsed['asset_type'])
        except ValueError:
            return False
            
        return True
    
    def batch_rename(self, directory: str, asset_type: AssetType,
                    naming_pattern: str) -> List[str]:
        """
        Batch rename files in directory following convention.
        
        Args:
            directory: Target directory
            asset_type: Asset type for new names
            naming_pattern: Base naming pattern
            
        Returns:
            List of new file names
        """
        renamed_files = []
        dir_path = Path(directory)
        
        if not dir_path.exists():
            return renamed_files
            
        for i, file_path in enumerate(dir_path.iterdir()):
            if file_path.is_file():
                new_name = self.generate_asset_name(
                    asset_type,
                    f"{naming_pattern}_{i+1:03d}"
                )
                new_path = file_path.with_name(f"{new_name}{file_path.suffix}")
                file_path.rename(new_path)
                renamed_files.append(str(new_path))
                
        return renamed_files


class ProjectStructureManager:
    """
    Manages project folder structure and file organization.
    """
    
    def __init__(self, root_path: str, project_name: str):
        self.root_path = Path(root_path)
        self.project_name = project_name
        self.project_path = self.root_path / project_name
        
    def initialize_project(self) -> Dict[str, Any]:
        """
        Initialize complete project structure.
        
        Returns:
            Creation results
        """
        structure = FolderStructure(
            root_path=str(self.root_path),
            project_name=self.project_name
        )
        return structure.create_structure()
    
    def get_path_for_phase(self, phase: ProjectPhase, 
                          subfolder: Optional[str] = None) -> str:
        """
        Get path for specific project phase.
        
        Args:
            phase: Project phase
            subfolder: Optional subfolder name
            
        Returns:
            Full path
        """
        path = self.project_path / phase.value
        if subfolder:
            path = path / subfolder
        return str(path)
    
    def organize_blend_file(self, source_path: str, 
                           target_phase: ProjectPhase,
                           asset_type: AssetType,
                           asset_name: str) -> str:
        """
        Organize a blend file into proper project structure.
        
        Args:
            source_path: Current file location
            target_phase: Target project phase
            asset_type: Asset type
            asset_name: Asset name
            
        Returns:
            New file path
        """
        naming_mgr = AssetNamingManager(self.project_name)
        new_name = naming_mgr.generate_asset_name(asset_type, asset_name)
        
        target_dir = self.get_path_for_phase(target_phase)
        target_path = Path(target_dir) / f"{new_name}.blend"
        
        # Create directory if needed
        target_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Copy file
        shutil.copy2(source_path, target_path)
        
        return str(target_path)
    
    def create_render_output_path(self, render_type: RenderType,
                                 version: int = 1,
                                 frame: Optional[int] = None) -> str:
        """
        Create organized render output path.
        
        Args:
            render_type: Type of render
            version: Render version
            frame: Frame number (for animations)
            
        Returns:
            Output path
        """
        render_dir = self.get_path_for_phase(
            ProjectPhase.RENDERS, 
            render_type.value
        )
        
        timestamp = datetime.now().strftime("%Y%m%d")
        base_name = f"{self.project_name}_{render_type.value}_v{version:02d}_{timestamp}"
        
        if frame is not None:
            base_name += f"_f{frame:04d}"
            
        return str(Path(render_dir) / base_name)


class BatchExportManager:
    """
    Manages batch export operations for multiple formats.
    """
    
    SUPPORTED_FORMATS = ['GLB', 'GLTF', 'OBJ', 'FBX', 'STL', 'PLY']
    
    def __init__(self, output_dir: str):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self._export_history: List[Dict[str, Any]] = []
        
    def batch_export_objects(self, objects: List[bpy.types.Object],
                           formats: List[str],
                           apply_modifiers: bool = True,
                           export_materials: bool = True) -> Dict[str, List[str]]:
        """
        Export multiple objects in multiple formats.
        
        Args:
            objects: Objects to export
            formats: Export formats
            apply_modifiers: Apply modifiers before export
            export_materials: Include materials
            
        Returns:
            Export results by format
        """
        results = {fmt: [] for fmt in formats}
        
        for obj in objects:
            # Select only this object
            bpy.ops.object.select_all(action='DESELECT')
            obj.select_set(True)
            bpy.context.view_layer.objects.active = obj
            
            for fmt in formats:
                if fmt.upper() not in self.SUPPORTED_FORMATS:
                    continue
                    
                output_path = self.output_dir / f"{obj.name}.{fmt.lower()}"
                
                try:
                    if fmt.upper() == 'GLB':
                        bpy.ops.export_scene.gltf(
                            filepath=str(output_path),
                            export_format='GLB',
                            use_selection=True,
                            export_apply=apply_modifiers,
                            export_materials='EXPORT' if export_materials else 'NONE'
                        )
                    elif fmt.upper() == 'OBJ':
                        bpy.ops.export_scene.obj(
                            filepath=str(output_path),
                            use_selection=True,
                            use_materials=export_materials,
                            apply_modifiers=apply_modifiers
                        )
                    elif fmt.upper() == 'FBX':
                        bpy.ops.export_scene.fbx(
                            filepath=str(output_path),
                            use_selection=True,
                            apply_modifiers=apply_modifiers
                        )
                    elif fmt.upper() == 'STL':
                        bpy.ops.export_scene.stl(
                            filepath=str(output_path),
                            use_selection=True
                        )
                        
                    results[fmt].append(str(output_path))
                    self._export_history.append({
                        'object': obj.name,
                        'format': fmt,
                        'path': str(output_path),
                        'timestamp': datetime.now()
                    })
                    
                except Exception as e:
                    print(f"Export failed for {obj.name} to {fmt}: {e}")
                    
        return results
    
    def export_lod_chain(self, obj: bpy.types.Object,
                        lod_levels: List[float],
                        output_name: Optional[str] = None) -> List[str]:
        """
        Export LOD chain for an object.
        
        Args:
            obj: Source object
            lod_levels: Decimation ratios for each LOD
            output_name: Base output name
            
        Returns:
            List of exported file paths
        """
        exported = []
        base_name = output_name or obj.name
        
        # Store original name
        original_name = obj.name
        
        for i, ratio in enumerate(lod_levels):
            # Duplicate object for LOD
            bpy.ops.object.select_all(action='DESELECT')
            obj.select_set(True)
            bpy.context.view_layer.objects.active = obj
            bpy.ops.object.duplicate()
            
            lod_obj = bpy.context.active_object
            lod_obj.name = f"{base_name}_LOD{i}"
            
            # Add decimate modifier
            decimate = lod_obj.modifiers.new(name="Decimate", type='DECIMATE')
            decimate.ratio = ratio
            
            # Apply modifier
            bpy.ops.object.modifier_apply(modifier="Decimate")
            
            # Export
            output_path = self.output_dir / f"{lod_obj.name}.glb"
            bpy.ops.export_scene.gltf(
                filepath=str(output_path),
                export_format='GLB',
                use_selection=True
            )
            
            exported.append(str(output_path))
            
            # Delete LOD object
            bpy.ops.object.delete()
            
        return exported
    
    def get_export_history(self) -> List[Dict[str, Any]]:
        """Get history of all exports"""
        return self._export_history


class RenderQueueManager:
    """
    Manages render queue for batch rendering operations.
    """
    
    def __init__(self):
        self._queue: List[Dict[str, Any]] = []
        self._completed: List[Dict[str, Any]] = []
        
    def add_to_queue(self, scene_name: str, camera_name: str,
                    output_path: str, resolution: Tuple[int, int] = (1920, 1080),
                    samples: int = 128) -> int:
        """
        Add render job to queue.
        
        Args:
            scene_name: Scene to render
            camera_name: Camera to use
            output_path: Output file path
            resolution: Render resolution
            samples: Sample count
            
        Returns:
            Job ID
        """
        job_id = len(self._queue)
        self._queue.append({
            'id': job_id,
            'scene': scene_name,
            'camera': camera_name,
            'output': output_path,
            'resolution': resolution,
            'samples': samples,
            'status': 'pending',
            'added_at': datetime.now()
        })
        return job_id
    
    def process_queue(self) -> List[Dict[str, Any]]:
        """
        Process all jobs in queue.
        
        Returns:
            Completed jobs
        """
        for job in self._queue:
            if job['status'] == 'pending':
                try:
                    # Set up scene
                    scene = bpy.data.scenes.get(job['scene'])
                    if scene:
                        scene.render.resolution_x = job['resolution'][0]
                        scene.render.resolution_y = job['resolution'][1]
                        scene.cycles.samples = job['samples']
                        scene.render.filepath = job['output']
                        
                        # Set camera
                        camera = bpy.data.objects.get(job['camera'])
                        if camera:
                            scene.camera = camera
                            
                        # Render
                        bpy.ops.render.render(write_file=True)
                        
                        job['status'] = 'completed'
                        job['completed_at'] = datetime.now()
                        self._completed.append(job)
                        
                except Exception as e:
                    job['status'] = 'failed'
                    job['error'] = str(e)
                    
        return self._completed
    
    def get_queue_status(self) -> Dict[str, Any]:
        """Get current queue status"""
        pending = sum(1 for j in self._queue if j['status'] == 'pending')
        completed = sum(1 for j in self._queue if j['status'] == 'completed')
        failed = sum(1 for j in self._queue if j['status'] == 'failed')
        
        return {
            'total': len(self._queue),
            'pending': pending,
            'completed': completed,
            'failed': failed
        }


class MaterialLibraryManager:
    """
    Manages material libraries and material assignment workflows.
    """
    
    def __init__(self, library_path: str):
        self.library_path = Path(library_path)
        self._materials_cache: Dict[str, bpy.types.Material] = {}
        
    def save_material_to_library(self, material: bpy.types.Material,
                                category: str = "General") -> str:
        """
        Save material to library.
        
        Args:
            material: Material to save
            category: Library category
            
        Returns:
            Saved file path
        """
        category_dir = self.library_path / category
        category_dir.mkdir(parents=True, exist_ok=True)
        
        # Create temporary blend file
        temp_blend = category_dir / f"{material.name}.blend"
        
        # Save material data
        material_data = {
            'name': material.name,
            'category': category,
            'saved_at': datetime.now().isoformat(),
            'properties': {}
        }
        
        # Save to JSON metadata
        metadata_path = category_dir / f"{material.name}.json"
        with open(metadata_path, 'w') as f:
            json.dump(material_data, f, indent=2)
            
        return str(metadata_path)
    
    def load_material_from_library(self, material_name: str,
                                  category: str = "General") -> Optional[Dict[str, Any]]:
        """
        Load material metadata from library.
        
        Args:
            material_name: Material name
            category: Library category
            
        Returns:
            Material data or None
        """
        metadata_path = self.library_path / category / f"{material_name}.json"
        
        if not metadata_path.exists():
            return None
            
        with open(metadata_path, 'r') as f:
            return json.load(f)
    
    def batch_assign_material(self, objects: List[bpy.types.Object],
                             material_name: str) -> int:
        """
        Assign material to multiple objects.
        
        Args:
            objects: Target objects
            material_name: Material name
            
        Returns:
            Number of objects updated
        """
        material = bpy.data.materials.get(material_name)
        if not material:
            return 0
            
        count = 0
        for obj in objects:
            if obj.type == 'MESH':
                if len(obj.data.materials) == 0:
                    obj.data.materials.append(material)
                else:
                    obj.data.materials[0] = material
                count += 1
                
        return count
    
    def get_library_contents(self) -> Dict[str, List[str]]:
        """
        Get all materials in library.
        
        Returns:
            Materials by category
        """
        contents = {}
        
        if not self.library_path.exists():
            return contents
            
        for category_dir in self.library_path.iterdir():
            if category_dir.is_dir():
                materials = [
                    f.stem for f in category_dir.glob("*.json")
                ]
                contents[category_dir.name] = materials
                
        return contents


class QualityAssuranceManager:
    """
    Manages quality assurance checklists and validation.
    """
    
    PRE_RENDER_CHECKS = [
        ("Texture Links", "Verify all textures are linked and not missing"),
        ("Geometry Errors", "Check for non-manifold geometry and inverted normals"),
        ("Lighting Setup", "Validate light placement and intensity"),
        ("Camera Framing", "Confirm proper camera composition"),
        ("Material Assignment", "Verify all objects have correct materials"),
        ("UV Unwrapping", "Check for UV overlaps and stretching"),
        ("Render Resolution", "Confirm output resolution settings"),
        ("Sample Count", "Verify adequate samples for quality"),
    ]
    
    POST_RENDER_CHECKS = [
        ("Artifacts Check", "Check for rendering artifacts and noise"),
        ("Color Accuracy", "Verify color matches reference"),
        ("Resolution", "Confirm output meets requirements"),
        ("Alpha Channel", "Validate transparency if needed"),
        ("Compositing", "Check integration with compositing"),
        ("File Integrity", "Verify output file is valid"),
    ]
    
    def __init__(self):
        self._checks: Dict[str, QualityCheckItem] = {}
        self._initialize_checks()
        
    def _initialize_checks(self):
        """Initialize all quality checks"""
        for name, description in self.PRE_RENDER_CHECKS:
            check_id = f"pre_{name.lower().replace(' ', '_')}"
            self._checks[check_id] = QualityCheckItem(
                name=name,
                category='pre_render',
                description=description
            )
            
        for name, description in self.POST_RENDER_CHECKS:
            check_id = f"post_{name.lower().replace(' ', '_')}"
            self._checks[check_id] = QualityCheckItem(
                name=name,
                category='post_render',
                description=description
            )
    
    def run_pre_render_checks(self) -> Dict[str, Any]:
        """
        Run automated pre-render checks.
        
        Returns:
            Check results
        """
        results = {
            'passed': [],
            'failed': [],
            'warnings': []
        }
        
        # Check texture links
        missing_textures = self._check_missing_textures()
        if missing_textures:
            self._checks['pre_texture_links'].mark_failed(
                f"Missing textures: {', '.join(missing_textures)}"
            )
            results['failed'].append('Texture Links')
        else:
            self._checks['pre_texture_links'].mark_passed()
            results['passed'].append('Texture Links')
            
        # Check geometry
        geometry_issues = self._check_geometry_errors()
        if geometry_issues:
            self._checks['pre_geometry_errors'].mark_warning(
                f"Issues found: {len(geometry_issues)}"
            )
            results['warnings'].append('Geometry Errors')
        else:
            self._checks['pre_geometry_errors'].mark_passed()
            results['passed'].append('Geometry Errors')
            
        # Check materials
        objects_without_materials = self._check_material_assignments()
        if objects_without_materials:
            self._checks['pre_material_assignment'].mark_failed(
                f"Objects without materials: {len(objects_without_materials)}"
            )
            results['failed'].append('Material Assignment')
        else:
            self._checks['pre_material_assignment'].mark_passed()
            results['passed'].append('Material Assignment')
            
        return results
    
    def _check_missing_textures(self) -> List[str]:
        """Check for missing texture links"""
        missing = []
        for image in bpy.data.images:
            if image.source == 'FILE' and not os.path.exists(image.filepath):
                missing.append(image.name)
        return missing
    
    def _check_geometry_errors(self) -> List[Dict[str, Any]]:
        """Check for geometry errors"""
        issues = []
        for obj in bpy.context.scene.objects:
            if obj.type == 'MESH':
                mesh = obj.data
                # Check for non-manifold geometry
                bm = bmesh.new()
                bm.from_mesh(mesh)
                
                non_manifold = [
                    e for e in bm.edges 
                    if not e.is_manifold and not e.is_boundary
                ]
                
                if non_manifold:
                    issues.append({
                        'object': obj.name,
                        'non_manifold_edges': len(non_manifold)
                    })
                    
                bm.free()
        return issues
    
    def _check_material_assignments(self) -> List[str]:
        """Check for objects without materials"""
        objects_without = []
        for obj in bpy.context.scene.objects:
            if obj.type == 'MESH':
                if len(obj.data.materials) == 0 or obj.data.materials[0] is None:
                    objects_without.append(obj.name)
        return objects_without
    
    def get_checklist_report(self) -> Dict[str, Any]:
        """
        Generate full checklist report.
        
        Returns:
            Report data
        """
        pre_render = {
            k: v for k, v in self._checks.items() 
            if v.category == 'pre_render'
        }
        post_render = {
            k: v for k, v in self._checks.items() 
            if v.category == 'post_render'
        }
        
        def summarize(checks):
            passed = sum(1 for c in checks.values() if c.status == QualityCheckStatus.PASSED)
            failed = sum(1 for c in checks.values() if c.status == QualityCheckStatus.FAILED)
            warning = sum(1 for c in checks.values() if c.status == QualityCheckStatus.WARNING)
            pending = sum(1 for c in checks.values() if c.status == QualityCheckStatus.PENDING)
            return {'passed': passed, 'failed': failed, 'warning': warning, 'pending': pending}
        
        return {
            'pre_render': {
                'checks': {k: {
                    'name': v.name,
                    'status': v.status.value,
                    'notes': v.notes
                } for k, v in pre_render.items()},
                'summary': summarize(pre_render)
            },
            'post_render': {
                'checks': {k: {
                    'name': v.name,
                    'status': v.status.value,
                    'notes': v.notes
                } for k, v in post_render.items()},
                'summary': summarize(post_render)
            }
        }


class CollaborationManager:
    """
    Manages collaboration workflows and version control integration.
    """
    
    def __init__(self, project_path: str):
        self.project_path = Path(project_path)
        self._metadata_file = self.project_path / ".project_metadata.json"
        
    def initialize_version_control(self, vcs_type: str = "git") -> Dict[str, Any]:
        """
        Initialize version control for project.
        
        Args:
            vcs_type: Version control system type
            
        Returns:
            Initialization results
        """
        import subprocess
        
        results = {'success': False, 'messages': []}
        
        try:
            if vcs_type.lower() == "git":
                # Initialize git repo
                subprocess.run(
                    ["git", "init"],
                    cwd=self.project_path,
                    capture_output=True,
                    check=True
                )
                
                # Create .gitignore for Blender
                gitignore = self.project_path / ".gitignore"
                gitignore_content = """# Blender
*.blend1
*.blend2
*.blend3
*.blend4
*.blend5
*.pyc
__pycache__/
backup/
temp/
cache/
"""
                gitignore.write_text(gitignore_content)
                
                results['success'] = True
                results['messages'].append("Git repository initialized")
                results['messages'].append(".gitignore created for Blender")
                
        except Exception as e:
            results['messages'].append(f"Error: {str(e)}")
            
        return results
    
    def create_style_guide(self) -> str:
        """
        Create project style guide document.
        
        Returns:
            Path to style guide
        """
        style_guide = self.project_path / "STYLE_GUIDE.md"
        
        content = """# Project Style Guide

## Naming Conventions
- Use [Project]_[AssetType]_[AssetName]_[Version]_[Variation] format
- Asset Types: SLB (Slab), CNT (Countertop), TILE, TRIM, ACC (Accessory), HDW (Hardware)
- Versions: v01, v02, etc.

## Color Management
- Use ACES color space for renders
- Export in sRGB for web/preview

## Render Settings
- Preview: 50% resolution, 32 samples
- Final: 100% resolution, 512+ samples
- Format: PNG for stills, MP4 for animations

## File Organization
- See folder structure in project root
- Archive old versions in Archive/ subfolders
"""
        
        style_guide.write_text(content)
        return str(style_guide)
    
    def export_project_metadata(self) -> str:
        """
        Export project metadata for sharing.
        
        Returns:
            Path to metadata file
        """
        metadata = {
            'project_name': self.project_path.name,
            'created_at': datetime.now().isoformat(),
            'blender_version': bpy.app.version_string,
            'objects': [obj.name for obj in bpy.data.objects],
            'materials': [mat.name for mat in bpy.data.materials],
            'textures': [img.name for img in bpy.data.images],
            'scenes': [scene.name for scene in bpy.data.scenes]
        }
        
        with open(self._metadata_file, 'w') as f:
            json.dump(metadata, f, indent=2)
            
        return str(self._metadata_file)


# Convenience Functions

def setup_project_structure(root_path: str, project_name: str) -> Dict[str, Any]:
    """
    Quick setup for complete project structure.
    
    Args:
        root_path: Root directory for project
        project_name: Project name
        
    Returns:
        Setup results
    """
    manager = ProjectStructureManager(root_path, project_name)
    return manager.initialize_project()


def batch_export_selected(formats: List[str] = None) -> Dict[str, List[str]]:
    """
    Export selected objects in multiple formats.
    
    Args:
        formats: List of formats (GLB, OBJ, FBX, etc.)
        
    Returns:
        Export results
    """
    formats = formats or ['GLB']
    
    # Get export directory from project
    export_dir = bpy.path.abspath("//Export")
    os.makedirs(export_dir, exist_ok=True)
    
    manager = BatchExportManager(export_dir)
    selected = list(bpy.context.selected_objects)
    
    return manager.batch_export_objects(selected, formats)


def run_quality_checklist() -> Dict[str, Any]:
    """
    Run complete quality assurance checklist.
    
    Returns:
        Checklist results
    """
    qa = QualityAssuranceManager()
    results = qa.run_pre_render_checks()
    report = qa.get_checklist_report()
    
    return {
        'automated_results': results,
        'full_report': report
    }


def create_project_documentation(project_path: str) -> Dict[str, str]:
    """
    Create project documentation files.
    
    Args:
        project_path: Project directory
        
    Returns:
        Created file paths
    """
    collab = CollaborationManager(project_path)
    
    files_created = {}
    files_created['style_guide'] = collab.create_style_guide()
    files_created['metadata'] = collab.export_project_metadata()
    
    return files_created


# Template Workflows

TEMPLATE_WORKFLOWS = {
    'product_photography': {
        'description': 'Standard product photography workflow',
        'phases': [
            ProjectPhase.MODELS,
            ProjectPhase.MATERIALS,
            ProjectPhase.LIGHTING,
            ProjectPhase.CAMERAS,
            ProjectPhase.RENDERS
        ],
        'naming_convention': {
            'project_code': 'PROD',
            'asset_types': [AssetType.SLAB, AssetType.COUNTERTOP]
        }
    },
    'architectural': {
        'description': 'Architectural visualization workflow',
        'phases': [
            ProjectPhase.REFERENCE,
            ProjectPhase.CONCEPTS,
            ProjectPhase.MODELS,
            ProjectPhase.TEXTURES,
            ProjectPhase.LIGHTING,
            ProjectPhase.RENDERS,
            ProjectPhase.COMPOSITING
        ],
        'naming_convention': {
            'project_code': 'ARCH',
            'asset_types': [AssetType.SLAB, AssetType.TRIM, AssetType.ACCESSORY]
        }
    },
    'technical_documentation': {
        'description': 'Technical drawing and documentation',
        'phases': [
            ProjectPhase.MODELS,
            ProjectPhase.RENDERS,
            ProjectPhase.OUTPUT
        ],
        'naming_convention': {
            'project_code': 'TECH',
            'asset_types': [AssetType.SLAB, AssetType.HARDWARE]
        }
    }
}
