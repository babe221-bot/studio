import * as THREE from 'three';
import {
  MeasurementTool,
  MeasurementPoint,
  Measurement,
} from './MeasurementTool';

/**
 * Area Tool - Measures area of polygon shapes
 */
export class AreaTool extends MeasurementTool {
  private previewPoint: MeasurementPoint | null = null;
  private minPoints: number = 3; // Minimum 3 points for a polygon

  /**
   * Get the number of points required for a measurement
   */
  get requiredPoints(): number {
    return this.minPoints;
  }

  /**
   * Handle mouse move - show preview of next point
   */
  onMouseMove(
    clientX: number,
    clientY: number,
    domElement: HTMLElement
  ): MeasurementPoint | null {
    if (this.points.length < this.minPoints - 1) {
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
   * Double-click or clicking first point closes the polygon
   */
  onClick(
    clientX: number,
    clientY: number,
    domElement: HTMLElement,
    closePolygon: boolean = false
  ): Measurement | null {
    const point = this.raycast(clientX, clientY, domElement);
    if (!point) return null;

    // Check if clicking on first point to close (for polygon completion)
    if (this.points.length >= this.minPoints && closePolygon) {
      // Close the polygon and calculate area
      const value = this.calculateValue();
      const measurement = this.createMeasurement('area', value, 'cm²');

      // Reset for next measurement
      this.points = [];
      this.previewPoint = null;

      return measurement;
    }

    // Check if clicking on first point to close the polygon early
    if (this.points.length >= this.minPoints) {
      const firstPoint = this.points[0].position;
      if (point.distanceTo(firstPoint) < this.snapThreshold * 2) {
        const value = this.calculateValue();
        const measurement = this.createMeasurement('area', value, 'cm²');

        this.points = [];
        this.previewPoint = null;

        return measurement;
      }
    }

    const measurementPoint: MeasurementPoint = {
      position: point,
      snapped: true,
    };

    this.points.push(measurementPoint);

    // Check if we have minimum points for a valid polygon area
    if (this.points.length >= this.minPoints) {
      // Don't complete automatically - wait for user to close the polygon
      return null;
    }

    return null;
  }

  /**
   * Calculate area using Shoelace formula for 3D points
   * Projects points onto the best-fit plane
   */
  protected calculateValue(): number {
    if (this.points.length < 3) return 0;

    const points = this.points.map((p) => p.position);

    // Calculate centroid
    const centroid = new THREE.Vector3();
    points.forEach((p) => centroid.add(p));
    centroid.divideScalar(points.length);

    // Create coordinate system on the plane defined by the polygon
    // Use the first edge to define the U axis
    const edge1 = new THREE.Vector3()
      .subVectors(points[1], points[0])
      .normalize();

    // Calculate normal using cross product of first two edges
    const edge2 = new THREE.Vector3()
      .subVectors(points[2], points[0])
      .normalize();
    const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

    // Handle colinear points
    if (normal.length() < 0.001) {
      // Fall back to X-Y plane projection
      return this.calculateArea2D(points, 'z');
    }

    // V axis is perpendicular to both U and normal
    const vAxis = new THREE.Vector3().crossVectors(normal, edge1).normalize();

    // Project all points onto the plane
    const projectedPoints: { u: number; v: number }[] = points.map((p) => {
      const rel = new THREE.Vector3().subVectors(p, centroid);
      return {
        u: rel.dot(edge1),
        v: rel.dot(vAxis),
      };
    });

    // Apply Shoelace formula
    let area = 0;
    const n = projectedPoints.length;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += projectedPoints[i].u * projectedPoints[j].v;
      area -= projectedPoints[j].u * projectedPoints[i].v;
    }

    area = Math.abs(area) / 2;

    // Convert from m² to cm² (multiply by 10000)
    return area * 10000;
  }

  /**
   * Fallback 2D area calculation
   */
  private calculateArea2D(
    points: THREE.Vector3[],
    axis: 'x' | 'y' | 'z'
  ): number {
    const getCoord = (p: THREE.Vector3, a: string): number => {
      switch (a) {
        case 'x':
          return p.x;
        case 'y':
          return p.y;
        case 'z':
          return p.z;
        default:
          return p.z;
      }
    };

    const projected: Array<{ u: number; v: number }> = points.map((p) => ({
      u: getCoord(p, axis === 'z' ? 'x' : 'x') ?? 0,
      v: getCoord(p, axis === 'z' ? 'y' : axis === 'x' ? 'z' : 'z') ?? 0,
    }));

    let area = 0;
    const n = projected.length;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const current = projected[i]!;
      const next = projected[j]!;
      area += current.u * next.v;
      area -= next.u * current.v;
    }

    return (Math.abs(area) / 2) * 10000; // Convert to cm²
  }

  /**
   * Get preview area value
   */
  getPreviewArea(): number | null {
    if (this.points.length < 2 || !this.previewPoint) return null;

    // Temporarily add preview point to calculate area
    const tempPoints = [...this.points, this.previewPoint];
    if (tempPoints.length < 3) return null;

    const points = tempPoints.map((p) => p.position);

    // Calculate centroid
    const centroid = new THREE.Vector3();
    points.forEach((p) => centroid.add(p));
    centroid.divideScalar(points.length);

    // Create coordinate system
    const edge1 = new THREE.Vector3()
      .subVectors(points[1], points[0])
      .normalize();
    const edge2 = new THREE.Vector3()
      .subVectors(points[2], points[0])
      .normalize();
    const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

    if (normal.length() < 0.001) {
      return this.calculateArea2D(points, 'z');
    }

    const vAxis = new THREE.Vector3().crossVectors(normal, edge1).normalize();

    const projected = points.map((p) => {
      const rel = new THREE.Vector3().subVectors(p, centroid);
      return {
        u: rel.dot(edge1),
        v: rel.dot(vAxis),
      };
    });

    let area = 0;
    const n = projected.length;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += projected[i].u * projected[j].v;
      area -= projected[j].u * projected[i].v;
    }

    return (Math.abs(area) / 2) * 10000;
  }

  /**
   * Get the number of points in current polygon
   */
  getPointCount(): number {
    return this.points.length;
  }

  /**
   * Check if we have minimum points for area
   */
  hasMinimumPoints(): boolean {
    return this.points.length >= this.minPoints;
  }
}
