"""
Geometric Dimensioning and Tolerancing (GD&T) Validation Algorithms

This module implements real-time geometric dimensioning and tolerancing validation
to verify chamfer consistency, edge squareness, and drip edge alignment accuracy.

Compliant with:
- ISO 1101:2017 Geometrical tolerancing
- ASME Y14.5-2018 Dimensioning and Tolerancing
- ISO 8015:2011 Fundamental tolerancing principle
"""

import numpy as np
from typing import Dict, Any, List, Tuple, Optional
from dataclasses import dataclass, field
from enum import Enum
import math
from .edge_treatment_specs import (
    ManufacturingProcessSpec, EdgeOrientation, GDnTSpecification,
    ChamferSpecification, ProfileGeometry, DripEdgeSpecification
)


class ValidationStatus(Enum):
    """Validation result status"""
    PASS = "pass"
    WARN = "warning"
    FAIL = "fail"
    NOT_CHECKED = "not_checked"


@dataclass
class MeasurementPoint:
    """Single measurement point with coordinates and uncertainty"""
    x: float
    y: float
    z: float
    uncertainty_mm: float = 0.01
    timestamp: Optional[str] = None
    
    def distance_to(self, other: 'MeasurementPoint') -> float:
        """Calculate Euclidean distance to another point"""
        return math.sqrt(
            (self.x - other.x) ** 2 +
            (self.y - other.y) ** 2 +
            (self.z - other.z) ** 2
        )
    
    def to_array(self) -> np.ndarray:
        """Convert to numpy array"""
        return np.array([self.x, self.y, self.z])


@dataclass
class ChamferMeasurement:
    """Measurement data for a chamfer feature"""
    edge_orientation: EdgeOrientation
    
    # Measured dimensions
    depth_mm: float
    angle_degrees: float
    width_mm: float
    
    # Surface points
    top_edge_points: List[MeasurementPoint] = field(default_factory=list)
    bottom_edge_points: List[MeasurementPoint] = field(default_factory=list)
    face_points: List[MeasurementPoint] = field(default_factory=list)
    
    # Surface roughness
    roughness_ra: Optional[float] = None
    
    def calculate_deviations(self, spec: ChamferSpecification) -> Dict[str, float]:
        """Calculate deviations from specification"""
        return {
            'depth_deviation_mm': self.depth_mm - spec.depth_mm,
            'angle_deviation_deg': self.angle_degrees - spec.angle_degrees,
            'width_deviation_mm': self.width_mm - (spec.width_mm or 0)
        }


@dataclass
class ValidationResult:
    """Result of a GD&T validation check"""
    check_name: str
    status: ValidationStatus
    measured_value: float
    nominal_value: float
    deviation: float
    tolerance: float
    compliance_percentage: float
    message: str
    recommendations: List[str] = field(default_factory=list)


@dataclass
class EdgeValidationReport:
    """Complete validation report for all edges"""
    specification_id: str
    timestamp: str
    
    # Per-orientation results
    chamfer_results: Dict[EdgeOrientation, List[ValidationResult]] = field(default_factory=dict)
    squareness_results: Dict[EdgeOrientation, ValidationResult] = field(default_factory=dict)
    drip_edge_results: Dict[EdgeOrientation, List[ValidationResult]] = field(default_factory=dict)
    
    # Overall statistics
    total_checks: int = 0
    passed_checks: int = 0
    warning_checks: int = 0
    failed_checks: int = 0
    
    @property
    def overall_status(self) -> ValidationStatus:
        """Determine overall validation status"""
        if self.failed_checks > 0:
            return ValidationStatus.FAIL
        elif self.warning_checks > 0:
            return ValidationStatus.WARN
        elif self.passed_checks > 0:
            return ValidationStatus.PASS
        return ValidationStatus.NOT_CHECKED


class ChamferValidator:
    """
    Validates chamfer geometry against C8 (or custom) specifications
    """
    
    def __init__(self, spec: ChamferSpecification):
        self.spec = spec
    
    def validate_depth(self, measurement: ChamferMeasurement) -> ValidationResult:
        """Validate chamfer depth"""
        deviation = abs(measurement.depth_mm - self.spec.depth_mm)
        tolerance = self.spec.tolerance_mm
        
        status = ValidationStatus.PASS
        if deviation > tolerance * 2:
            status = ValidationStatus.FAIL
        elif deviation > tolerance:
            status = ValidationStatus.WARN
        
        compliance = max(0, 100 - (deviation / tolerance) * 100) if tolerance > 0 else 100
        
        recommendations = []
        if status == ValidationStatus.FAIL:
            recommendations.append(f"Adjust CNC tool offset by {deviation:.2f}mm")
            recommendations.append("Verify tool wear and replace if necessary")
        elif status == ValidationStatus.WARN:
            recommendations.append("Monitor tool wear closely")
            recommendations.append("Check coolant flow and concentration")
        
        return ValidationResult(
            check_name=f"Chamfer Depth - {measurement.edge_orientation.value}",
            status=status,
            measured_value=measurement.depth_mm,
            nominal_value=self.spec.depth_mm,
            deviation=deviation,
            tolerance=tolerance,
            compliance_percentage=compliance,
            message=f"Depth: {measurement.depth_mm:.2f}mm (spec: {self.spec.depth_mm:.2f}mm ±{tolerance}mm)",
            recommendations=recommendations
        )
    
    def validate_angle(self, measurement: ChamferMeasurement) -> ValidationResult:
        """Validate chamfer angle"""
        deviation = abs(measurement.angle_degrees - self.spec.angle_degrees)
        tolerance = 0.5  # Default angular tolerance in degrees
        
        status = ValidationStatus.PASS
        if deviation > tolerance * 2:
            status = ValidationStatus.FAIL
        elif deviation > tolerance:
            status = ValidationStatus.WARN
        
        compliance = max(0, 100 - (deviation / tolerance) * 100) if tolerance > 0 else 100
        
        recommendations = []
        if status == ValidationStatus.FAIL:
            recommendations.append("Check CNC tool orientation/tilt")
            recommendations.append("Verify fixture alignment and clamping")
        
        return ValidationResult(
            check_name=f"Chamfer Angle - {measurement.edge_orientation.value}",
            status=status,
            measured_value=measurement.angle_degrees,
            nominal_value=self.spec.angle_degrees,
            deviation=deviation,
            tolerance=tolerance,
            compliance_percentage=compliance,
            message=f"Angle: {measurement.angle_degrees:.2f}° (spec: {self.spec.angle_degrees:.2f}° ±{tolerance}°)",
            recommendations=recommendations
        )
    
    def validate_surface_roughness(self, measurement: ChamferMeasurement) -> ValidationResult:
        """Validate surface roughness on chamfer face"""
        if measurement.roughness_ra is None:
            return ValidationResult(
                check_name=f"Surface Roughness - {measurement.edge_orientation.value}",
                status=ValidationStatus.NOT_CHECKED,
                measured_value=0,
                nominal_value=self.spec.surface_roughness_ra,
                deviation=0,
                tolerance=0.5,
                compliance_percentage=0,
                message="Surface roughness not measured",
                recommendations=["Perform surface roughness measurement"]
            )
        
        deviation = abs(measurement.roughness_ra - self.spec.surface_roughness_ra)
        tolerance = 0.5  # Ra tolerance
        
        status = ValidationStatus.PASS if deviation <= tolerance else ValidationStatus.WARN
        compliance = max(0, 100 - (deviation / tolerance) * 50)
        
        return ValidationResult(
            check_name=f"Surface Roughness - {measurement.edge_orientation.value}",
            status=status,
            measured_value=measurement.roughness_ra,
            nominal_value=self.spec.surface_roughness_ra,
            deviation=deviation,
            tolerance=tolerance,
            compliance_percentage=compliance,
            message=f"Ra: {measurement.roughness_ra:.2f}μm (spec: {self.spec.surface_roughness_ra:.2f}μm)",
            recommendations=[]
        )
    
    def validate_profile_consistency(self, measurements: List[ChamferMeasurement]) -> ValidationResult:
        """Validate consistency across all chamfer measurements"""
        if len(measurements) < 2:
            return ValidationResult(
                check_name="Chamfer Profile Consistency",
                status=ValidationStatus.NOT_CHECKED,
                measured_value=0,
                nominal_value=0,
                deviation=0,
                tolerance=0,
                compliance_percentage=0,
                message="Insufficient measurements for consistency check"
            )
        
        depths = [m.depth_mm for m in measurements]
        angles = [m.angle_degrees for m in measurements]
        
        depth_std = np.std(depths)
        angle_std = np.std(angles)
        
        # Profile of a surface tolerance
        profile_tolerance = 0.1
        max_deviation = max(depth_std, angle_std / 10)  # Normalize angle to depth scale
        
        status = ValidationStatus.PASS
        if max_deviation > profile_tolerance * 2:
            status = ValidationStatus.FAIL
        elif max_deviation > profile_tolerance:
            status = ValidationStatus.WARN
        
        compliance = max(0, 100 - (max_deviation / profile_tolerance) * 100)
        
        return ValidationResult(
            check_name="Chamfer Profile Consistency (All Edges)",
            status=status,
            measured_value=max_deviation,
            nominal_value=0,
            deviation=max_deviation,
            tolerance=profile_tolerance,
            compliance_percentage=compliance,
            message=f"Depth std: {depth_std:.3f}mm, Angle std: {angle_std:.2f}°",
            recommendations=["Check machine calibration" if status != ValidationStatus.PASS else ""]
        )


class EdgeSquarenessValidator:
    """
    Validates edge squareness (perpendicularity) to reference faces
