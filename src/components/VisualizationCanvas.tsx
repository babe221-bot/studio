
"use client";

import React, { useRef, useEffect, useImperativeHandle, forwardRef, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Material as MaterialType, SurfaceFinish, EdgeProfile, ProcessedEdges } from '@/types';

export interface VisualizationProps {
  dims: { length: number; width: number; height: number };
  material?: MaterialType;
  finish?: SurfaceFinish;
  profile?: EdgeProfile;
  processedEdges: ProcessedEdges;
  okapnikEdges: ProcessedEdges;
  showDimensions?: boolean;
  onCapture?: (dataUrl: string) => void;
}

export type CanvasHandle = {
  captureImage: () => string | null;
};

// Generate dimension labels as sprites
const createDimensionLabel = (text: string, size: number = 32) => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  canvas.width = 256;
  canvas.height = 64;

  // Background
  context.fillStyle = 'rgba(0, 0, 0, 0.7)';
  context.roundRect(0, 0, canvas.width, canvas.height, 8);
  context.fill();

  // Border
  context.strokeStyle = '#ffffff';
  context.lineWidth = 2;
  context.roundRect(2, 2, canvas.width - 4, canvas.height - 4, 6);
  context.stroke();

  // Text
  context.font = 'bold 24px Arial, sans-serif';
  context.fillStyle = '#ffffff';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(size * 4, size, 1);

  return sprite;
};

// Update slab geometry and materials using Web Worker
useEffect(() => {
  if (!sceneRef.current || !mainGroupRef.current || !material || !finish || !profile) return;

  const { length, width, height } = dims;
  const vizL = length / 100;
  const vizW = width / 100;
  const h = height / 100;

  const [mainMaterial, sideMaterial, profileMaterial] = materials;
  const baseColor = new THREE.Color(material.color || '#FFFFFF');

  mainMaterial.color = baseColor;
  sideMaterial.color = baseColor.clone().lerp(new THREE.Color(0x000000), 0.15);
  profileMaterial.color = baseColor.clone().lerp(new THREE.Color(0xffffff), 0.3);

  const finishName = finish.name.toLowerCase();
  const isPolished = finishName.includes('poliran');
  const isHoned = finishName.includes('brus');
  const isFlamed = finishName.includes('plamen');

  if (isPolished) {
    mainMaterial.roughness = 0.1;
    mainMaterial.metalness = 0.2;
    mainMaterial.clearcoat = 1.0;
    mainMaterial.clearcoatRoughness = 0.1;
  } else if (isHoned) {
    mainMaterial.roughness = 0.4;
    mainMaterial.metalness = 0.1;
    mainMaterial.clearcoat = 0.3;
  } else if (isFlamed) {
    mainMaterial.roughness = 0.9;
    mainMaterial.metalness = 0.05;
    mainMaterial.clearcoat = 0;
  } else {
    mainMaterial.roughness = 0.6;
    mainMaterial.metalness = 0.1;
    mainMaterial.clearcoat = 0.2;
  }

  sideMaterial.roughness = 0.8;
  profileMaterial.roughness = 0.7;

  // Load texture
  const textureUrl = material.texture;
  if (textureUrl && textureUrl !== mainMaterial.userData.url) {
    if (textureCache.current[textureUrl]) {
      mainMaterial.map = textureCache.current[textureUrl];
      mainMaterial.needsUpdate = true;
    } else {
      new THREE.TextureLoader().load(textureUrl, (texture) => {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(5 / Math.max(vizL, vizW), 5 / Math.max(vizL, vizW) * (vizW / vizL));
        mainMaterial.map = texture;
        mainMaterial.needsUpdate = true;
        textureCache.current[textureUrl] = texture;
      });
    }
  } else if (!textureUrl) {
    mainMaterial.map = null;
    mainMaterial.needsUpdate = true;
  }
  mainMaterial.userData.url = textureUrl;

  // Offload geometry generation to Worker
  const worker = new Worker(new URL('@/workers/geometryWorker.ts', import.meta.url));
  worker.postMessage({ L: vizL, W: vizW, H: h, profile, processedEdges });

  worker.onmessage = (e) => {
    const { positions, indices, groups } = e.data;
    if (!mainGroupRef.current) return;

    // Clear existing objects
    while (mainGroupRef.current.children.length > 0) {
      const object = mainGroupRef.current.children[0];
      mainGroupRef.current.remove(object);
      object.traverse((node) => {
        if ((node as THREE.Mesh).isMesh) {
          (node as THREE.Mesh).geometry.dispose();
        }
      });
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    groups.forEach((g: any) => geometry.addGroup(g.start, g.count, g.materialIndex));
    geometry.computeVertexNormals();

    const mainObject = new THREE.Mesh(geometry, materials);
    mainObject.castShadow = true;
    mainObject.receiveShadow = true;

    const slabGroup = new THREE.Group();
    slabGroup.add(mainObject);

    // Add okapnik grooves (Logic remains same as it's simple box geometry)
    const okapnikGrooveDepth = 0.5 / 100;
    const okapnikGrooveWidth = 0.8 / 100;
    const okapnikOffset = 2.0 / 100;
    const createOkapnik = (edgeL: number, vertical: boolean) => new THREE.Mesh(
      new THREE.BoxGeometry(
        vertical ? okapnikGrooveWidth : edgeL,
        okapnikGrooveDepth,
        vertical ? edgeL : okapnikGrooveWidth
      ),
      sideMaterial
    );

    if (okapnikEdges.front) {
      const okapnik = createOkapnik(vizL, false);
      okapnik.position.set(0, -okapnikGrooveDepth / 2, (vizW / 2) - okapnikOffset);
      slabGroup.add(okapnik);
    }
    if (okapnikEdges.back) {
      const okapnik = createOkapnik(vizL, false);
      okapnik.position.set(0, -okapnikGrooveDepth / 2, -(vizW / 2) + okapnikOffset);
      slabGroup.add(okapnik);
    }
    if (okapnikEdges.left) {
      const okapnik = createOkapnik(vizW, true);
      okapnik.position.set(-(vizL / 2) + okapnikOffset, -okapnikGrooveDepth / 2, 0);
      slabGroup.add(okapnik);
    }
    if (okapnikEdges.right) {
      const okapnik = createOkapnik(vizW, true);
      okapnik.position.set((vizL / 2) - okapnikOffset, -okapnikGrooveDepth / 2, 0);
      slabGroup.add(okapnik);
    }

    mainGroupRef.current.add(slabGroup);

    if (controlsRef.current) {
      controlsRef.current.target.set(0, h / 2, 0);
      controlsRef.current.update();
    }

    worker.terminate();
  };

  return () => worker.terminate();

}, [dims, material, finish, profile, processedEdges, okapnikEdges, materials]);

// Update dimension labels
useEffect(() => {
  if (!dimensionGroupRef.current || !sceneRef.current) return;

  // Clear existing dimension labels
  while (dimensionGroupRef.current.children.length > 0) {
    dimensionGroupRef.current.remove(dimensionGroupRef.current.children[0]);
  }

  if (!showDimensions) return;

  const { length, width, height } = dims;
  const vizL = length / 100;
  const vizW = width / 100;
  const h = height / 100;

  // Length label
  const lengthLabel = createDimensionLabel(`${length} cm`);
  lengthLabel.position.set(0, h + 0.3, vizW / 2 + 0.3);
  dimensionGroupRef.current.add(lengthLabel);

  // Width label
  const widthLabel = createDimensionLabel(`${width} cm`);
  widthLabel.position.set(-vizL / 2 - 0.3, h + 0.3, 0);
  dimensionGroupRef.current.add(widthLabel);

  // Height label
  const heightLabel = createDimensionLabel(`${height} cm`);
  heightLabel.position.set(vizL / 2 + 0.3, h / 2, -vizW / 2 - 0.3);
  dimensionGroupRef.current.add(heightLabel);

}, [dims, showDimensions]);

return (
  <div
    ref={mountRef}
    className="w-full h-full min-h-[400px]"
    style={{ touchAction: 'none' }}
  />
);
  }
);

VisualizationCanvas.displayName = 'VisualizationCanvas';

export default VisualizationCanvas;
