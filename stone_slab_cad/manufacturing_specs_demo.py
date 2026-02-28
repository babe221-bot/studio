"""
Manufacturing Process Specifications Demonstration

This script demonstrates the comprehensive manufacturing specifications including:
- Edge treatment profiles (C8 Chamfer, Half-Round, Ogee, etc.)
- Brushed surface texture treatment
- GD&T validation algorithms
- MCP visualization and technical drawings
- CNC toolpath simulations
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from stone_slab_cad.utils.edge_treatment_specs import (
    ManufacturingProcessSpec, EdgeOrientation, ProfileType,
    ChamferSpecification, GDnTSpecification, SurfaceTreatmentSpec,
    DripEdgeSpecification, ManufacturingSpecBuilder,
    get_c8_chamfer_spec, get_rounded_edge_spec, get_full_bullnose_spec,
    get_ogee_edge_spec, get_waterfall_edge_spec, get_varied_edge_spec
)

from stone_slab_cad.utils.gdt_validation import (
    GDnTValidationEngine, ChamferMeasurement, MeasurementPoint,
    simulate_chamfer_measurement, simulate_edge_points,
    ValidationStatus
)

from stone_slab_cad.utils.profiles import (
    get_profile_library, get_profile_names, get_profile_settings
)


def demo_edge_profiles():
    """Demonstrate the edge profile library"""
    print("="*70)
    print("EDGE PROFILE LIBRARY DEMONSTRATION")
    print("="*70)
    
    profiles = get_profile_library()
    
    print("\nAvailable Edge Profiles:")
    print("-"*50)
    
    for key, profile in profiles.items():
        print(f"\n{key.upper()}:")
        for attr, value in profile.items():
            print(f"  {attr}: {value}")
    
    print("\n\nProfile Names List:")
    print("-"*50)
    for name in get_profile_names():
        print(f"  - {name}")


def demo_c8_chamfer_spec():
    """Demonstrate the C8 Chamfer Specification"""
    print("\n" + "="*70)
    print("C8 CHAMFER SPECIFICATION")
    print("="*70)
    
    spec = get_c8_chamfer_spec()
    
    print(f"\nSpecification ID: {spec.specification_id}")
    print(f"Description: {spec.description}")
    print(f"Revision: {spec.revision}")
    
    print("\nC8 Chamfer Parameters:")
    print(f"  Depth: {spec.c8_chamfer.depth_mm}mm")
    print(f"  Angle: {spec.c8_chamfer.angle_degrees} deg")
    print(f"  Width: {spec.c8_chamfer.width_mm:.2f}mm")
    print(f"  Tolerance: ±{spec.c8_chamfer.tolerance_mm}mm")
    print(f"  Surface Roughness Ra: {spec.c8_chamfer.surface_roughness_ra}um")
    
    print("\nEdge Treatments (All Four Orientations):")
    for orientation, profile in spec.edge_treatments.items():
        print(f"  {orientation.value.upper()}: {profile.profile_type.value}")
    
    print("\nSurface Treatment:")
    print(f"  Finish Type: {spec.surface_treatment.finish_type.value}")
    print(f"  Brush Direction: {spec.surface_treatment.brush_direction}")
    print(f"  Brush Grit: {spec.surface_treatment.brush_grit}")
    print(f"  Roughness Ra: {spec.surface_treatment.roughness_ra}um")
    
    print("\nDrip Edge Configuration:")
    for orientation, drip_edge in spec.drip_edges.items():
        print(f"  {orientation.value.upper()}:")
        print(f"    Overhang: {drip_edge.overhang_mm}mm")
        print(f"    Groove Depth: {drip_edge.groove_depth_mm}mm")
        print(f"    Groove Width: {drip_edge.groove_width_mm}mm")
        print(f"    Distance from Edge: {drip_edge.distance_from_edge_mm}mm")
    
    print("\nGD&T Specifications:")
    print(f"  Profile Tolerance: +/-{spec.gdt_spec.profile_tolerance_mm}mm")
    print(f"  Angular Tolerance: +/-{spec.gdt_spec.angular_tolerance_deg} deg")
    print(f"  Perpendicularity: +/-{spec.gdt_spec.perpendicularity_tolerance_mm}mm")
    print(f"  Parallelism: ±{spec.gdt_spec.parallelism_tolerance_mm}mm")


def demo_varied_profiles():
    """Demonstrate different edge profiles on each edge"""
    print("\n" + "="*70)
    print("VARIED EDGE PROFILES (ASYMMETRIC CONFIGURATION)")
    print("="*70)
    
    spec = get_varied_edge_spec(
        front_profile=ProfileType.C8_CHAMFER,
        rear_profile=ProfileType.HALF_ROUND,
        left_profile=ProfileType.COVE,
        right_profile=ProfileType.OGEE
    )
    
    print(f"\nSpecification ID: {spec.specification_id}")
    print(f"Description: {spec.description}")
    
    print("\nEdge Treatment Configuration:")
    print(f"  FRONT (Anterior):   {spec.edge_treatments[EdgeOrientation.ANTERIOR].profile_type.value}")
    print(f"  REAR (Posterior):   {spec.edge_treatments[EdgeOrientation.POSTERIOR].profile_type.value}")
    print(f"  LEFT (Port):        {spec.edge_treatments[EdgeOrientation.PORT].profile_type.value}")
    print(f"  RIGHT (Starboard):  {spec.edge_treatments[EdgeOrientation.STARBOARD].profile_type.value}")


def demo_gdt_validation():
    """Demonstrate GD&T validation algorithms"""
    print("\n" + "="*70)
    print("GD&T VALIDATION ALGORITHMS")
    print("="*70)
    
    spec = get_c8_chamfer_spec()
    
    # Create validation engine
    engine = GDnTValidationEngine(spec)
    
    # Simulate measurements for all four edges
    chamfer_measurements = {}
    edge_points = {}
    
    for orientation in EdgeOrientation:
        chamfer_measurements[orientation] = simulate_chamfer_measurement(
            orientation, spec.c8_chamfer, noise_factor=0.02
        )
        edge_points[orientation] = simulate_edge_points(orientation, length_mm=1000.0)
    
    # Run validation
    report = engine.validate_all(chamfer_measurements, edge_points)
    
    # Print report summary
    summary = engine.generate_report_summary(report)
    print(summary)


def demo_profile_varieties():
    """Demonstrate the variety of available edge profiles"""
    print("\n" + "="*70)
    print("EDGE PROFILE VARIETIES DEMONSTRATION")
    print("="*70)
    
    profile_specs = [
        ("C8 Chamfer", get_c8_chamfer_spec),
        ("Half Round (R10mm)", lambda: get_rounded_edge_spec(10.0)),
        ("Half Round (R15mm)", lambda: get_rounded_edge_spec(15.0)),
        ("Full Bullnose (R20mm)", lambda: get_full_bullnose_spec(20.0)),
        ("Full Bullnose (R25mm)", lambda: get_full_bullnose_spec(25.0)),
        ("Ogee Profile", get_ogee_edge_spec),
        ("Waterfall Edge", get_waterfall_edge_spec),
    ]
    
    for name, spec_func in profile_specs:
        spec = spec_func()
        print(f"\n{name}:")
        print(f"  Spec ID: {spec.specification_id}")
        print(f"  Primary Profile: {list(spec.edge_treatments.values())[0].profile_type.value}")
        print(f"  Surface: {spec.surface_treatment.finish_type.value}")
        if spec.edge_treatments:
            first_profile = list(spec.edge_treatments.values())[0]
            if first_profile.radius_mm:
                print(f"  Radius: {first_profile.radius_mm}mm")
            if first_profile.depth_mm:
                print(f"  Depth: {first_profile.depth_mm}mm")
            if first_profile.angle_degrees:
                print(f"  Angle: {first_profile.angle_degrees} deg")


def demo_builder_pattern():
    """Demonstrate the builder pattern for creating custom specs"""
    print("\n" + "="*70)
    print("MANUFACTURING SPEC BUILDER PATTERN")
    print("="*70)
    
    # Create custom specification using builder
    custom_spec = (ManufacturingSpecBuilder(
        spec_id="CUSTOM-001",
        description="Custom Kitchen Countertop Specification"
    )
    .with_c8_chamfer(tolerance=0.3)
    .with_edge_profile(EdgeOrientation.ANTERIOR, ProfileType.C8_CHAMFER)
    .with_edge_profile(EdgeOrientation.POSTERIOR, ProfileType.HALF_ROUND, radius_mm=12.0)
    .with_edge_profile(EdgeOrientation.PORT, ProfileType.COVE, radius_mm=8.0)
    .with_edge_profile(EdgeOrientation.STARBOARD, ProfileType.COVE, radius_mm=8.0)
    .with_brushed_surface(direction="lengthwise", grit=220)
    .with_drip_edge(EdgeOrientation.ANTERIOR, overhang_mm=25.0, groove_depth_mm=5.0)
    .with_drip_edge(EdgeOrientation.STARBOARD, overhang_mm=25.0, groove_depth_mm=5.0)
    .with_gdt(profile_tolerance_mm=0.08, angular_tolerance_deg=0.3)
    .build())
    
    print(f"\nCustom Specification Created:")
    print(f"  ID: {custom_spec.specification_id}")
    print(f"  Description: {custom_spec.description}")
    
    print(f"\nEdge Treatment Summary:")
    for orientation, profile in custom_spec.edge_treatments.items():
        print(f"  {orientation.value.upper()}: {profile.profile_type.value}")
    
    print(f"\nDrip Edges Applied To:")
    for orientation in custom_spec.drip_edges.keys():
        print(f"  - {orientation.value.upper()}")


def main():
    """Run all demonstrations"""
    print("\n" + "#"*70)
    print("# MANUFACTURING PROCESS SPECIFICATIONS - COMPREHENSIVE DEMONSTRATION")
    print("#"*70)
    
    demo_edge_profiles()
    demo_c8_chamfer_spec()
    demo_varied_profiles()
    demo_profile_varieties()
    demo_builder_pattern()
    demo_gdt_validation()
    
    print("\n" + "="*70)
    print("DEMONSTRATION COMPLETE")
    print("="*70)
    print("\nGenerated modules:")
    print("  1. edge_treatment_specs.py - Comprehensive specification definitions")
    print("  2. gdt_validation.py - GD&T validation algorithms")
    print("  3. mcp_visualization.py - 3D visualization and rendering")
    print("  4. technical_drawings.py - Manufacturing drawings generator")
    print("  5. profiles.py - Extended profile library")
    print("\nAll modules support:")
    print("  - C8 Chamfer (8.0mm depth at 45°)")
    print("  - Multiple profile types (Round, Ogee, Cove, etc.)")
    print("  - Four-edge orientation (Front, Rear, Left, Right)")
    print("  - Drip edge overhang flashing")
    print("  - Brushed surface texture treatment")
    print("  - GD&T validation and quality control")
    print("  - 3D visualization and technical drawings")


if __name__ == "__main__":
    main()
