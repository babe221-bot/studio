import type { Material } from '@/types';
import { MaterialProperties } from './MaterialProperties';

/**
 * Simplified physics engine for beam bending simulation
 * Uses basic beam deflection formulas for visualization purposes
 */
export class PhysicsEngine {
  private static readonly GRAVITY = 9.81; // m/s²
  public static readonly MM_TO_M = 0.001; // mm to m conversion
  public static readonly CM_TO_M = 0.01; // cm to m conversion

  /**
   * Calculate deflection of a simply supported beam with uniform load
   * Formula: δ = (5 * w * L^4) / (384 * E * I)
   * Where:
   *   w = uniform load per unit length (N/m)
   *   L = length of beam (m)
   *   E = modulus of elasticity (Pa)
   *   I = moment of inertia (m⁴)
   */
  static calculateDeflection(
    material: Material,
    lengthMM: number,
    widthMM: number,
    heightMM: number,
    supportPoints: { left: number; right: number } = { left: 0, right: 100 }
  ): number {
    // Convert mm to m for calculations
    const lengthM = lengthMM * this.MM_TO_M;
    const widthM = widthMM * this.MM_TO_M;
    const heightM = heightMM * this.MM_TO_M;

    // Calculate effective length between supports
    const effectiveLengthM =
      ((supportPoints.right - supportPoints.left) / 100) * lengthM;

    // Get material properties
    const props = MaterialProperties.getMaterialProperties(material);

    // Calculate uniform load (weight per unit length)
    // Weight = volume * density * gravity
    // Volume per meter length = width * height * 1m
    const volumePerMeter = widthM * heightM; // m³/m
    const weightPerMeter = volumePerMeter * props.density * this.GRAVITY; // N/m

    // Moment of inertia for rectangular cross-section: I = (width * height³) / 12
    const momentOfInertia = (widthM * Math.pow(heightM, 3)) / 12; // m⁴

    // Calculate deflection at center of beam
    const deflectionM =
      (5 * weightPerMeter * Math.pow(effectiveLengthM, 4)) /
      (384 * props.elasticModulus * momentOfInertia);

    // Convert back to mm for visualization
    return deflectionM / this.MM_TO_M;
  }

  /**
   * Calculate deflection at multiple points along the beam
   * Returns array of deflection values (in mm) for visualization
   */
  static calculateDeflectionProfile(
    material: Material,
    lengthMM: number,
    widthMM: number,
    heightMM: number,
    supportPoints: { left: number; right: number } = { left: 0, right: 100 },
    segments: number = 20
  ): number[] {
    const deflections: number[] = [];
    const segmentLength = lengthMM / segments;

    for (let i = 0; i <= segments; i++) {
      const positionMM = i * segmentLength;

      // Calculate effective position between supports (0-100%)
      const effectivePosition =
        ((positionMM - (supportPoints.left / 100) * lengthMM) /
          (((supportPoints.right - supportPoints.left) / 100) * lengthMM)) *
        100;

      // Clamp to 0-100% range
      const clampedPosition = Math.max(0, Math.min(100, effectivePosition));

      // For points outside supports, deflection is 0
      if (
        positionMM < (supportPoints.left / 100) * lengthMM ||
        positionMM > (supportPoints.right / 100) * lengthMM
      ) {
        deflections.push(0);
        continue;
      }

      // Calculate deflection at this position using beam formula
      // For simply supported beam with uniform load:
      // δ = (w * x) / (24 * E * I) * (L³ - 2*L*x² + x³)
      // where x is distance from left support
      const xM =
        (positionMM - (supportPoints.left / 100) * lengthMM) * this.MM_TO_M;
      const Lm =
        ((supportPoints.right - supportPoints.left) / 100) *
        lengthMM *
        this.MM_TO_M;

      if (xM < 0 || xM > Lm) {
        deflections.push(0);
        continue;
      }

      const props = MaterialProperties.getMaterialProperties(material);
      const widthM = widthMM * this.MM_TO_M;
      const heightM = heightMM * this.MM_TO_M;
      const volumePerMeter = widthM * heightM;
      const weightPerMeter = volumePerMeter * props.density * this.GRAVITY;
      const momentOfInertia = (widthM * Math.pow(heightM, 3)) / 12;

      const deflectionM =
        ((weightPerMeter * xM) /
          (24 * props.elasticModulus * momentOfInertia)) *
        (Math.pow(Lm, 3) - 2 * Lm * Math.pow(xM, 2) + Math.pow(xM, 3));

      deflections.push(deflectionM / this.MM_TO_M); // Convert to mm
    }

    return deflections;
  }

  /**
   * Calculate stress at a given point
   * Formula: σ = (M * y) / I
   * Where M = bending moment, y = distance from neutral axis, I = moment of inertia
   */
  static calculateStress(
    material: Material,
    lengthMM: number,
    widthMM: number,
    heightMM: number,
    positionFromLeftMM: number, // Position along length (0 to lengthMM)
    supportPoints: { left: number; right: number } = { left: 0, right: 100 }
  ): number {
    // Convert to meters
    const lengthM = lengthMM * this.MM_TO_M;
    const widthM = widthMM * this.MM_TO_M;
    const heightM = heightMM * this.MM_TO_M;
    const positionM = positionFromLeftMM * this.MM_TO_M;

    // Effective length between supports
    const effectiveLengthM =
      ((supportPoints.right - supportPoints.left) / 100) * lengthM;
    const leftSupportM = (supportPoints.left / 100) * lengthM;
    const xM = positionM - leftSupportM; // Distance from left support

    // Check if position is between supports
    if (xM < 0 || xM > effectiveLengthM) {
      return 0; // No stress outside supports
    }

    const props = MaterialProperties.getMaterialProperties(material);

    // Weight per unit length
    const volumePerMeter = widthM * heightM;
    const weightPerMeter = volumePerMeter * props.density * this.GRAVITY;

    // Bending moment at position x for simply supported beam with uniform load:
    // M = (w * x / 2) * (L - x)
    const bendingMoment = ((weightPerMeter * xM) / 2) * (effectiveLengthM - xM); // N·m

    // Moment of inertia
    const momentOfInertia = (widthM * Math.pow(heightM, 3)) / 12; // m⁴

    // Distance from neutral axis to outer fiber (max stress occurs at top/bottom)
    const yMax = heightM / 2; // m

    // Maximum bending stress
    const stress = (Math.abs(bendingMoment) * yMax) / momentOfInertia; // Pa

    return stress;
  }

  /**
   * Calculate natural frequency of vibration
   * Formula: f = (π/2) * sqrt((E * I) / (m * L⁴)) for simply supported beam
   * Where m = mass per unit length
   */
  static calculateNaturalFrequency(
    material: Material,
    lengthMM: number,
    widthMM: number,
    heightMM: number,
    supportPoints: { left: number; right: number } = { left: 0, right: 100 }
  ): number {
    // Convert to meters
    const lengthM = lengthMM * this.MM_TO_M;
    const widthM = widthMM * this.MM_TO_M;
    const heightM = heightMM * this.MM_TO_M;

    // Effective length between supports
    const effectiveLengthM =
      ((supportPoints.right - supportPoints.left) / 100) * lengthM;

    const props = MaterialProperties.getMaterialProperties(material);

    // Moment of inertia
    const momentOfInertia = (widthM * Math.pow(heightM, 3)) / 12; // m⁴

    // Mass per unit length
    const volumePerMeter = widthM * heightM; // m³/m
    const massPerMeter = volumePerMeter * props.density; // kg/m

    // Natural frequency for simply supported beam
    const frequency =
      (Math.PI / 2) *
      Math.sqrt(
        (props.elasticModulus * momentOfInertia) /
          (massPerMeter * Math.pow(effectiveLengthM, 4))
      );

    return frequency; // Hz
  }
}
