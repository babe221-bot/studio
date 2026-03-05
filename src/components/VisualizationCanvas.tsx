"use client";

/**
 * VisualizationCanvas - Refactored Three.js Visualization using React Three Fiber
 * 
 * Architecture Improvements:
 * - Uses centralized ResourceManager with reference counting
 * - Worker Pool for geometry generation (2 persistent workers)
 * - Declarative React integration via @react-three/fiber
 * - Built-in disposal management via R3F lifecycle
 * - Optimized rendering with visibility detection
 */

import React, { useRef, useImperativeHandle, forwardRef, useCallback, useState, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

import type { Material as MaterialType, SurfaceFinish, EdgeProfile, ProcessedEdges } from '@/types';
import { StoneSlabMesh, StudioLighting, DimensionLabels, SceneEnvironment } from './three';
import { resourceManager } from '@/lib/ResourceManager';

// ============================================================================
// Types
// ============================================================================

export interface VisualizationProps {
  dims: { length: number; width: number; height: number };
  material?: MaterialType;
  finish?: SurfaceFinish;
  profile?: EdgeProfile;
  processedEdges: ProcessedEdges;
  okapnikEdges: ProcessedEdges;
  grainOffset?: { x: number; y: number };
  grainRotation?: number;
  mirrorGrain?: boolean;
  showDimensions?: boolean;
  onCapture?: (dataUrl: string) => void;
}


export type CanvasHandle = {
  captureImage: () => string | null;
};

// ============================================================================
// Camera Controller Component
// ============================================================================

interface CameraControllerProps {
  dims: { length: number; width: number; height: number };
}

const CameraController: React.FC<CameraControllerProps> = ({ dims }) => {
  const { camera, controls } = useThree();

  useEffect(() => {
    if (!controls) return;

    const { length, width, height } = dims;
    const vizL = length / 100;
    const vizW = width / 100;
    const h = height / 100;

    // Centre of the stone
    const target = new THREE.Vector3(0, h / 2, 0);
    (controls as any).target.copy(target);

    // Drive distance from the DIAGONAL of the stone's top face + height contribution
    const diagonal = Math.sqrt(vizL * vizL + vizW * vizW);
    const fitDist = Math.max(diagonal, h * 10) * 1.0 + 0.8;

    // 38° elevation, 40° azimuth gives a classic 3/4 product-shot perspective
    const elev = THREE.MathUtils.degToRad(38);
    const azim = THREE.MathUtils.degToRad(40);

    camera.position.set(
      fitDist * Math.cos(elev) * Math.sin(azim),
      h / 2 + fitDist * Math.sin(elev),
      fitDist * Math.cos(elev) * Math.cos(azim)
    );
    camera.lookAt(target);

    (controls as any).minDistance = fitDist * 0.08;
    (controls as any).maxDistance = fitDist * 6;
    (controls as any).update();
  }, [dims, camera, controls]);

  return null;
};

// ============================================================================
// Scene Component
// ============================================================================

interface SceneProps extends VisualizationProps {
  onSceneReady: (scene: THREE.Scene, camera: THREE.Camera, gl: THREE.WebGLRenderer) => void;
  onInteractionStart: () => void;
  onInteractionEnd: () => void;
}

const Scene: React.FC<SceneProps> = ({
  dims,
  material,
  finish,
  profile,
  processedEdges,
  okapnikEdges,
  grainOffset,
  grainRotation,
  mirrorGrain,
  showDimensions,
  onSceneReady,
  onInteractionStart,
  onInteractionEnd,
}) => {

  const { scene, camera, gl } = useThree();

  // DEBUG: Log props to diagnose blank screen
  useEffect(() => {
    console.log('[VisualizationCanvas] Scene props:', {
      dims,
      hasMaterial: !!material,
      hasFinish: !!finish,
      hasProfile: !!profile,
      materialId: material?.id,
      finishId: finish?.id,
      profileId: profile?.id,
      processedEdges,
      okapnikEdges,
      grainOffset,
      grainRotation,
    });
  }, [dims, material, finish, profile, processedEdges, okapnikEdges, grainOffset, grainRotation]);

  useEffect(() => {
    onSceneReady(scene, camera, gl);
  }, [scene, camera, gl, onSceneReady]);

  return (
    <>
      <CameraController dims={dims} />
      <SceneEnvironment />
      <StudioLighting />

      {profile && (
        <StoneSlabMesh
          dims={dims}
          material={material}
          finish={finish}
          profile={profile}
          processedEdges={processedEdges}
          okapnikEdges={okapnikEdges}
          grainOffset={grainOffset}
          grainRotation={grainRotation}
          mirrorGrain={mirrorGrain}
        />
      )}

      <DimensionLabels dims={dims} visible={showDimensions ?? false} />

      <OrbitControls
        enableDamping
        dampingFactor={0.07}
        minDistance={0.5}
        maxDistance={30}
        onStart={onInteractionStart}
        onEnd={onInteractionEnd}
      />


    </>
  );
};

// ============================================================================
// Main Component
// ============================================================================

const VisualizationCanvas = forwardRef<CanvasHandle, VisualizationProps>(
  ({ dims, material, finish, profile, processedEdges, okapnikEdges, grainOffset, grainRotation, mirrorGrain, showDimensions = false, onCapture }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.Camera | null>(null);
    const [isInteracting, setIsInteracting] = useState(false);

    // Expose capture method
    useImperativeHandle(ref, () => ({

      captureImage: () => {
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
          return rendererRef.current.domElement.toDataURL('image/png');
        }
        return null;
      },
    }));

    const handleSceneReady = useCallback((scene: THREE.Scene, camera: THREE.Camera, gl: THREE.WebGLRenderer) => {
      sceneRef.current = scene;
      cameraRef.current = camera;
      rendererRef.current = gl;
    }, []);

    return (
      <div
        ref={containerRef}
        className="w-full h-full min-h-[400px]"
        style={{ touchAction: 'none' }}
      >
        <Canvas
          shadows
          dpr={isInteracting ? 1 : [1, 2]}
          gl={{
            antialias: !isInteracting,
            preserveDrawingBuffer: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.4,
            outputColorSpace: THREE.SRGBColorSpace,
            powerPreference: 'high-performance',
          }}

          camera={{
            fov: 42,
            near: 0.05,
            far: 500,
            position: [4.5, 3.0, 4.5],
          }}
          style={{ width: '100%', height: '100%' }}
        >
          <Scene
            dims={dims}
            material={material}
            finish={finish}
            profile={profile}
            processedEdges={processedEdges}
            okapnikEdges={okapnikEdges}
            grainOffset={grainOffset}
            grainRotation={grainRotation}
            mirrorGrain={mirrorGrain}
            showDimensions={showDimensions}
            onSceneReady={handleSceneReady}
            onInteractionStart={() => setIsInteracting(true)}
            onInteractionEnd={() => setIsInteracting(false)}
          />

        </Canvas>
      </div>
    );
  }
);

VisualizationCanvas.displayName = 'VisualizationCanvas';

export default VisualizationCanvas;
