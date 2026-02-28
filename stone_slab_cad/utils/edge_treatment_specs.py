"""
Comprehensive Manufacturing Process Specifications for Surface Finishing and Edge Treatment

This module defines manufacturing specifications for:
- Brushed surface texture treatment
- Precision C8 chamfer profile machining (8.0mm depth at 45° inclusive angle)
- Edge conditioning protocols for all four perimeter orientations
- Drip edge overhang flashing integration
- GD&T validation algorithms
- Multiple profile varieties (round, half-round, ogee, cove, etc.)
"""

from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
import math


class EdgeOrientation(Enum):
    """Four perimeter orientations for edge treatment application"""
    ANTERIOR = "front"      # Front edge
    POSTERIOR = "rear"      # Rear edge
    PORT = "left"           # Left edge
    STARBOARD = "right"     # Right edge


class ProfileType(Enum):
    """Available edge profile types"""
    C8_CHAMFER = "c8_chamfer"           # C8: 8.0mm depth, 45° angle
    C5_CHAMFER = "c5_chamfer"           # C5: 5.0mm depth, 45° angle
    C10_CHAMFER = "c10_chamfer"         # C10: 10.0mm depth, 45° angle
    FULL_ROUND = "full_round"           # Full bullnose
    HALF_ROUND = "half_round"           # Half bullnose (Demi-bullnose)
    QUARTER_ROUND = "quarter_round"     # Quarter round
    OGEE = "ogee"                       # S-curve ogee profile
    COVE = "cove"                       # Concave cove profile
    DOUBLE_COVE = "double_cove"         # Double cove (cove + bevel)
    OVOLO = "ovolo"                     # Quarter round with step
    DUPONT = "dupont"                   # Fancy ogee variation
    WATERFALL = "waterfall"             # Cascading edge
    PENCIL = "pencil"                   # Small radius edge
    MITER_45 = "miter_45"               # 45-degree miter edge
    STEPPED = "stepped"                 # Multi-level step profile
    BEVELED_30 = "beveled_30"           # 30-degree bevel
    BEVELED_60 = "beveled_60"           # 60-degree bevel


class SurfaceFinish(Enum):
    """Surface texture treatment types"""
    POLISHED = "polished"               # Mirror finish
    HONED = "honed"                     # Smooth matte
    BRUSHED = "brushed"                 # Linear texture
    LEATHERED = "leathered"             # Textured organic
    FLAMED = "flamed"                   # Thermal texture
    BUSH_HAMMERED = "bush_hammered"     # Rough textured
    SAND_BLASTED = "sand_blasted"       # Matte uniform
    ANTIQUED = "antiqued"               # Distressed finish


@dataclass
class ChamferSpecification:
    """
    C8 Chamfer Profile Specifications
    Standard C8: 8.0mm depth at 45-degree inclusive angle
    """
    depth_mm: float = 8.0               # Chamfer depth in mm
    angle_degrees: float = 45.0         # Inclusive angle
    width_mm: Optional[float] = None    # Chamfer face width (calculated)
    tolerance_mm: float = 0.5           # ISO tolerance class
    surface_roughness_ra: float = 3.2   # Surface roughness in μm Ra
    
    def __post_init__(self):
        # Calculate chamfer width based on depth and angle
        # For 45° chamfer: width = depth * tan(45°) * 2 = depth * 2
        half_angle_rad = math.radians(self.angle_degrees / 2)
        self.width_mm = self.depth_mm * math.tan(half_angle_rad) * 2
    
    @property
    def chamfer_leg_length(self) -> float:
        """Calculate the leg length of the chamfer"""
        return self.depth_mm / math.cos(math.radians(self.angle_degrees / 2))


@dataclass
class GDnTSpecification:
    """
    Geometric Dimensioning and Tolerancing (GD&T) Specifications
    Per ISO 1101 and ASME Y14.5 standards
    """
    # Profile of a surface tolerance
    profile_tolerance_mm: float = 0.1
    
    # Angular tolerance for chamfer angles
    angular_tolerance_deg: float = 0.5
    
    # Parallelism tolerance for edge treatment
    parallelism_tolerance_mm: float = 0.05
    
    # Perpendicularity tolerance
    perpendicularity_tolerance_mm: float = 0.1
    
    # Symmetry tolerance for dual-edge treatments
    symmetry_tolerance_mm: float = 0.15
    
    # Position tolerance for drip edge placement
    position_tolerance_mm: float = 1.0
    
    # Flatness tolerance for treated surfaces
    flatness_tolerance_mm: float = 0.05
    
    # Cylindricity tolerance for rounded profiles
    cylindricity_tolerance_mm: float = 0.1


@dataclass
class ProfileGeometry:
    """
    Comprehensive profile geometry definition
    """
    profile_type: ProfileType
    
    # Primary dimensions
    radius_mm: Optional[float] = None           # For rounded profiles
    depth_mm: Optional[float] = None            # For chamfer/bevel profiles
    angle_degrees: Optional[float] = None       # For angled profiles
    
    # Multi-segment profiles (ogee, waterfall, etc.)
    segments: List[Dict[str, Any]] = field(default_factory=list)
    
    # CNC machining parameters
    tool_diameter_mm: float = 20.0
    spindle_speed_rpm: int = 12000
    feed_rate_mmin: float = 2.0
    stepover_mm: float = 0.5
    
    # Profile factor for bmesh bevel (0=chamfer, 0.5=round, 1=concave)
    profile_factor: float = 0.5
    segments_count: int = 16
    
    def __post_init__(self):
        # Set default parameters based on profile type
        self._set_default_parameters()
    
    def _set_default_parameters(self):
        """Configure default parameters for each profile type"""
        defaults = {
            ProfileType.C8_CHAMFER: {
                'depth_mm': 8.0,
                'angle_degrees': 45.0,
                'profile_factor': 0.0,
                'segments_count': 1,
                'tool_diameter_mm': 20.0
            },
            ProfileType.C5_CHAMFER: {
                'depth_mm': 5.0,
                'angle_degrees': 45.0,
                'profile_factor': 0.0,
                'segments_count': 1,
                'tool_diameter_mm': 16.0
            },
            ProfileType.C10_CHAMFER: {
                'depth_mm': 10.0,
                'angle_degrees': 45.0,
                'profile_factor': 0.0,
                'segments_count': 1,
                'tool_diameter_mm': 25.0
            },
            ProfileType.FULL_ROUND: {
                'radius_mm': 20.0,
                'profile_factor': 0.5,
                'segments_count': 16,
                'tool_diameter_mm': 40.0
            },
            ProfileType.HALF_ROUND: {
                'radius_mm': 10.0,
                'profile_factor': 0.5,
                'segments_count': 12,
                'tool_diameter_mm': 20.0
            },
            ProfileType.QUARTER_ROUND: {
                'radius_mm': 6.0,
                'profile_factor': 0.5,
                'segments_count': 8,
                'tool_diameter_mm': 12.0
            },
            ProfileType.OGEE: {
                'radius_mm': 15.0,
                'profile_factor': 0.7,
                'segments_count': 20,
                'tool_diameter_mm': 30.0,
                'segments': [
                    {'type': 'concave', 'radius_ratio': 0.6},
                    {'type': 'convex', 'radius_ratio': 0.4}
                ]
            },
            ProfileType.COVE: {
                'radius_mm': 8.0,
                'profile_factor': 1.0,
                'segments_count': 10,
                'tool_diameter_mm': 16.0
            },
            ProfileType.DOUBLE_COVE: {
                'radius_mm': 12.0,
                'profile_factor': 1.0,
                'segments_count': 14,
                'tool_diameter_mm': 25.0,
                'segments': [
                    {'type': 'cove', 'ratio': 0.5},
                    {'type': 'bevel', 'ratio': 0.5}
                ]
            },
            ProfileType.OVOLO: {
                'radius_mm': 10.0,
                'depth_mm': 5.0,
                'profile_factor': 0.6,
                'segments_count': 12,
                'tool_diameter_mm': 20.0
            },
            ProfileType.DUPONT: {
                'radius_mm': 18.0,
                'profile_factor': 0.8,
                'segments_count': 24,
                'tool_diameter_mm': 35.0,
                'segments': [
                    {'type': 'step', 'height': 2},
                    {'type': 'ogee', 'ratio': 0.8}
                ]
            },
            ProfileType.WATERFALL: {
                'radius_mm': 25.0,
                'depth_mm': 15.0,
                'profile_factor': 0.4,
                'segments_count': 32,
                'tool_diameter_mm': 50.0,
                'feed_rate_mmin': 1.5
            },
            ProfileType.PENCIL: {
                'radius_mm': 3.0,
                'profile_factor': 0.5,
                'segments_count': 6,
                'tool_diameter_mm': 6.0,
                'spindle_speed_rpm': 18000
            },
            ProfileType.MITER_45: {
                'depth_mm': 20.0,
                'angle_degrees': 45.0,
                'profile_factor': 0.0,
                'segments_count': 1,
                'tool_diameter_mm': 12.0
            },
            ProfileType.STEPPED: {
                'depth_mm': 10.0,
                'profile_factor': 0.0,
                'segments_count': 3,
                'tool_diameter_mm': 20.0,
                'segments': [
                    {'type': 'step', 'height': 3},
                    {'type': 'land', 'width': 4},
                    {'type': 'step', 'height': 3}
                ]
            },
            ProfileType.BEVELED_30: {
                'depth_mm': 8.0,
                'angle_degrees': 30.0,
                'profile_factor': 0.0,
                'segments_count': 1,
                'tool_diameter_mm': 16.0
            },
            ProfileType.BEVELED_60: {
                'depth_mm': 12.0,
                'angle_degrees': 60.0,
                'profile_factor': 0.0,
                'segments_count': 1,
                'tool_diameter_mm': 20.0
            }
        }
        
        if self.profile_type in defaults:
            for key, value in defaults[self.profile_type].items():
                if getattr(self, key) is None or (isinstance(getattr(self, key), (int, float)) and getattr(self, key) == 0):
                    setattr(self, key, value)


@dataclass
class DripEdgeSpecification:
    """
    Drip edge overhang flashing configuration
    Ensures weather protection continuity across all four edge orientations
    """
    # Geometric dimensions
    overhang_mm: float = 30.0               # Horizontal overhang distance
    flashing_height_mm: float = 15.0        # Vertical flashing height
    groove_depth_mm: float = 5.0            # Drip groove depth
    groove_width_mm: float = 8.0            # Drip groove width
    
    # Positioning
    distance_from_edge_mm: float = 20.0     # Distance from slab edge
    
    # Material specifications
    material: str = "aluminum"              # Flashing material
    thickness_mm: float = 0.8               # Flashing thickness
    finish: str = "anodized"                # Surface finish
    
    # Integration parameters
    integration_type: str = "rabbet"        # How it integrates with slab
    sealant_required: bool = True
    sealant_type: str = "polyurethane"


@dataclass
class SurfaceTreatmentSpec:
    """
    Surface finishing and texture treatment specifications
    """
    finish_type: SurfaceFinish = SurfaceFinish.BRUSHED
    
    # Brushed finish parameters
    brush_direction: str = "lengthwise"     # lengthwise, crosswise, diagonal
    brush_grit: int = 120                   # Abrasive grit size
    brush_pattern_mm: float = 0.5           # Pattern spacing
    
    # Surface texture parameters
    roughness_ra: float = 1.6               # Average roughness in μm
    roughness_rz: float = 6.3               # Mean roughness depth
    
    # Polishing parameters (for pre-brush preparation)
    polish_compound: str = "diamond"
    polish_grit_sequence: List[int] = field(default_factory=lambda: [200, 400, 800, 1200])
    
    # Quality control
    gloss_level_at_60deg: Optional[float] = None  # Gloss units at 60°
    color_uniformity_delta_e: float = 1.0   # Max color variation


@dataclass
class ManufacturingProcessSpec:
    """
    Complete manufacturing process specification
    Integrates all edge treatment, surface finishing, and flashing specifications
    """
    # Primary identification
    specification_id: str
    description: str
    revision: str = "A"
    
    # Edge treatment specifications (per orientation)
    edge_treatments: Dict[EdgeOrientation, ProfileGeometry] = field(default_factory=dict)
    
    # C8 Chamfer specification (default)
    c8_chamfer: ChamferSpecification = field(default_factory=ChamferSpecification)
    
    # GD&T specifications
    gdt_spec: GDnTSpecification = field(default_factory=GDnTSpecification)
    
    # Surface treatment
    surface_treatment: SurfaceTreatmentSpec = field(default_factory=SurfaceTreatmentSpec)
    
    # Drip edge flashing (per orientation)
    drip_edges: Dict[EdgeOrientation, DripEdgeSpecification] = field(default_factory=dict)
    
    # CNC machining parameters
    coolant_type: str = "water_soluble"
    coolant_concentration: float = 8.0      # Percentage
    
    # Quality control
    inspection_frequency: str = "100_percent"
    sample_size: int = 1
    
    def apply_to_all_edges(self, profile: ProfileGeometry):
        """Apply the same profile to all four edge orientations"""
        for orientation in EdgeOrientation:
            self.edge_treatments[orientation] = profile
    
    def apply_drip_edge_to_all(self, drip_edge: DripEdgeSpecification):
        """Apply drip edge flashing to all four edge orientations"""
        for orientation in EdgeOrientation:
            self.drip_edges[orientation] = drip_edge


class ManufacturingSpecBuilder:
    """
    Builder pattern for creating manufacturing specifications
    """
    
    def __init__(self, spec_id: str, description: str):
        self.spec = ManufacturingProcessSpec(
            specification_id=spec_id,
            description=description
        )
    
    def with_c8_chamfer(self, tolerance: float = 0.5) -> 'ManufacturingSpecBuilder':
        """Configure C8 chamfer specification"""
        self.spec.c8_chamfer = ChamferSpecification(
            depth_mm=8.0,
            angle_degrees=45.0,
            tolerance_mm=tolerance
        )
        return self
    
    def with_custom_chamfer(self, depth_mm: float, angle_degrees: float = 45.0) -> 'ManufacturingSpecBuilder':
        """Configure custom chamfer specification"""
        self.spec.c8_chamfer = ChamferSpecification(
            depth_mm=depth_mm,
            angle_degrees=angle_degrees
        )
        return self
    
    def with_edge_profile(self, orientation: EdgeOrientation, profile_type: ProfileType,
                         **kwargs) -> 'ManufacturingSpecBuilder':
        """Add edge profile for specific orientation"""
        profile = ProfileGeometry(profile_type=profile_type, **kwargs)
        self.spec.edge_treatments[orientation] = profile
        return self
    
    def with_all_edges(self, profile_type: ProfileType, **kwargs) -> 'ManufacturingSpecBuilder':
        """Apply same profile to all edges"""
        profile = ProfileGeometry(profile_type=profile_type, **kwargs)
        self.spec.apply_to_all_edges(profile)
        return self
    
    def with_brushed_surface(self, direction: str = "lengthwise", grit: int = 120) -> 'ManufacturingSpecBuilder':
        """Configure brushed surface finish"""
        self.spec.surface_treatment = SurfaceTreatmentSpec(
            finish_type=SurfaceFinish.BRUSHED,
            brush_direction=direction,
            brush_grit=grit
        )
        return self
    
    def with_drip_edge(self, orientation: EdgeOrientation, **kwargs) -> 'ManufacturingSpecBuilder':
        """Add drip edge for specific orientation"""
        drip_edge = DripEdgeSpecification(**kwargs)
        self.spec.drip_edges[orientation] = drip_edge
        return self
    
    def with_all_drip_edges(self, **kwargs) -> 'ManufacturingSpecBuilder':
        """Apply drip edge to all orientations"""
        drip_edge = DripEdgeSpecification(**kwargs)
        self.spec.apply_drip_edge_to_all(drip_edge)
        return self
    
    def with_gdt(self, **kwargs) -> 'ManufacturingSpecBuilder':
        """Configure GD&T specifications"""
        self.spec.gdt_spec = GDnTSpecification(**kwargs)
        return self
    
    def build(self) -> ManufacturingProcessSpec:
        """Build and return the complete specification"""
        return self.spec


# Predefined specification templates

def get_c8_chamfer_spec() -> ManufacturingProcessSpec:
    """
    Standard C8 Chamfer Specification
    8.0mm depth at 45° inclusive angle on all edges
    Brushed surface finish
    Drip edge on all four sides
    """
    return (ManufacturingSpecBuilder(
        spec_id="C8-STD-001",
        description="Standard C8 Chamfer with Brushed Finish"
    )
    .with_c8_chamfer(tolerance=0.5)
    .with_all_edges(ProfileType.C8_CHAMFER)
    .with_brushed_surface(direction="lengthwise", grit=120)
    .with_all_drip_edges(overhang_mm=30.0, groove_depth_mm=5.0)
    .with_gdt(profile_tolerance_mm=0.1, angular_tolerance_deg=0.5)
    .build())


def get_rounded_edge_spec(radius_mm: float = 10.0) -> ManufacturingProcessSpec:
    """
    Half-round edge profile specification
    """
    return (ManufacturingSpecBuilder(
        spec_id=f"HR-{radius_mm:.0f}-001",
        description=f"Half-Round Edge Profile (R{radius_mm:.0f}mm)"
    )
    .with_all_edges(ProfileType.HALF_ROUND, radius_mm=radius_mm)
    .with_brushed_surface(direction="lengthwise", grit=120)
    .with_all_drip_edges(overhang_mm=25.0, groove_depth_mm=5.0)
    .build())


def get_full_bullnose_spec(radius_mm: float = 20.0) -> ManufacturingProcessSpec:
    """
    Full bullnose (full round) edge profile specification
    """
    return (ManufacturingSpecBuilder(
        spec_id=f"FB-{radius_mm:.0f}-001",
        description=f"Full Bullnose Edge Profile (R{radius_mm:.0f}mm)"
    )
    .with_all_edges(ProfileType.FULL_ROUND, radius_mm=radius_mm)
    .with_brushed_surface(direction="lengthwise", grit=220)
    .with_all_drip_edges(overhang_mm=20.0, groove_depth_mm=4.0)
    .build())


def get_ogee_edge_spec() -> ManufacturingProcessSpec:
    """
    Ogee (S-curve) edge profile specification
    Elegant traditional profile
    """
    return (ManufacturingSpecBuilder(
        spec_id="OG-STD-001",
        description="Ogee Edge Profile (S-Curve)"
    )
    .with_all_edges(ProfileType.OGEE, radius_mm=15.0)
    .with_brushed_surface(direction="lengthwise", grit=180)
    .with_all_drip_edges(overhang_mm=35.0, groove_depth_mm=5.0)
    .build())


def get_waterfall_edge_spec() -> ManufacturingProcessSpec:
    """
    Waterfall edge profile specification
    Cascading mitered edge
    """
    return (ManufacturingSpecBuilder(
        spec_id="WF-STD-001",
        description="Waterfall Edge Profile (Cascading)"
    )
    .with_all_edges(ProfileType.WATERFALL, depth_mm=15.0)
    .with_brushed_surface(direction="lengthwise", grit=120)
    .build())


def get_varied_edge_spec(
    front_profile: ProfileType = ProfileType.C8_CHAMFER,
    rear_profile: ProfileType = ProfileType.HALF_ROUND,
    left_profile: ProfileType = ProfileType.COVE,
    right_profile: ProfileType = ProfileType.OGEE
) -> ManufacturingProcessSpec:
    """
    Specification with different profiles on each edge
    Demonstrates asymmetric edge treatment capability
    """
    builder = ManufacturingSpecBuilder(
        spec_id="VAR-MIX-001",
        description="Varied Edge Profiles per Orientation"
    )
    
    builder.with_edge_profile(EdgeOrientation.ANTERIOR, front_profile)
    builder.with_edge_profile(EdgeOrientation.POSTERIOR, rear_profile)
    builder.with_edge_profile(EdgeOrientation.PORT, left_profile)
    builder.with_edge_profile(EdgeOrientation.STARBOARD, right_profile)
    
    return (builder
    .with_brushed_surface(direction="lengthwise", grit=120)
    .with_all_drip_edges(overhang_mm=30.0, groove_depth_mm=5.0)
    .build())


# Export all classes and functions
__all__ = [
    'EdgeOrientation',
    'ProfileType',
    'SurfaceFinish',
    'ChamferSpecification',
    'GDnTSpecification',
    'ProfileGeometry',
    'DripEdgeSpecification',
    'SurfaceTreatmentSpec',
    'ManufacturingProcessSpec',
    'ManufacturingSpecBuilder',
    'get_c8_chamfer_spec',
    'get_rounded_edge_spec',
    'get_full_bullnose_spec',
    'get_ogee_edge_spec',
    'get_waterfall_edge_spec',
    'get_varied_edge_spec'
]
