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
    """
    
    def __init__(self, gdt_spec: GDnTSpecification):
        self.spec = gdt_spec
    
    def calculate_edge_vector(self, edge_points: List[MeasurementPoint]) -> np.ndarray:
        """Calculate the primary vector direction of an edge"""
        if len(edge_points) < 2:
            return np.array([0, 0, 1])
        
        # Fit line to points using PCA
        points_array = np.array([[p.x, p.y, p.z] for p in edge_points])
        centroid = np.mean(points_array, axis=0)
        centered = points_array - centroid
        
        # SVD to find principal direction
        _, _, vh = np.linalg.svd(centered)
        return vh[0]  # First principal component
    
    def calculate_perpendicularity(self, 
                                   edge_vector: np.ndarray,
                                   reference_normal: np.ndarray) -> float:
        """
        Calculate perpendicularity deviation in mm over 100mm length
        """
        # Normalize vectors
        edge_vector = edge_vector / np.linalg.norm(edge_vector)
        reference_normal = reference_normal / np.linalg.norm(reference_normal)
        
        # For perpendicularity, edge should be perpendicular to reference
        # Dot product should be close to 0 for perpendicular vectors
        dot_product = abs(np.dot(edge_vector, reference_normal))
        
        # Convert to angular deviation
        angle_rad = math.acos(min(1, dot_product))
        angle_deg = math.degrees(angle_rad)
        
        # Convert to linear deviation over 100mm
        deviation_mm = math.tan(angle_rad) * 100.0
        
        return deviation_mm
    
    def validate_edge_squareness(self,
                                 edge_points: List[MeasurementPoint],
                                 reference_normal: np.ndarray,
                                 orientation: EdgeOrientation) -> ValidationResult:
        """Validate squareness of a single edge"""
        edge_vector = self.calculate_edge_vector(edge_points)
        deviation_mm = self.calculate_perpendicularity(edge_vector, reference_normal)
        
        tolerance = self.spec.perpendicularity_tolerance_mm
        
        status = ValidationStatus.PASS
        if deviation_mm > tolerance * 2:
            status = ValidationStatus.FAIL
        elif deviation_mm > tolerance:
            status = ValidationStatus.WARN
        
        compliance = max(0, 100 - (deviation_mm / tolerance) * 100) if tolerance > 0 else 100
        
        recommendations = []
        if status == ValidationStatus.FAIL:
            recommendations.append("Check machine axis alignment")
            recommendations.append("Verify workpiece fixture squareness")
        
        return ValidationResult(
            check_name=f"Edge Squareness - {orientation.value}",
            status=status,
            measured_value=deviation_mm,
            nominal_value=0,
            deviation=deviation_mm,
            tolerance=tolerance,
            compliance_percentage=compliance,
            message=f"Perpendicularity: {deviation_mm:.3f}mm/100mm (tolerance: ±{tolerance}mm)",
            recommendations=recommendations
        )


class DripEdgeValidator:
    """
    Validates drip edge overhang flashing alignment and positioning
    """
    
    def __init__(self, spec: DripEdgeSpecification, gdt_spec: GDnTSpecification):
        self.drip_spec = spec
        self.gdt_spec = gdt_spec
    
    def validate_overhang_distance(self, 
                                   measured_overhang_mm: float,
                                   orientation: EdgeOrientation) -> ValidationResult:
        """Validate drip edge overhang distance"""
        deviation = abs(measured_overhang_mm - self.drip_spec.overhang_mm)
        tolerance = 2.0  # 2mm tolerance for overhang
        
        status = ValidationStatus.PASS
        if deviation > tolerance * 2:
            status = ValidationStatus.FAIL
        elif deviation > tolerance:
            status = ValidationStatus.WARN
        
        compliance = max(0, 100 - (deviation / tolerance) * 100)
        
        return ValidationResult(
            check_name=f"Drip Edge Overhang - {orientation.value}",
            status=status,
            measured_value=measured_overhang_mm,
            nominal_value=self.drip_spec.overhang_mm,
            deviation=deviation,
            tolerance=tolerance,
            compliance_percentage=compliance,
            message=f"Overhang: {measured_overhang_mm:.1f}mm (spec: {self.drip_spec.overhang_mm:.1f}mm ±{tolerance}mm)",
            recommendations=["Adjust flashing bracket position" if status != ValidationStatus.PASS else ""]
        )
    
    def validate_groove_position(self,
                                 measured_distance_from_edge_mm: float,
                                 orientation: EdgeOrientation) -> ValidationResult:
        """Validate drip groove position relative to slab edge"""
        deviation = abs(measured_distance_from_edge_mm - self.drip_spec.distance_from_edge_mm)
        tolerance = self.gdt_spec.position_tolerance_mm
        
        status = ValidationStatus.PASS if deviation <= tolerance else ValidationStatus.WARN
        compliance = max(0, 100 - (deviation / tolerance) * 100)
        
        return ValidationResult(
            check_name=f"Drip Groove Position - {orientation.value}",
            status=status,
            measured_value=measured_distance_from_edge_mm,
            nominal_value=self.drip_spec.distance_from_edge_mm,
            deviation=deviation,
            tolerance=tolerance,
            compliance_percentage=compliance,
            message=f"Position: {measured_distance_from_edge_mm:.1f}mm from edge (spec: {self.drip_spec.distance_from_edge_mm:.1f}mm ±{tolerance}mm)",
            recommendations=[]
        )
    
    def validate_groove_dimensions(self,
                                   measured_width_mm: float,
                                   measured_depth_mm: float,
                                   orientation: EdgeOrientation) -> List[ValidationResult]:
        """Validate drip groove width and depth"""
        results = []
        
        # Width validation
        width_deviation = abs(measured_width_mm - self.drip_spec.groove_width_mm)
        width_tolerance = 0.5
        width_status = ValidationStatus.PASS if width_deviation <= width_tolerance else ValidationStatus.WARN
        
        results.append(ValidationResult(
            check_name=f"Drip Groove Width - {orientation.value}",
            status=width_status,
            measured_value=measured_width_mm,
            nominal_value=self.drip_spec.groove_width_mm,
            deviation=width_deviation,
            tolerance=width_tolerance,
            compliance_percentage=max(0, 100 - (width_deviation / width_tolerance) * 100),
            message=f"Width: {measured_width_mm:.1f}mm (spec: {self.drip_spec.groove_width_mm:.1f}mm ±{width_tolerance}mm)"
        ))
        
        # Depth validation
        depth_deviation = abs(measured_depth_mm - self.drip_spec.groove_depth_mm)
        depth_tolerance = 0.5
        depth_status = ValidationStatus.PASS if depth_deviation <= depth_tolerance else ValidationStatus.WARN
        
        results.append(ValidationResult(
            check_name=f"Drip Groove Depth - {orientation.value}",
            status=depth_status,
            measured_value=measured_depth_mm,
            nominal_value=self.drip_spec.groove_depth_mm,
            deviation=depth_deviation,
            tolerance=depth_tolerance,
            compliance_percentage=max(0, 100 - (depth_deviation / depth_tolerance) * 100),
            message=f"Depth: {measured_depth_mm:.1f}mm (spec: {self.drip_spec.groove_depth_mm:.1f}mm ±{depth_tolerance}mm)"
        ))
        
        return results


class GDnTValidationEngine:
    """
    Main validation engine that orchestrates all GD&T checks
    """
    
    def __init__(self, manufacturing_spec: ManufacturingProcessSpec):
        self.spec = manufacturing_spec
        self.chamfer_validator = ChamferValidator(manufacturing_spec.c8_chamfer)
        self.squareness_validator = EdgeSquarenessValidator(manufacturing_spec.gdt_spec)
    
    def validate_all(self,
                     chamfer_measurements: Dict[EdgeOrientation, ChamferMeasurement],
                     edge_point_data: Dict[EdgeOrientation, List[MeasurementPoint]],
                     drip_edge_measurements: Optional[Dict[EdgeOrientation, Dict[str, float]]] = None
) -> EdgeValidationReport:
        """
        Run complete validation suite
        
        Args:
            chamfer_measurements: Dictionary of chamfer measurements per orientation
            edge_point_data: Dictionary of edge point data per orientation
            drip_edge_measurements: Optional drip edge measurements
        """
        from datetime import datetime
        
        report = EdgeValidationReport(
            specification_id=self.spec.specification_id,
            timestamp=datetime.now().isoformat()
        )
        
        # Validate chamfers for each orientation
        all_chamfer_measurements = []
        for orientation, measurement in chamfer_measurements.items():
            results = []
            
            # Depth validation
            depth_result = self.chamfer_validator.validate_depth(measurement)
            results.append(depth_result)
            report.total_checks += 1
            
            # Angle validation
            angle_result = self.chamfer_validator.validate_angle(measurement)
            results.append(angle_result)
            report.total_checks += 1
            
            # Surface roughness
            roughness_result = self.chamfer_validator.validate_surface_roughness(measurement)
            results.append(roughness_result)
            report.total_checks += 1
            
            report.chamfer_results[orientation] = results
            all_chamfer_measurements.append(measurement)
            
            # Update counters
            for r in results:
                if r.status == ValidationStatus.PASS:
                    report.passed_checks += 1
                elif r.status == ValidationStatus.WARN:
                    report.warning_checks += 1
                elif r.status == ValidationStatus.FAIL:
                    report.failed_checks += 1
        
        # Profile consistency across all edges
        consistency_result = self.chamfer_validator.validate_profile_consistency(all_chamfer_measurements)
        report.total_checks += 1
        if consistency_result.status == ValidationStatus.PASS:
            report.passed_checks += 1
        elif consistency_result.status == ValidationStatus.WARN:
            report.warning_checks += 1
        elif consistency_result.status == ValidationStatus.FAIL:
            report.failed_checks += 1
        
        # Validate edge squareness
        reference_normal = np.array([0, 1, 0])  # Assuming Y is vertical
        for orientation, edge_points in edge_point_data.items():
            result = self.squareness_validator.validate_edge_squareness(
                edge_points, reference_normal, orientation
            )
            report.squareness_results[orientation] = result
            report.total_checks += 1
            
            if result.status == ValidationStatus.PASS:
                report.passed_checks += 1
            elif result.status == ValidationStatus.WARN:
                report.warning_checks += 1
            elif result.status == ValidationStatus.FAIL:
                report.failed_checks += 1
        
        # Validate drip edges if measurements provided
        if drip_edge_measurements and self.spec.drip_edges:
            for orientation, measurements in drip_edge_measurements.items():
                if orientation in self.spec.drip_edges:
                    drip_spec = self.spec.drip_edges[orientation]
                    drip_validator = DripEdgeValidator(drip_spec, self.spec.gdt_spec)
                    
                    results = []
                    
                    # Overhang validation
                    if 'overhang_mm' in measurements:
                        result = drip_validator.validate_overhang_distance(
                            measurements['overhang_mm'], orientation
                        )
                        results.append(result)
                        report.total_checks += 1
                        if result.status == ValidationStatus.PASS:
                            report.passed_checks += 1
                        elif result.status == ValidationStatus.WARN:
                            report.warning_checks += 1
                    
                    # Groove position validation
                    if 'groove_distance_from_edge_mm' in measurements:
                        result = drip_validator.validate_groove_position(
                            measurements['groove_distance_from_edge_mm'], orientation
                        )
                        results.append(result)
                        report.total_checks += 1
                        if result.status == ValidationStatus.PASS:
                            report.passed_checks += 1
                        elif result.status == ValidationStatus.WARN:
                            report.warning_checks += 1
                    
                    # Groove dimensions
                    if 'groove_width_mm' in measurements and 'groove_depth_mm' in measurements:
                        dim_results = drip_validator.validate_groove_dimensions(
                            measurements['groove_width_mm'],
                            measurements['groove_depth_mm'],
                            orientation
                        )
                        results.extend(dim_results)
                        report.total_checks += len(dim_results)
                        for r in dim_results:
                            if r.status == ValidationStatus.PASS:
                                report.passed_checks += 1
                            elif r.status == ValidationStatus.WARN:
                                report.warning_checks += 1
                    
                    report.drip_edge_results[orientation] = results
        
        return report
    
    def generate_report_summary(self, report: EdgeValidationReport) -> str:
        """Generate human-readable validation report summary"""
        lines = [
            "=" * 70,
            f"GD&T VALIDATION REPORT - {self.spec.specification_id}",
            f"Description: {self.spec.description}",
            f"Timestamp: {report.timestamp}",
            "=" * 70,
            "",
            f"OVERALL STATUS: {report.overall_status.value.upper()}",
            "",
            "SUMMARY:",
            f"  Total Checks: {report.total_checks}",
            f"  Passed: {report.passed_checks} ({report.passed_checks/report.total_checks*100:.1f}%)",
            f"  Warnings: {report.warning_checks} ({report.warning_checks/report.total_checks*100:.1f}%)",
            f"  Failed: {report.failed_checks} ({report.failed_checks/report.total_checks*100:.1f}%)",
            "",
        ]
        
        # Chamfer results
        if report.chamfer_results:
            lines.append("CHAMFER VALIDATION:")
            for orientation, results in report.chamfer_results.items():
                lines.append(f"  {orientation.value.upper()}:")
                for r in results:
                    if r.status == ValidationStatus.PASS:
                        status_icon = "[PASS]"
                    elif r.status == ValidationStatus.WARN:
                        status_icon = "[WARN]"
                    else:
                        status_icon = "[FAIL]"
                    lines.append(f"    {status_icon} {r.check_name}: {r.message}")
                    if r.recommendations:
                        for rec in r.recommendations:
                            if rec:
                                lines.append(f"      → {rec}")
            lines.append("")
        
        # Squareness results
        if report.squareness_results:
            lines.append("EDGE SQUARENESS VALIDATION:")
            for orientation, result in report.squareness_results.items():
                if result.status == ValidationStatus.PASS:
                    status_icon = "[PASS]"
                elif result.status == ValidationStatus.WARN:
                    status_icon = "[WARN]"
                else:
                    status_icon = "[FAIL]"
                lines.append(f"  {status_icon} {result.check_name}: {result.message}")
            lines.append("")
        
        # Drip edge results
        if report.drip_edge_results:
            lines.append("DRIP EDGE VALIDATION:")
            for orientation, results in report.drip_edge_results.items():
                lines.append(f"  {orientation.value.upper()}:")
                for r in results:
                    if r.status == ValidationStatus.PASS:
                        status_icon = "[PASS]"
                    elif r.status == ValidationStatus.WARN:
                        status_icon = "[WARN]"
                    else:
                        status_icon = "[FAIL]"
                    lines.append(f"    {status_icon} {r.check_name}: {r.message}")
            lines.append("")
        
        lines.append("=" * 70)
        
        return "\n".join(lines)


# Utility functions for measurement simulation

def simulate_chamfer_measurement(orientation: EdgeOrientation,
                                  spec: ChamferSpecification,
                                  noise_factor: float = 0.02) -> ChamferMeasurement:
    """
    Simulate a chamfer measurement with realistic noise
    Useful for testing validation algorithms
    """
    np.random.seed(hash(orientation.value) % 2**32)
    
    depth_noise = np.random.normal(0, spec.depth_mm * noise_factor)
    angle_noise = np.random.normal(0, spec.angle_degrees * noise_factor * 0.1)
    
    return ChamferMeasurement(
        edge_orientation=orientation,
        depth_mm=spec.depth_mm + depth_noise,
        angle_degrees=spec.angle_degrees + angle_noise,
        width_mm=spec.width_mm + depth_noise * 2 if spec.width_mm else None,
        roughness_ra=spec.surface_roughness_ra + np.random.normal(0, 0.2)
    )


def simulate_edge_points(orientation: EdgeOrientation,
                         length_mm: float = 1000.0,
                         num_points: int = 10) -> List[MeasurementPoint]:
    """Simulate edge measurement points"""
    points = []
    
    # Define edge direction based on orientation
    if orientation in [EdgeOrientation.ANTERIOR, EdgeOrientation.POSTERIOR]:
        # Front/back edges run along X axis
        for i in range(num_points):
            x = (i / (num_points - 1)) * length_mm
            y = 0
            z = 0 if orientation == EdgeOrientation.ANTERIOR else 500
            points.append(MeasurementPoint(x=x, y=y, z=z))
    else:
        # Left/right edges run along Z axis
        for i in range(num_points):
            x = 0 if orientation == EdgeOrientation.PORT else 1000
            y = 0
            z = (i / (num_points - 1)) * length_mm
            points.append(MeasurementPoint(x=x, y=y, z=z))
    
    return points


# Export all classes and functions
__all__ = [
    'ValidationStatus',
    'MeasurementPoint',
    'ChamferMeasurement',
    'ValidationResult',
    'EdgeValidationReport',
    'ChamferValidator',
    'EdgeSquarenessValidator',
    'DripEdgeValidator',
    'GDnTValidationEngine',
    'simulate_chamfer_measurement',
    'simulate_edge_points'
]
