import * as THREE from 'three';
import {
  MeasurementTool,
  MeasurementPoint,
  Measurement,
} from './MeasurementTool';

/**
 * Angle Tool - Measures angle between three points
 */
export class AngleTool extends MeasurementTool {
  private previewPoint: MeasurementPoint | null = null;

  /**
   * Get the number of points required for a measurement
   */
  get requiredPoints(): number {
    return 3;
  }

  /**
   * Handle mouse move - show preview of next point
   */
  onMouseMove(
    clientX: number,
    clientY: number,
    domElement: HTMLElement
  ): MeasurementPoint | null {
    if (this.points.length >= this.requiredPoints) {
      this.previewPoint = null;
      return null;
    }

    const point = this.raycast(clientX, clientY, domElement);
    if (point) {
      this.previewPoint = {
        position: point,
        snapped: true,
      };
      return this.previewPoint;
    }

    this.previewPoint = null;
    return null;
  }

  /**
   * Handle click - place a measurement point or complete measurement
   */
  onClick(
    clientX: number,
    clientY: number,
    domElement: HTMLElement
  ): Measurement | null {
    const point = this.raycast(clientX, clientY, domElement);
    if (!point) return null;

    const measurementPoint: MeasurementPoint = {
      position: point,
      snapped: true,
    };

    this.points.push(measurementPoint);

    // Check if we have enough points to create a measurement
    if (this.points.length >= this.requiredPoints) {
      const value = this.calculateValue();
      const measurement = this.createMeasurement('angle', value, '°');

      // Reset for next measurement
      this.points = [];
      this.previewPoint = null;

      return measurement;
    }

    return null;
  }

  /**
   * Calculate angle between three points (in degrees)
   * Points: p1-vertex, p2-start, p3-end (angle at p1)
   */
  protected calculateValue(): number {
    if (this.points.length < 3) return 0;

    const p1 = this.points[0].position; // vertex
    const p2 = this.points[1].position; // first ray
    const p3 = this.points[2].position; // second ray

    // Vectors from vertex to the other points
    const v1 = new THREE.Vector3().subVectors(p2, p1).normalize();
    const v2 = new THREE.Vector3().subVectors(p3, p1).normalize();

    // Calculate angle using dot product
    const dot = v1.dot(v2);

    // Clamp to handle floating point errors
    const clampedDot = Math.max(-1, Math.min(1, dot));

    // Convert to degrees
    return THREE.MathUtils.radToDeg(Math.acos(clampedDot));
  }

  /**
   * Get preview angle value
   */
  getPreviewAngle(): number | null {
    if (this.points.length < 2 || !this.previewPoint) return null;

    const p1 = this.points[0].position;
    const p2 = this.points[1].position;
    const p3 = this.previewPoint.position;

    const v1 = new THREE.Vector3().subVectors(p2, p1).normalize();
    const v2 = new THREE.Vector3().subVectors(p3, p1).normalize();

    const dot = v1.dot(v2);
    const clampedDot = Math.max(-1, Math.min(1, dot));

    return THREE.MathUtils.radToDeg(Math.acos(clampedDot));
  }

  /**
   * Check if we have enough points for preview
   */
  hasValidStartPoint(): boolean {
    return this.points.length >= 1 && this.points.length < 3;
  }
}
