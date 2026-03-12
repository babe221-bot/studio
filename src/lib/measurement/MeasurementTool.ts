import * as THREE from 'three';

export type MeasurementType = 'distance' | 'angle' | 'area';

export interface MeasurementPoint {
  position: THREE.Vector3;
  snapped?: boolean;
  snapTarget?: 'vertex' | 'edge' | 'face';
}

export interface Measurement {
  id: string;
  type: MeasurementType;
  points: MeasurementPoint[];
  value: number;
  unit: string;
  label?: string;
  createdAt: number;
}

/**
 * Base class for measurement tools
 * Provides common functionality for raycasting, snapping, and visualization
 */
export abstract class MeasurementTool {
  protected points: MeasurementPoint[] = [];
  protected scene: THREE.Scene | null = null;
  protected camera: THREE.Camera | null = null;
  protected raycaster: THREE.Raycaster;
  protected snapTargets: THREE.Object3D[] = [];
  protected snapThreshold: number = 0.1; // in world units

  constructor() {
    this.raycaster = new THREE.Raycaster();
  }

  /**
   * Set the scene and camera for raycasting
   */
  setScene(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
    this.updateSnapTargets();
  }

  /**
   * Update the list of objects that can be snapped to
   */
  protected updateSnapTargets() {
    if (!this.scene) return;

    this.snapTargets = [];
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.isMesh) {
        this.snapTargets.push(object);
      }
    });
  }

  /**
   * Perform raycasting from mouse position
   */
  protected raycast(
    clientX: number,
    clientY: number,
    domElement: HTMLElement
  ): THREE.Vector3 | null {
    if (!this.camera || !this.scene) return null;

    const rect = domElement.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

    const intersects = this.raycaster.intersectObjects(this.snapTargets, false);
    if (intersects.length > 0) {
      const intersection = intersects[0];

      // Try to snap to vertex/edge/face
      if (intersection.face) {
        const snappedPoint = this.trySnapToGeometry(intersection);
        if (snappedPoint) return snappedPoint;
      }

      return intersection.point;
    }

    return null;
  }

  /**
   * Try to snap to geometry features (vertices, edges)
   */
  protected trySnapToGeometry(
    intersection: THREE.Intersection
  ): THREE.Vector3 | null {
    if (!intersection.face || !intersection.object) return null;

    const face = intersection.face;
    const object = intersection.object as THREE.Mesh;
    const geometry = object.geometry;
    const matrixWorld = object.matrixWorld;

    // Get vertices of the face
    const positions = geometry.getAttribute('position');
    if (!positions) return null;

    const vA = new THREE.Vector3()
      .fromBufferAttribute(positions, face.a)
      .applyMatrix4(matrixWorld);
    const vB = new THREE.Vector3()
      .fromBufferAttribute(positions, face.b)
      .applyMatrix4(matrixWorld);
    const vC = new THREE.Vector3()
      .fromBufferAttribute(positions, face.c)
      .applyMatrix4(matrixWorld);

    // Find closest vertex to intersection point
    const point = intersection.point;
    let closestVertex = point;
    let closestDistance = this.snapThreshold * 2;

    [vA, vB, vC].forEach((vertex) => {
      const distance = vertex.distanceTo(point);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestVertex = vertex;
      }
    });

    if (closestDistance < this.snapThreshold) {
      return closestVertex;
    }

    // Try snapping to edge midpoint
    const edges = [
      { start: vA, end: vB },
      { start: vB, end: vC },
      { start: vC, end: vA },
    ];

    for (const edge of edges) {
      const midpoint = new THREE.Vector3()
        .addVectors(edge.start, edge.end)
        .multiplyScalar(0.5);
      const distance = midpoint.distanceTo(point);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestVertex = midpoint;
      }
    }

    return closestDistance < this.snapThreshold ? closestVertex : null;
  }

  /**
   * Handle mouse move - preview point placement
   */
  abstract onMouseMove(
    clientX: number,
    clientY: number,
    domElement: HTMLElement
  ): MeasurementPoint | null;

  /**
   * Handle click - place a measurement point
   */
  abstract onClick(
    clientX: number,
    clientY: number,
    domElement: HTMLElement
  ): Measurement | null;

  /**
   * Get current points
   */
  getPoints(): MeasurementPoint[] {
    return this.points;
  }

  /**
   * Reset tool state
   */
  reset() {
    this.points = [];
  }

  /**
   * Get the measurement result
   */
  protected createMeasurement(
    type: MeasurementType,
    value: number,
    unit: string
  ): Measurement {
    return {
      id: `measurement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      points: [...this.points],
      value,
      unit,
      createdAt: Date.now(),
    };
  }

  /**
   * Abstract method to calculate measurement value
   */
  protected abstract calculateValue(): number;
}
