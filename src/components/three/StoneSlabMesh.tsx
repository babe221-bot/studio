/**
 * StoneSlabMesh - React Three Fiber component for stone slab geometry
 * 
 * Uses Worker Pool for geometry generation and ResourceManager for materials.
 * Features automatic disposal and reference counting.
 */

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { Material as MaterialType, SurfaceFinish, EdgeProfile, ProcessedEdges } from '@/types';
import { resourceManager } from '@/lib/ResourceManager';
import { useGeometryWorkerPool, type GeometryJobOutput } from '@/lib/WorkerPool';

// ============================================================================
// Types
// ============================================================================

interface StoneSlabMeshProps {
  dims: { length: number; width: number; height: number };
  material?: MaterialType;
  finish?: SurfaceFinish;
  profile?: EdgeProfile;
  processedEdges: ProcessedEdges;
  okapnikEdges: ProcessedEdges;
  onGeometryGenerated?: () => void;
}

interface FinishPreset {
  roughness: number;
  metalness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  sheen: number;
  sheenRoughness: number;
  normalStrength: number;
}

// ============================================================================
// Finish Presets
// ============================================================================

const getFinishPreset = (finishName: string): FinishPreset => {
  const n = finishName.toLowerCase();
  if (n.includes('poliran') || n.includes('polished')) {
    return { roughness: 0.05, metalness: 0.05, clearcoat: 1.0, clearcoatRoughness: 0.02, sheen: 0.0, sheenRoughness: 0.5, normalStrength: 0.0 };
  }
  if (n.includes('bruš') || n.includes('honed')) {
    return { roughness: 0.35, metalness: 0.05, clearcoat: 0.4, clearcoatRoughness: 0.2, sheen: 0.0, sheenRoughness: 0.5, normalStrength: 0.3 };
  }
  if (n.includes('četk') || n.includes('brushed')) {
    return { roughness: 0.45, metalness: 0.1, clearcoat: 0.2, clearcoatRoughness: 0.4, sheen: 0.3, sheenRoughness: 0.5, normalStrength: 0.4 };
  }
  if (n.includes('plamen') || n.includes('flamed')) {
    return { roughness: 0.92, metalness: 0.0, clearcoat: 0.0, clearcoatRoughness: 1.0, sheen: 0.0, sheenRoughness: 1.0, normalStrength: 0.9 };
  }
  if (n.includes('pjeskaren') || n.includes('sandblast')) {
    return { roughness: 0.88, metalness: 0.0, clearcoat: 0.0, clearcoatRoughness: 1.0, sheen: 0.0, sheenRoughness: 1.0, normalStrength: 0.8 };
  }
  if (n.includes('bućardan') || n.includes('bush')) {
    return { roughness: 0.85, metalness: 0.0, clearcoat: 0.0, clearcoatRoughness: 1.0, sheen: 0.2, sheenRoughness: 0.8, normalStrength: 0.85 };
  }
  if (n.includes('štokovan') || n.includes('tooled')) {
    return { roughness: 0.8, metalness: 0.0, clearcoat: 0.0, clearcoatRoughness: 1.0, sheen: 0.1, sheenRoughness: 0.9, normalStrength: 0.75 };
  }
  if (n.includes('antico') || n.includes('antiqued')) {
    return { roughness: 0.5, metalness: 0.05, clearcoat: 0.3, clearcoatRoughness: 0.5, sheen: 0.3, sheenRoughness: 0.6, normalStrength: 0.5 };
  }
  if (n.includes('martelan') || n.includes('martellina')) {
    return { roughness: 0.75, metalness: 0.0, clearcoat: 0.05, clearcoatRoughness: 0.8, sheen: 0.2, sheenRoughness: 0.7, normalStrength: 0.7 };
  }
  if (n.includes('pilano') || n.includes('sawn')) {
    return { roughness: 0.7, metalness: 0.0, clearcoat: 0.0, clearcoatRoughness: 1.0, sheen: 0.0, sheenRoughness: 1.0, normalStrength: 0.55 };
  }
  // Default / bez obrade
  return { roughness: 0.65, metalness: 0.05, clearcoat: 0.1, clearcoatRoughness: 0.5, sheen: 0.0, sheenRoughness: 0.5, normalStrength: 0.2 };
};

// ============================================================================
// Procedural Normal Map Generator
// ============================================================================

const generateProceduralNormalMap = (roughnessLevel: number, seed: number): THREE.CanvasTexture => {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Neutral normal (flat surface) = RGB(128, 128, 255)
  ctx.fillStyle = 'rgb(128,128,255)';
  ctx.fillRect(0, 0, size, size);

  // Add noise bumps proportional to roughness
  const numBumps = Math.floor(roughnessLevel * 2000);
  for (let i = 0; i < numBumps; i++) {
    const t = i / numBumps;
    const x = ((Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453) % 1 + 1) % 1 * size;
    const z = ((Math.cos(seed * 39.3468 + i * 21.441) * 12345.678) % 1 + 1) % 1 * size;
    const r = 1 + roughnessLevel * 5;
    const nx = Math.sin(i * 1.234) * roughnessLevel * 40 + 128;
    const ny = Math.cos(i * 2.678) * roughnessLevel * 40 + 128;
    ctx.fillStyle = `rgb(${Math.round(nx)},${Math.round(ny)},255)`;
    ctx.beginPath();
    ctx.ellipse(x, z, r, r * (0.5 + t * 0.5), i * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  return tex;
};

// ============================================================================
// Component
// ============================================================================

export const StoneSlabMesh: React.FC<StoneSlabMeshProps> = ({
  dims,
  material,
  finish,
  profile,
  processedEdges,
  okapnikEdges,
  onGeometryGenerated,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera, controls } = useThree();
  const { executeJob } = useGeometryWorkerPool();
  
  // State for geometry
  const [geometryData, setGeometryData] = useState<GeometryJobOutput | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Track resources for cleanup
  const resourcesRef = useRef<{
    geometry: THREE.BufferGeometry | null;
    materials: THREE.Material[];
    textureKey: string | null;
    normalMapKey: string | null;
  }>({
    geometry: null,
    materials: [],
    textureKey: null,
    normalMapKey: null,
  });

  // Visualization dimensions
  const vizDims = useMemo(() => ({
    L: dims.length / 100,
    W: dims.width / 100,
    H: dims.height / 100,
  }), [dims]);

  // ============================================================================
  // Geometry Generation via Worker Pool
  // ============================================================================

  useEffect(() => {
    if (!profile) return;

    setIsGenerating(true);
    const jobId = `slab-${dims.length}-${dims.width}-${dims.height}-${profile.name}`;

    const generateGeometry = async () => {
      try {
        const result = await executeJob({
          L: vizDims.L,
          W: vizDims.W,
          H: vizDims.H,
          profile,
          processedEdges,
          okapnikEdges,
        }, jobId);

        setGeometryData(result);
        setIsGenerating(false);
        onGeometryGenerated?.();
      } catch (error) {
        console.error('Geometry generation failed:', error);
        setIsGenerating(false);
      }
    };

    generateGeometry();

    // Cleanup on dependency change
    return () => {
      // Old geometry will be replaced, disposal handled by R3F
    };
  }, [vizDims.L, vizDims.W, vizDims.H, profile, processedEdges, okapnikEdges, executeJob, onGeometryGenerated]);

  // ============================================================================
  // Camera Positioning
  // ============================================================================

  useEffect(() => {
    if (!camera || !controls) return;

    const { L, W, H } = vizDims;
    
    // Centre of the stone
    const target = new THREE.Vector3(0, H / 2, 0);
    (controls as any).target.copy(target);

    // Drive distance from the DIAGONAL of the stone's top face + height contribution
    const diagonal = Math.sqrt(L * L + W * W);
    const fitDist = Math.max(diagonal, H * 10) * 1.0 + 0.8;

    // 38° elevation, 40° azimuth gives a classic 3/4 product-shot perspective
    const elev = THREE.MathUtils.degToRad(38);
    const azim = THREE.MathUtils.degToRad(40);

    camera.position.set(
      fitDist * Math.cos(elev) * Math.sin(azim),
      H / 2 + fitDist * Math.sin(elev),
      fitDist * Math.cos(elev) * Math.cos(azim)
    );
    camera.lookAt(target);
    
    (controls as any).minDistance = fitDist * 0.08;
    (controls as any).maxDistance = fitDist * 6;
    (controls as any).update();
  }, [vizDims, camera, controls]);

  // ============================================================================
  // Material Setup with ResourceManager
  // ============================================================================

  const materials = useMemo(() => {
    if (!material || !finish) return [];

    const preset = getFinishPreset(finish.name);
    const baseColor = new THREE.Color(material.color || '#CCCCCC');
    const darkerColor = baseColor.clone().lerp(new THREE.Color(0x000000), 0.18);
    const lighterColor = baseColor.clone().lerp(new THREE.Color(0xffffff), 0.25);

    // Release old materials
    resourcesRef.current.materials.forEach((mat, i) => {
      const matKey = `slab-${material.id}-${finish.id}-${i}`;
      resourceManager.releaseMaterial(matKey);
    });

    // Main face material (index 0)
    const mainMatKey = `slab-${material.id}-${finish.id}-0`;
    let normalMap: THREE.Texture | null = null;
    
    if (preset.normalStrength > 0.05) {
      const nmKey = `normal-${material.id}-${finish.id}`;
      let nm = resourceManager.getTexture(nmKey);
      if (!nm) {
        nm = generateProceduralNormalMap(preset.normalStrength, material.id);
        resourceManager.addTexture(nmKey, nm, 1);
      } else {
        resourceManager.acquireTexture(nmKey);
      }
      normalMap = nm;
      resourcesRef.current.normalMapKey = nmKey;
    }

    const mainMat = resourceManager.getPBRMaterial(mainMatKey, {
      color: baseColor,
      roughness: preset.roughness,
      metalness: preset.metalness,
      clearcoat: preset.clearcoat,
      clearcoatRoughness: preset.clearcoatRoughness,
      sheen: preset.sheen,
      sheenRoughness: preset.sheenRoughness,
      normalMap,
      normalScale: [preset.normalStrength, preset.normalStrength],
    });

    // Side material (index 1) - slightly rougher
    const sideMatKey = `slab-${material.id}-${finish.id}-1`;
    const sideMat = resourceManager.getPBRMaterial(sideMatKey, {
      color: darkerColor,
      roughness: Math.min(preset.roughness + 0.12, 1.0),
      metalness: preset.metalness * 0.5,
      clearcoat: preset.clearcoat * 0.4,
      clearcoatRoughness: preset.clearcoatRoughness,
    });

    // Profile material (index 2)
    const profileMatKey = `slab-${material.id}-${finish.id}-2`;
    const profileMat = resourceManager.getPBRMaterial(profileMatKey, {
      color: lighterColor,
      roughness: Math.max(preset.roughness - 0.05, 0.05),
      metalness: preset.metalness,
      clearcoat: preset.clearcoat * 0.8,
      clearcoatRoughness: preset.clearcoatRoughness,
    });

    const mats = [mainMat, sideMat, profileMat];
    resourcesRef.current.materials = mats;

    // Load texture if available
    if (material.texture) {
      const texKey = material.texture;
      resourcesRef.current.textureKey = texKey;
      
      resourceManager.loadTexture(texKey, {
        colorSpace: THREE.SRGBColorSpace,
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.RepeatWrapping,
      }).then((tex) => {
        // Physical scale: one tile every 30cm
        const tileSizeM = 0.30;
        tex.repeat.set(vizDims.L / tileSizeM, vizDims.W / tileSizeM);
        tex.needsUpdate = true;
        
        if (mainMat.map !== tex) {
          mainMat.map = tex;
          mainMat.needsUpdate = true;
        }
      });
    }

    return mats;
  }, [material, finish, vizDims.L, vizDims.W]);

  // ============================================================================
  // Geometry Construction
  // ============================================================================

  const geometry = useMemo(() => {
    if (!geometryData) return null;

    // Dispose old geometry
    if (resourcesRef.current.geometry) {
      resourcesRef.current.geometry.dispose();
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(geometryData.positions, 3));
    if (geometryData.uvs) {
      geo.setAttribute('uv', new THREE.BufferAttribute(geometryData.uvs, 2));
    }
    geo.setIndex(new THREE.BufferAttribute(geometryData.indices, 1));
    
    geometryData.groups.forEach((g) => {
      geo.addGroup(g.start, g.count, g.materialIndex);
    });
