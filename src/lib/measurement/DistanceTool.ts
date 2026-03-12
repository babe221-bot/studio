import * as THREE from 'three';
import {
  MeasurementTool,
  MeasurementPoint,
  Measurement,
} from './MeasurementTool';

/**
 * Distance Tool - Measures point-to-point distance
 */
export class DistanceTool extends MeasurementTool {
  private previewPoint: MeasurementPoint | null = null;

  /**
   * Get the number of points required for a measurement
   */
  get requiredPoints(): number {
    return 2;
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
      const measurement = this.createMeasurement('distance', value, 'cm');

      // Reset for next measurement
      this.points = [];
      this.previewPoint = null;

      return measurement;
    }

    return null;
  }

  /**
   * Calculate distance between the two points
   */
  protected calculateValue(): number {
    if (this.points.length < 2) return 0;

    const p1 = this.points[0].position;
    const p2 = this.points[1].position;

    // Convert to cm (Three.js uses meters by default)
    return p1.distanceTo(p2) * 100;
  }

  /**
   * Get the distance between two points (for preview)
   */
  getPreviewDistance(): number {
    if (this.points.length === 0 || !this.previewPoint) return 0;

    const p1 = this.points[0].position;
    const p2 = this.previewPoint.position;

    return p1.distanceTo(p2) * 100;
  }

  /**
   * Check if we have a valid measurement in progress
   */
  hasValidStartPoint(): boolean {
    return this.points.length === 1;
  }
}
