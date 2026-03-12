import * as THREE from 'three';
import { SimplifyModifier } from 'three/addons/modifiers/SimplifyModifier.js';

export type ExportQuality = 'draft' | 'standard' | 'high';

export function simplifyMesh(
  mesh: THREE.Mesh,
  quality: ExportQuality
): THREE.Mesh {
  if (quality === 'high') {
    return mesh; // No simplification for high quality
  }

  // Ensure geometry is a BufferGeometry and doesn't have non-indexed geometry
  let geometry = mesh.geometry.clone();
  if (!geometry.index) {
    // Create a temporary unindexed geometry if it's not indexed
    const tempGeometry = new THREE.BufferGeometry();
    tempGeometry.setAttribute('position', geometry.getAttribute('position'));
    tempGeometry.setIndex(
      Array.from(Array(geometry.attributes.position.count).keys())
    );
    geometry = tempGeometry;
  }

  const modifier = new SimplifyModifier();
  const count = geometry.attributes.position.count;

  let targetCount = count;
  if (quality === 'draft') {
    targetCount = Math.max(Math.floor(count * 0.1), 3); // 90% reduction, min 3 vertices
  } else if (quality === 'standard') {
    targetCount = Math.max(Math.floor(count * 0.5), 3); // 50% reduction
  }

  try {
    const simplifiedGeometry = modifier.modify(geometry, count - targetCount);
    return new THREE.Mesh(simplifiedGeometry, mesh.material);
  } catch (e) {
    console.warn('Mesh simplification failed, returning original mesh', e);
    return mesh;
  }
}
