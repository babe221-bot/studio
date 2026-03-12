'use client';

import React, { useRef, Suspense } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import {
  OrbitControls,
  Environment,
  ContactShadows,
  useTexture,
} from '@react-three/drei';
import * as THREE from 'three';
import { useMaterialTextures } from '@/hooks/useMaterialTextures';
import type { Material } from '@/types';

interface MaterialPreviewProps {
  material: Material;
}

function StoneSlab({ material }: { material: Material }) {
  const { textures } = useMaterialTextures(material.id);
  const meshRef = useRef<THREE.Mesh>(null);

  // Load textures
  const albedoMap = textures.albedo ? useTexture(textures.albedo) : null;
  const normalMap = textures.normal ? useTexture(textures.normal) : null;
  const roughnessMap = textures.roughness
    ? useTexture(textures.roughness)
    : null;
  const aoMap = textures.ao ? useTexture(textures.ao) : null;
  const metallicMap = textures.metallic ? useTexture(textures.metallic) : null;

  if (albedoMap) {
    albedoMap.wrapS = albedoMap.wrapT = THREE.RepeatWrapping;
    albedoMap.repeat.set(2, 2);
  }

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[2, 1.5, 0.03]} />
      <meshPhysicalMaterial
        color={!albedoMap ? material.color : '#ffffff'}
        map={albedoMap}
        normalMap={normalMap}
        roughnessMap={roughnessMap}
        aoMap={aoMap}
        metalnessMap={metallicMap}
        roughness={material.roughness ?? 0.15}
        metalness={material.metallic ?? 0}
        clearcoat={material.clearcoat ?? 0.2}
        clearcoatRoughness={0.1}
      />
    </mesh>
  );
}

export function MaterialPreview({ material }: MaterialPreviewProps) {
  return (
    <div className="w-full h-full bg-gradient-to-b from-gray-100 to-gray-200 rounded-lg overflow-hidden min-h-[300px]">
      <Canvas shadows camera={{ position: [0, 2, 4], fov: 45 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[5, 5, 5]}
            intensity={1}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <pointLight position={[-5, 3, -5]} intensity={0.5} />
          <Environment preset="studio" />
          <StoneSlab material={material} />
          <ContactShadows
            position={[0, -0.8, 0]}
            opacity={0.4}
            scale={10}
            blur={2}
            far={4}
          />
          <OrbitControls
            enablePan={false}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI / 2}
            minDistance={2}
            maxDistance={8}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
