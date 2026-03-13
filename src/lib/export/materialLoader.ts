// Material loader for Three.js materials with PBR support

import * as THREE from 'three';
import type { Material } from '@/types/materials';
import { MaterialProperties } from '@/lib/physics/MaterialProperties';

/**
 * Creates a Three.js material from a material object with PBR properties
 * @param material The material object from the database
 * @param textureUrls Optional map of texture URLs by type
 * @returns Three.js MeshPhysicalMaterial with PBR properties applied
 */
export function createPBRMaterial(
  material: Material,
  textureUrls: Record<string, string> = {}
): THREE.MeshPhysicalMaterial {
  // Base color from material
  const color = new THREE.Color(material.color || '#CCCCCC');

  // Get PBR properties with fallbacks
  const roughness = material.roughness ?? 0.5;
  const metalness = material.metallic ?? 0.0;
  const clearcoat = material.clearcoat ?? 0.0;
  const clearcoatRoughness = material.clearcoatRoughness ?? 0.1;

  // Create material
  const threeMaterial = new THREE.MeshPhysicalMaterial({
    color,
    roughness,
    metalness,
    clearcoat,
    clearcoatRoughness,
  });

  // Apply textures if available
  if (textureUrls.albedo) {
    const albedoMap = new THREE.TextureLoader().load(textureUrls.albedo);
    albedoMap.wrapS = THREE.RepeatWrapping;
    albedoMap.wrapT = THREE.RepeatWrapping;
    threeMaterial.map = albedoMap;
    threeMaterial.color.set(0xffffff); // White when using texture
  }

  if (textureUrls.normal) {
    const normalMap = new THREE.TextureLoader().load(textureUrls.normal);
    normalMap.wrapS = THREE.RepeatWrapping;
    normalMap.wrapT = THREE.RepeatWrapping;
    threeMaterial.normalMap = normalMap;
  }

  if (textureUrls.roughness) {
    const roughnessMap = new THREE.TextureLoader().load(textureUrls.roughness);
    roughnessMap.wrapS = THREE.RepeatWrapping;
    roughnessMap.wrapT = THREE.RepeatWrapping;
    threeMaterial.roughnessMap = roughnessMap;
  }

  if (textureUrls.metallic) {
    const metallicMap = new THREE.TextureLoader().load(textureUrls.metallic);
    metallicMap.wrapS = THREE.RepeatWrapping;
    metallicMap.wrapT = THREE.RepeatWrapping;
    threeMaterial.metalnessMap = metallicMap;
  }

  if (textureUrls.ao) {
    const aoMap = new THREE.TextureLoader().load(textureUrls.ao);
    aoMap.wrapS = THREE.RepeatWrapping;
    aoMap.wrapT = THREE.RepeatWrapping;
    threeMaterial.aoMap = aoMap;
  }

  // Set displacement scale if provided
  if (material.displacementScale && textureUrls.displacement) {
    const displacementMap = new THREE.TextureLoader().load(
      textureUrls.displacement
    );
    displacementMap.wrapS = THREE.RepeatWrapping;
    displacementMap.wrapT = THREE.RepeatWrapping;
    threeMaterial.displacementMap = displacementMap;
    threeMaterial.displacementScale = material.displacementScale * 0.1; // Scale down for visibility
  }

  return threeMaterial;
}

/**
 * Creates material variations for different faces of a slab
 * @param material The base material
 * @param textureUrls Texture URLs for the material
 * @returns Array of [mainMaterial, sideMaterial, edgeMaterial]
 */
export function createSlabMaterials(
  material: Material,
  textureUrls: Record<string, string> = {}
): THREE.Material[] {
  const mainMaterial = createPBRMaterial(material, textureUrls);

  // Side material - slightly darker and rougher
  const sideMaterial = mainMaterial.clone();
  sideMaterial.color.multiplyScalar(0.8); // 20% darker
  sideMaterial.roughness = Math.min(sideMaterial.roughness + 0.1, 1.0);

  // Edge/material transition material - slightly lighter
  const edgeMaterial = mainMaterial.clone();
  edgeMaterial.color.multiplyScalar(1.2); // 20% lighter
  edgeMaterial.roughness = Math.max(edgeMaterial.roughness - 0.05, 0.0);

  return [mainMaterial, sideMaterial, edgeMaterial];
}

/**
 * Applies texture tiling and offset to material maps
 * @param material The Three.js material to modify
 * @param tileScale Scale factor for tiling (default 1.0)
 * @param offset Offset for texture positioning (default {x: 0, y: 0})
 * @param rotation Rotation in degrees (default 0)
 */
export function applyTextureTransform(
  material: THREE.Material,
  tileScale: number = 1.0,
  offset: { x: number; y: number } = { x: 0, y: 0 },
  rotation: number = 0
): void {
  // Handle both single material and material arrays
  const materials = Array.isArray(material) ? material : [material];

  materials.forEach((mat) => {
    if (!(mat instanceof THREE.Material)) return;

    // Apply to all texture maps
    const textureProperties = [
      'map',
      'normalMap',
      'roughnessMap',
      'metalnessMap',
      'aoMap',
      'displacementMap',
    ];

    textureProperties.forEach((prop) => {
      const texture = (mat as any)[prop] as THREE.Texture | undefined;
      if (texture) {
        texture.repeat.set(tileScale, tileScale);
        texture.offset.set(offset.x, offset.y);
        if (rotation !== 0) {
          texture.rotation = (rotation * Math.PI) / 180; // Convert to radians
        }
      }
    });
  });
}
