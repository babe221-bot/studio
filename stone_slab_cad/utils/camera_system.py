"""
Camera Composition and Depth of Field System

Implements cinematic composition rules, camera technical settings,
depth of field with bokeh quality, and camera movement types
for professional stone slab visualization.
"""
import bpy
import mathutils
from typing import Dict, List, Tuple, Optional, Any, Callable
from dataclasses import dataclass
from enum import Enum
import math


class CompositionRule(Enum):
    """Cinematic composition rules"""
    RULE_OF_THIRDS = "rule_of_thirds"
    CENTERED = "centered"
    GOLDEN_RATIO = "golden_ratio"
    LEADING_LINES = "leading_lines"
    SYMMETRY = "symmetry"
    DIAGONAL = "diagonal"


class CameraMovement(Enum):
    """Camera movement types"""
    DOLLY = "dolly"           # Linear movement toward/away
    TRUCK = "truck"           # Horizontal parallel movement
    PEDESTAL = "pedestal"     # Vertical movement
    PAN = "pan"               # Horizontal rotation
    TILT = "tilt"             # Vertical rotation
    ROLL = "roll"             # Rotation around view axis
    ORBIT = "orbit"           # Circular movement around subject
    CRANE = "crane"           # Arcing movement combining pedestal and truck


class FocusTechnique(Enum):
    """Depth of field focus techniques"""
    RACK_FOCUS = "rack_focus"       # Changing focus for narrative
    DEEP_FOCUS = "deep_focus"       # Everything in focus
    SHALLOW_FOCUS = "shallow_focus" # Subject isolation
    TILT_SHIFT = "tilt_shift"       # Miniature effect


@dataclass
class CameraSettings:
    """Camera technical settings"""
    focal_length: float = 50.0          # mm (24-200mm typical)
    sensor_width: float = 36.0          # Full frame = 36mm
    f_stop: float = 2.8                 # Aperture (f/1.4 - f/22)
    shutter_speed: float = 1/60         # seconds
    iso: int = 100                      # 100-3200
    focus_distance: float = 10.0        # meters
    focus_object: Optional[bpy.types.Object] = None
    
    # Depth of field
    use_dof: bool = True
    aperture_blades: int = 7            # Affects bokeh shape
    aperture_rotation: float = 0.0      # Blade orientation
    
    # Composition
    composition_rule: CompositionRule = CompositionRule.RULE_OF_THIRDS
    target_offset: Tuple[float, float] = (0.0, 0.0)  # X, Y offset from center


@dataclass
class DOFSettings:
    """Depth of field settings"""
    enabled: bool = True
    f_stop: float = 2.8
    focus_distance: float = 2.0
    focus_object: Optional[bpy.types.Object] = None
    bokeh_shape: str = "CIRCULAR"       # CIRCULAR, HEXAGONAL, OCTAGONAL
    bokeh_blades: int = 7
    bokeh_rotation: float = 0.0
    chromatic_aberration: float = 0.0   # Lens artifact simulation


@dataclass
class CompositionGrid:
    """Composition guide overlay settings"""
    show_rule_of_thirds: bool = True
    show_golden_ratio: bool = False
    show_center_cross: bool = False
    show_diagonals: bool = False
    line_color: Tuple[float, float, float, float] = (1.0, 1.0, 1.0, 0.3)
    line_thickness: int = 2


class CinematicComposition:
    """
    Cinematic composition rules implementation.
    
    **Rule of Thirds**: Divide frame into 3x3 grid, place subject at intersections
    **Leading Lines**: Use architectural elements to guide eye
    **Framing**: Use foreground elements as natural frames
    """
    
    def __init__(self, camera: bpy.types.Object):
        self.camera = camera
        self.scene = bpy.context.scene
        
    def apply_rule_of_thirds(self, target: bpy.types.Object, 
                            intersection: int = 4) -> None:
        """
        Position target at rule of thirds intersection points.
        
        Intersection points:
        1: Top-left     2: Top-center     3: Top-right
        4: Center-left  5: Center         6: Center-right
        7: Bottom-left  8: Bottom-center  9: Bottom-right
        """
        # Get camera view frame
        frame_coords = self._get_view_frame_coords()
        
        # Calculate third lines
        x_thirds = [
            frame_coords[0][0] + (frame_coords[1][0] - frame_coords[0][0]) / 3,
            frame_coords[0][0] + 2 * (frame_coords[1][0] - frame_coords[0][0]) / 3
        ]
        y_thirds = [
            frame_coords[0][1] + (frame_coords[3][1] - frame_coords[0][1]) / 3,
            frame_coords[0][1] + 2 * (frame_coords[3][1] - frame_coords[0][1]) / 3
        ]
        
        # Map intersection to coordinates
        intersection_map = {
            1: (x_thirds[0], y_thirds[0]),
            2: ((x_thirds[0] + x_thirds[1]) / 2, y_thirds[0]),
            3: (x_thirds[1], y_thirds[0]),
            4: (x_thirds[0], (y_thirds[0] + y_thirds[1]) / 2),
            5: ((x_thirds[0] + x_thirds[1]) / 2, (y_thirds[0] + y_thirds[1]) / 2),
            6: (x_thirds[1], (y_thirds[0] + y_thirds[1]) / 2),
            7: (x_thirds[0], y_thirds[1]),
            8: ((x_thirds[0] + x_thirds[1]) / 2, y_thirds[1]),
            9: (x_thirds[1], y_thirds[1])
        }
        
        if intersection in intersection_map:
            target_pos = intersection_map[intersection]
            # Convert 2D view coordinates to 3D world position
            world_pos = self._view_to_world(target_pos[0], target_pos[1], 
                                           target.location.z)
            
            # Offset camera to place target at intersection
            offset = target.location - world_pos
            self.camera.location += offset
            
            # Re-aim at target
            direction = target.location - self.camera.location
            rot_quat = direction.to_track_quat('-Z', 'Y')
            self.camera.rotation_euler = rot_quat.to_euler()
    
    def apply_leading_lines(self, target: bpy.types.Object,
                           line_direction: mathutils.Vector = mathutils.Vector((1, 0, 0))) -> None:
        """
        Position camera to use leading lines from architectural elements.
        """
        # Calculate camera position perpendicular to line direction
        perpendicular = line_direction.cross(mathutils.Vector((0, 0, 1)))
        if perpendicular.length < 0.001:
            perpendicular = mathutils.Vector((1, 0, 0))
        perpendicular.normalize()
        
        # Position camera to view along leading lines
        distance = (self.camera.location - target.location).length
        self.camera.location = target.location - line_direction * distance * 0.5 + perpendicular * distance * 0.3
        
        # Look at target
        direction = target.location - self.camera.location
        rot_quat = direction.to_track_quat('-Z', 'Y')
        self.camera.rotation_euler = rot_quat.to_euler()
    
    def create_framing(self, target: bpy.types.Object,
                      frame_objects: List[bpy.types.Object]) -> None:
        """
        Position camera to use foreground elements as natural frames.
        """
        if not frame_objects:
            return
        
        # Calculate average position of frame elements
        avg_pos = mathutils.Vector((0, 0, 0))
        for obj in frame_objects:
            avg_pos += obj.location
        avg_pos /= len(frame_objects)
        
        # Position camera behind frame elements
        direction_to_target = (target.location - avg_pos).normalized()
        self.camera.location = avg_pos - direction_to_target * 3.0
        
        # Look through frame at target
        direction = target.location - self.camera.location
        rot_quat = direction.to_track_quat('-Z', 'Y')
        self.camera.rotation_euler = rot_quat.to_euler()
    
    def _get_view_frame_coords(self) -> List[mathutils.Vector]:
        """Get camera view frame coordinates in world space"""
        render = self.scene.render
        aspect = render.resolution_x / render.resolution_y
        
        # Get camera view frame
        frame = self.camera.data.view_frame(scene=self.scene)
        
        # Convert to world coordinates
        world_frame = []
        for coord in frame:
            world_coord = self.camera.matrix_world @ coord
            world_frame.append(world_coord)
        
        return world_frame
    
    def _view_to_world(self, x: float, y: float, z: float) -> mathutils.Vector:
        """Convert view coordinates to world coordinates"""
        # Get camera matrix
        cam_matrix = self.camera.matrix_world
        
        # Create view coordinate vector
        view_coord = mathutils.Vector((x, y, z))
        
        # Transform to world
        world_coord = cam_matrix @ view_coord
        
        return world_coord
    
    def show_composition_guides(self, settings: CompositionGrid = None) -> None:
        """Show composition guide overlays in viewport"""
        if settings is None:
            settings = CompositionGrid()
        
        # Enable passepartout for framing reference
        self.camera.data.show_passepartout = True
        self.camera.data.passepartout_alpha = 0.5
        
        # Store settings in camera custom properties
        self.camera["show_rule_of_thirds"] = settings.show_rule_of_thirds
        self.camera["show_golden_ratio"] = settings.show_golden_ratio
        
        print(f"✅ Composition guides enabled for {self.camera.name}")


class CameraController:
    """
    Camera technical settings controller.
    """
    
    def __init__(self, camera: bpy.types.Object = None):
        if camera is None:
            # Create new camera
            camera_data = bpy.data.cameras.new(name="RenderCamera")
            self.camera = bpy.data.objects.new(name="RenderCamera", object_data=camera_data)
            bpy.context.collection.objects.link(self.camera)
        else:
            self.camera = camera
        
        # Set as active camera
        bpy.context.scene.camera = self.camera
    
    def configure(self, settings: CameraSettings) -> None:
        """Apply all camera technical settings"""
        cam_data = self.camera.data
        
        # Focal length
        cam_data.lens = settings.focal_length
        
        # Sensor size
        cam_data.sensor_width = settings.sensor_width
        cam_data.sensor_fit = 'HORIZONTAL'
        
        # Depth of field
        cam_data.dof.use_dof = settings.use_dof
        cam_data.dof.focus_distance = settings.focus_distance
        
        if settings.focus_object:
            cam_data.dof.focus_object = settings.focus_object
        
        # Aperture (f-stop)
        cam_data.dof.aperture_fstop = settings.f_stop
        
        # Bokeh shape
        cam_data.dof.blades = settings.aperture_blades
        cam_data.dof.rotation = math.radians(settings.aperture_rotation)
        
        print(f"✅ Camera configured:")
        print(f"   Focal Length: {settings.focal_length}mm")
        print(f"   F-Stop: f/{settings.f_stop}")
        print(f"   Focus Distance: {settings.focus_distance}m")
        print(f"   DOF Enabled: {settings.use_dof}")
    
    def set_depth_of_field(self, settings: DOFSettings) -> None:
        """Configure depth of field settings"""
        cam_data = self.camera.data
        cam_data.dof.use_dof = settings.enabled
        
        if settings.enabled:
            cam_data.dof.aperture_fstop = settings.f_stop
            cam_data.dof.focus_distance = settings.focus_distance
            
            if settings.focus_object:
                cam_data.dof.focus_object = settings.focus_object
            
            cam_data.dof.blades = settings.bokeh_blades
            cam_data.dof.rotation = math.radians(settings.bokeh_rotation)
            
            print(f"✅ DOF configured: f/{settings.f_stop}, focus at {settings.focus_distance}m")
    
    def focus_on_object(self, obj: bpy.types.Object, 
                       f_stop: float = 2.8) -> None:
        """Set focus on specific object"""
        self.camera.data.dof.use_dof = True
        self.camera.data.dof.focus_object = obj
        self.camera.data.dof.aperture_fstop = f_stop
        
        # Calculate focus distance
        distance = (self.camera.location - obj.location).length
        self.camera.data.dof.focus_distance = distance
        
        print(f"✅ Focus set on {obj.name} at {distance:.2f}m, f/{f_stop}")
    
    def rack_focus(self, start_obj: bpy.types.Object,
                  end_obj: bpy.types.Object,
                  duration_frames: int = 60,
                  f_stop: float = 2.8) -> None:
        """
        Animate rack focus from one object to another.
        """
        scene = bpy.context.scene
        start_frame = scene.frame_current
        end_frame = start_frame + duration_frames
        
        # Enable DOF
        self.camera.data.dof.use_dof = True
        self.camera.data.dof.aperture_fstop = f_stop
        
        # Clear any existing focus object keyframes
        self.camera.data.dof.keyframe_delete(data_path="focus_distance", 
                                            frame=start_frame)
        
        # Set initial focus
        start_distance = (self.camera.location - start_obj.location).length
        self.camera.data.dof.focus_distance = start_distance
        self.camera.data.dof.keyframe_insert(data_path="focus_distance",
                                            frame=start_frame)
        
        # Set final focus
        end_distance = (self.camera.location - end_obj.location).length
        self.camera.data.dof.focus_distance = end_distance
        self.camera.data.dof.keyframe_insert(data_path="focus_distance",
                                            frame=end_frame)
        
        # Set interpolation to smooth
        if self.camera.data.dof.animation_data:
            for fcurve in self.camera.data.dof.animation_data.action.fcurves:
                for keyframe in fcurve.keyframe_points:
                    keyframe.interpolation = 'BEZIER'
        
        print(f"✅ Rack focus animated: {start_obj.name} → {end_obj.name}")
    
    def set_shallow_focus(self, target: bpy.types.Object,
                         blur_amount: float = 0.5) -> None:
        """
        Set shallow depth of field for subject isolation.
        """
        self.focus_on_object(target, f_stop=blur_amount)
        
    def set_deep_focus(self) -> None:
        """
        Set deep focus for landscape clarity (everything in focus).
        """
        self.camera.data.dof.use_dof = True
        self.camera.data.dof.aperture_fstop = 22.0  # Maximum depth
        self.camera.data.dof.focus_distance = 100.0  # Hyperfocal distance
        
        print("✅ Deep focus set (f/22)")
    
    def apply_tilt_shift(self, blur_factor: float = 0.3) -> None:
        """
        Apply tilt-shift effect for miniature look.
        """
        # In Blender, this is simulated through DOF and camera angle
        self.camera.data.dof.use_dof = True
        self.camera.data.dof.aperture_fstop = 2.0
        
        # Tilt camera down slightly
        self.camera.rotation_euler[0] += math.radians(30)
        
        print("✅ Tilt-shift effect applied")


class CameraMovementController:
    """
    Camera movement animation system.
    
    **Dolly**: Linear movement toward/away from subject
    **Truck**: Horizontal parallel movement  
    **Pedestal**: Vertical movement
    **Pan**: Horizontal rotation
    **Tilt**: Vertical rotation
    **Roll**: Rotation around view axis
    """
    
    def __init__(self, camera: bpy.types.Object):
        self.camera = camera
        self.start_frame = bpy.context.scene.frame_current
    
    def dolly(self, distance: float, duration_frames: int = 60,
             ease_in_out: bool = True) -> None:
        """Move camera toward/away from target (negative = closer)"""
        direction = self.camera.matrix_world.to_quaternion() @ mathutils.Vector((0, 0, -1))
        end_location = self.camera.location + direction * distance
        
        self._animate_location(end_location, duration_frames, ease_in_out)
        print(f"✅ Dolly {distance}m over {duration_frames} frames")
    
    def truck(self, distance: float, duration_frames: int = 60,
             ease_in_out: bool = True) -> None:
        """Move camera horizontally (positive = right)"""
        direction = self.camera.matrix_world.to_quaternion() @ mathutils.Vector((1, 0, 0))
        end_location = self.camera.location + direction * distance
        
        self._animate_location(end_location, duration_frames, ease_in_out)
        print(f"✅ Truck {distance}m over {duration_frames} frames")
    
    def pedestal(self, distance: float, duration_frames: int = 60,
                ease_in_out: bool = True) -> None:
        """Move camera vertically (positive = up)"""
        end_location = self.camera.location + mathutils.Vector((0, 0, distance))
        
        self._animate_location(end_location, duration_frames, ease_in_out)
        print(f"✅ Pedestal {distance}m over {duration_frames} frames")
    
    def pan(self, angle_degrees: float, duration_frames: int = 60,
           ease_in_out: bool = True) -> None:
        """Rotate camera horizontally (positive = right)"""
        start_rot = self.camera.rotation_euler.copy()
        end_rot = start_rot.copy()
        end_rot[2] += math.radians(angle_degrees)
        
        self._animate_rotation(end_rot, duration_frames, ease_in_out)
        print(f"✅ Pan {angle_degrees}° over {duration_frames} frames")
    
    def tilt(self, angle_degrees: float, duration_frames: int = 60,
            ease_in_out: bool = True) -> None:
        """Rotate camera vertically (positive = up)"""
        start_rot = self.camera.rotation_euler.copy()
        end_rot = start_rot.copy()
        end_rot[0] += math.radians(angle_degrees)
        
        self._animate_rotation(end_rot, duration_frames, ease_in_out)
        print(f"✅ Tilt {angle_degrees}° over {duration_frames} frames")
    
    def roll(self, angle_degrees: float, duration_frames: int = 60,
            ease_in_out: bool = True) -> None:
        """Rotate camera around view axis (Dutch angle)"""
        start_rot = self.camera.rotation_euler.copy()
        end_rot = start_rot.copy()
        end_rot[1] += math.radians(angle_degrees)
        
        self._animate_rotation(end_rot, duration_frames, ease_in_out)
        print(f"✅ Roll {angle_degrees}° over {duration_frames} frames")
    
    def orbit(self, target: bpy.types.Object, radius: float,
             angle_degrees: float, duration_frames: int = 120) -> None:
        """
        Orbit camera around target object.
        """
        scene = bpy.context.scene
        start_frame = scene.frame_current
        
        # Calculate orbit path
        steps = duration_frames
        for i in range(steps + 1):
            frame = start_frame + i
            angle = math.radians(angle_degrees * (i / steps))
            
            # Calculate position on circle
            x = target.location.x + radius * math.cos(angle)
            y = target.location.y + radius * math.sin(angle)
            z = self.camera.location.z
            
            self.camera.location = (x, y, z)
            self.camera.keyframe_insert(data_path="location", frame=frame)
            
            # Always look at target
            direction = target.location - self.camera.location
            rot_quat = direction.to_track_quat('-Z', 'Y')
            self.camera.rotation_euler = rot_quat.to_euler()
            self.camera.keyframe_insert(data_path="rotation_euler", frame=frame)
        
        print(f"✅ Orbit {angle_degrees}° around {target.name}")
    
    def crane(self, target: bpy.types.Object,
             start_height: float, end_height: float,
             arc_distance: float, duration_frames: int = 120) -> None:
        """
        Crane shot combining pedestal and arc movement.
        """
        scene = bpy.context.scene
        start_frame = scene.frame_current
        
        base_location = self.camera.location.copy()
        
        for i in range(duration_frames + 1):
            frame = start_frame + i
            t = i / duration_frames
            
            # Smooth interpolation
            if t < 0.5:
                t_smooth = 2 * t * t
            else:
                t_smooth = -1 + (4 - 2 * t) * t
            
            # Height change
            height = start_height + (end_height - start_height) * t_smooth
            
            # Arc movement
            arc_offset = mathutils.Vector((arc_distance * t_smooth, 0, 0))
            
            # Update position
            self.camera.location = base_location + mathutils.Vector((0, 0, height)) + arc_offset
            self.camera.keyframe_insert(data_path="location", frame=frame)
            
            # Look at target
            direction = target.location - self.camera.location
            rot_quat = direction.to_track_quat('-Z', 'Y')
            self.camera.rotation_euler = rot_quat.to_euler()
            self.camera.keyframe_insert(data_path="rotation_euler", frame=frame)
        
        print(f"✅ Crane shot from {start_height}m to {end_height}m")
    
    def _animate_location(self, end_location: mathutils.Vector,
                         duration_frames: int, ease_in_out: bool) -> None:
        """Animate camera location"""
        scene = bpy.context.scene
        start_frame = scene.frame_current
        end_frame = start_frame + duration_frames
        
        start_location = self.camera.location.copy()
        
        # Insert keyframes for smooth animation
        for i in range(duration_frames + 1):
            frame = start_frame + i
            t = i / duration_frames
            
            if ease_in_out:
                # Ease in-out interpolation
                t = t * t * (3 - 2 * t)
            
            self.camera.location = start_location.lerp(end_location, t)
            self.camera.keyframe_insert(data_path="location", frame=frame)
    
    def _animate_rotation(self, end_rotation: mathutils.Euler,
                         duration_frames: int, ease_in_out: bool) -> None:
        """Animate camera rotation"""
        scene = bpy.context.scene
        start_frame = scene.frame_current
        
        start_rotation = self.camera.rotation_euler.copy()
        
        for i in range(duration_frames + 1):
            frame = start_frame + i
            t = i / duration_frames
            
            if ease_in_out:
                t = t * t * (3 - 2 * t)
            
            # Interpolate each axis
            rot_x = start_rotation[0] + (end_rotation[0] - start_rotation[0]) * t
