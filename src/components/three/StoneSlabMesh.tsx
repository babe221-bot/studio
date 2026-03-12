'use client';

/**
 * StoneSlabMesh - React Three Fiber component for stone slab geometry
 *
 * Uses Worker Pool for geometry generation and ResourceManager for materials.
 * Features automatic disposal and reference counting.
 */

import React, {
  useRef,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type {
  Material as MaterialType,
  SurfaceFinish,
  EdgeProfile,
  ProcessedEdges,
} from '@/types';
import { resourceManager } from '@/lib/ResourceManager';
import {
  useGeometryWorkerPool,
  type GeometryJobOutput,
} from '@/lib/WorkerPool';
import { PhysicsEngine } from '@/lib/physics/PhysicsEngine';
import { MaterialProperties } from '@/lib/physics/MaterialProperties';

// Temporary mock functions for missing dependencies
function getFinishPreset(name: string) {
  return {
    normalStrength: 0.1,
    roughness: 0.3,
    metalness: 0.1,
    clearcoat: 0,
    clearcoatRoughness: 0,
    sheen: 0,
    sheenRoughness: 0,
  };
}

function generateProceduralNormalMap(
  strength: number,
  seed: string | number
): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#8080ff';
    ctx.fillRect(0, 0, 256, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

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
  grainOffset?: { x: number; y: number };
  grainRotation?: number;
  mirrorGrain?: boolean;
  position?: [number, number, number];
  onGeometryGenerated?: () => void;
  // Cross-section props
  crossSection?: {
    enabled: boolean;
    position: number;
    orientation: 'x' | 'y' | 'z';
  };
}

export const StoneSlabMesh: React.FC<StoneSlabMeshProps> = ({
  dims,
  material,
  finish,
  profile,
  processedEdges,
  okapnikEdges,
  grainOffset = { x: 0, y: 0 },
  grainRotation = 0,
  mirrorGrain = false,
  position = [0, 0, 0] as [number, number, number],
  onGeometryGenerated,
  crossSection,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera, controls } = useThree();
  const { executeJob } = useGeometryWorkerPool();

  // State for geometry
  const [geometryData, setGeometryData] = useState<GeometryJobOutput | null>(
    null
  );
  const [isGenerating, setIsGenerating] = useState(false);

  // Physics deformation state
  const [deformation, setDeformation] = useState<number[]>([]);

  // DEBUG: Log component state
  useEffect(() => {
    console.log('[StoneSlabMesh] Props received:', {
      dims,
      hasMaterial: !!material,
      hasFinish: !!finish,
      hasProfile: !!profile,
    });
  }, [dims, material, finish, profile]);

  // Track resources for cleanup
  const resourcesRef = useRef<{
    geometry: THREE.BufferGeometry | null;
    materialKeys: string[];
    textureKey: string | null;
    normalMapKey: string | null;
  }>({
    geometry: null,
    materialKeys: [],
    textureKey: null,
    normalMapKey: null,
  });

  // Visualization dimensions
  const vizDims = useMemo(
    () => ({
      L: dims.length / 100,
      W: dims.width / 100,
      H: dims.height / 100,
    }),
    [dims]
  );

  // ============================================================================
  // Geometry Generation via Worker Pool
  // ============================================================================

  useEffect(() => {
    if (!profile) {
      console.log(
        '[StoneSlabMesh] Skipping geometry generation: no profile provided'
      );
      return;
    }

    console.log(
      '[StoneSlabMesh] Starting geometry generation for profile:',
      profile.name
    );
    setIsGenerating(true);
    const jobId = `slab-${dims.length}-${dims.width}-${dims.height}-${profile.name}`;

    const generateGeometry = async () => {
      try {
        const result = await executeJob(
          {
            L: vizDims.L,
            W: vizDims.W,
            H: vizDims.H,
            profile,
            processedEdges,
            okapnikEdges,
          },
          jobId
        );

        console.log(
          '[StoneSlabMesh] Geometry generated successfully:',
          result ? 'has data' : 'no data',
          {
            positions: result?.positions?.length,
            indices: result?.indices?.length,
          }
        );

        // Validation Checkpoint
        if (!result || !result.positions || result.positions.length === 0) {
          throw new Error('Invalid mesh generated: No positions returned');
        }

        setGeometryData(result);
        setIsGenerating(false);
        onGeometryGenerated?.();
      } catch (error) {
        console.error('[StoneSlabMesh] Geometry generation failed:', error);
        setIsGenerating(false);
      }
    };

    generateGeometry();
  }, [
    vizDims.L,
    vizDims.W,
    vizDims.H,
    profile,
    processedEdges,
    okapnikEdges,
    executeJob,
    onGeometryGenerated,
  ]);

  // ============================================================================
  // Material Setup with ResourceManager
  // ============================================================================

  const [materials, setMaterials] = useState<THREE.Material[]>([]);

  useEffect(() => {
    if (!material || !finish) {
      setMaterials([]);
      return;
    }

    // Calculate physics deformation if material is present
    if (material) {
      const deflections = PhysicsEngine.calculateDeflectionProfile(
        material,
        dims.length,
        dims.width,
        dims.height,
        { left: 0, right: 100 } // Simple support at ends for now
      );
      setDeformation(deflections);
    } else {
      setDeformation([]);
    }

    const preset = getFinishPreset(finish.name);
    const baseColor = new THREE.Color(material.color || '#CCCCCC');
    const darkerColor = baseColor.clone().lerp(new THREE.Color(0x000000), 0.18);
    const lighterColor = baseColor
      .clone()
      .lerp(new THREE.Color(0xffffff), 0.25);

    // Release old materials using the tracked keys BEFORE creating new ones
    const oldKeys = [...resourcesRef.current.materialKeys];
    const oldNormalKey = resourcesRef.current.normalMapKey;
    const oldTextureKey = resourcesRef.current.textureKey;

    // Main face material (index 0)
    const mainMatKey = `slab-${material.id}-${finish.id}-0-${Date.now()}`;
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
    } else {
      resourcesRef.current.normalMapKey = null;
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
    const sideMatKey = `slab-${material.id}-${finish.id}-1-${Date.now()}`;
    const sideMat = resourceManager.getPBRMaterial(sideMatKey, {
      color: darkerColor,
      roughness: Math.min(preset.roughness + 0.12, 1.0),
      metalness: preset.metalness * 0.5,
      clearcoat: preset.clearcoat * 0.4,
      clearcoatRoughness: preset.clearcoatRoughness,
    });

    // Profile material (index 2)
    const profileMatKey = `slab-${material.id}-${finish.id}-2-${Date.now()}`;
    const profileMat = resourceManager.getPBRMaterial(profileMatKey, {
      color: lighterColor,
      roughness: Math.max(preset.roughness - 0.05, 0.05),
      metalness: preset.metalness,
      clearcoat: preset.clearcoat * 0.8,
      clearcoatRoughness: preset.clearcoatRoughness,
    });

    const mats = [mainMat, sideMat, profileMat];
    resourcesRef.current.materialKeys = [mainMatKey, sideMatKey, profileMatKey];

    // Load base texture if available
    if (material.texture) {
      const texKey = material.texture;
      resourcesRef.current.textureKey = texKey;

      resourceManager
        .loadTexture(texKey, {
          colorSpace: THREE.SRGBColorSpace,
          wrapS: THREE.RepeatWrapping,
          wrapT: THREE.RepeatWrapping,
        })
        .then((tex) => {
          const tileSizeM = 0.3;
          tex.repeat.set(
            (vizDims.L / tileSizeM) * (mirrorGrain ? -1 : 1),
            vizDims.W / tileSizeM
          );
          tex.offset.set(grainOffset.x, grainOffset.y);
          tex.rotation = (grainRotation * Math.PI) / 180;
          tex.needsUpdate = true;

          if (mainMat.map !== tex) {
            mainMat.map = tex;
            mainMat.needsUpdate = true;
          }
        });
    } else {
      resourcesRef.current.textureKey = null;
    }

    setMaterials(mats);

    return () => {
      oldKeys.forEach((key) => resourceManager.releaseMaterial(key));
      if (oldNormalKey) resourceManager.releaseTexture(oldNormalKey);
    };
  }, [
    material,
    finish,
    dims.length,
    dims.width,
    dims.height,
    vizDims.L,
    vizDims.W,
    grainOffset,
    grainRotation,
    mirrorGrain,
  ]);

  // ============================================================================
  // Geometry Construction with Physics Deformation
  // ============================================================================

  const geometry = useMemo(() => {
    if (!geometryData) return null;

    // Create a copy of positions to apply deformation
    const positions = Array.from(geometryData.positions);

    // Apply physics deformation if we have deflection data
    if (
      deformation.length > 0 &&
      deformation.length === geometryData.positions.length / 3
    ) {
      // Scale deformation for visibility (exaggerate for better visual effect)
      const deformationScale = 5.0; // Adjust as needed

      // Apply vertical deformation (Y-axis) based on position along the beam
      for (let i = 0; i < positions.length; i += 3) {
        const vertexIndex = i / 3;
        if (vertexIndex < deformation.length) {
          // Apply deformation to Y coordinate (vertical)
          positions[i + 1] -=
            deformation[vertexIndex] * deformationScale * PhysicsEngine.MM_TO_M;
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3)
    );
    if (geometryData.uvs) {
      geo.setAttribute(
        'uv',
        new THREE.Float32BufferAttribute(geometryData.uvs, 2)
      );
    }
    geo.setIndex(new THREE.Uint32BufferAttribute(geometryData.indices, 1));

    geometryData.groups.forEach((g) => {
      geo.addGroup(g.start, g.count, g.materialIndex);
    });

    geo.computeVertexNormals();

    return geo;
  }, [geometryData, deformation]);

  // Handle geometry disposal safely in an effect
  useEffect(() => {
    if (geometry) {
      if (
        resourcesRef.current.geometry &&
        resourcesRef.current.geometry !== geometry
      ) {
        resourcesRef.current.geometry.dispose();
      }
      resourcesRef.current.geometry = geometry;
    }
  }, [geometry]);

  // Cleanup on Unmount
  useEffect(() => {
    return () => {
      resourcesRef.current.materialKeys.forEach((matKey) => {
        resourceManager.releaseMaterial(matKey);
      });
      if (resourcesRef.current.normalMapKey) {
        resourceManager.releaseTexture(resourcesRef.current.normalMapKey);
      }
      if (resourcesRef.current.textureKey) {
        resourceManager.releaseTexture(resourcesRef.current.textureKey);
      }
      if (resourcesRef.current.geometry) {
        resourcesRef.current.geometry.dispose();
      }
    };
  }, []);

  // Set up clipping planes for cross-section view
  const clippingPlane = React.useMemo(() => {
    if (!crossSection?.enabled) return undefined;

    const plane = new THREE.Plane();
    const normalizedPosition = crossSection.position / 100;

    // Calculate dimension based on orientation
    let dimension: number;
    switch (crossSection.orientation) {
      case 'x':
        dimension = dims.length / 1000;
        plane.setFromNormalAndCoplanarPoint(
          new THREE.Vector3(-1, 0, 0),
          new THREE.Vector3(
            normalizedPosition * dimension - dimension / 2,
            0,
            0
          )
        );
        break;
      case 'y':
        dimension = dims.height / 1000;
        plane.setFromNormalAndCoplanarPoint(
          new THREE.Vector3(0, -1, 0),
          new THREE.Vector3(
            0,
            normalizedPosition * dimension - dimension / 2,
            0
          )
        );
        break;
      case 'z':
        dimension = dims.width / 1000;
        plane.setFromNormalAndCoplanarPoint(
          new THREE.Vector3(0, 0, -1),
          new THREE.Vector3(
            0,
            0,
            normalizedPosition * dimension - dimension / 2
          )
        );
        break;
    }

    return plane;
  }, [crossSection, dims]);

  if (!geometry || materials.length === 0) {
    return null;
  }

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={materials}
      castShadow
      receiveShadow
      position={position}
      {...(clippingPlane && {
        clippingPlanes: [clippingPlane],
        clipShadows: true,
      })}
    />
  );
};

export default StoneSlabMesh;
