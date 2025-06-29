"use client";

import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useTheme } from 'next-themes';
import type { Material as MaterialType, SurfaceFinish, EdgeProfile, ProcessedEdges } from '@/types';

interface VisualizationProps {
  dims: { length: number; width: number; height: number };
  material?: MaterialType;
  finish?: SurfaceFinish;
  profile?: EdgeProfile;
  processedEdges: ProcessedEdges;
  okapnikEdges: ProcessedEdges;
}

type CanvasHandle = {
  getSnapshot: () => string | null;
};

const VisualizationCanvas = forwardRef<CanvasHandle, VisualizationProps>(({ dims, material, finish, profile, processedEdges, okapnikEdges }, ref) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const textureCache = useRef<{ [key: string]: THREE.Texture }>({});
  const mainGroupRef = useRef<THREE.Group | null>(null);
  
  const { resolvedTheme } = useTheme();

  useImperativeHandle(ref, () => ({
    getSnapshot: () => {
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        const originalBackground = sceneRef.current.background;
        if(sceneRef.current) sceneRef.current.background = new THREE.Color(0xffffff);
        rendererRef.current.render(sceneRef.current, cameraRef.current);
        const dataUrl = rendererRef.current.domElement.toDataURL('image/png');
        if(sceneRef.current) sceneRef.current.background = originalBackground;
        rendererRef.current.render(sceneRef.current, cameraRef.current);
        return dataUrl;
      }
      return null;
    }
  }));

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.physicallyCorrectLights = true;
    currentMount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.8);
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(-5, 10, 8);
    scene.add(ambientLight, keyLight);

    const mainGroup = new THREE.Group();
    mainGroupRef.current = mainGroup;
    scene.add(mainGroup);
    
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (currentMount && cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = currentMount.clientWidth / currentMount.clientHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(currentMount.clientWidth, currentMount.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      Object.values(textureCache.current).forEach(texture => texture.dispose());
    };
  }, []);

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(resolvedTheme === 'dark' ? 0x20242E : 0xF0F2F5);
    }
  }, [resolvedTheme]);

  useEffect(() => {
    if (!sceneRef.current || !mainGroupRef.current || !material || !finish || !profile) return;
    
    // Clear previous objects
    while (mainGroupRef.current.children.length > 0) {
      const object = mainGroupRef.current.children[0];
      mainGroupRef.current.remove(object);
      object.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (mesh.isMesh || mesh.isLineSegments) {
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) {
              const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              materials.forEach(material => material.dispose());
            }
        }
      });
    }

    const { length, width, height } = dims;
    const scale = 100;
    const l = length / scale;
    const w = width / scale;
    const h = height / scale;

    const stoneMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.05,
        roughness: 0.8,
        clearcoat: 0.0,
        clearcoatRoughness: 0.5,
    });

    const finishName = finish.name.toLowerCase();
    if (finishName.includes('poliran')) {
        stoneMaterial.roughness = 0.1;
        stoneMaterial.clearcoat = 0.9;
        stoneMaterial.clearcoatRoughness = 0.1;
    } else if (finishName.includes('plamena') || finishName.includes('štokovan')) {
        stoneMaterial.roughness = 0.95;
    }

    const textureUrl = material.texture;
    if (textureUrl) {
      if (textureCache.current[textureUrl]) {
        stoneMaterial.map = textureCache.current[textureUrl];
        stoneMaterial.needsUpdate = true;
      } else {
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(textureUrl, (texture) => {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            const repeatFactor = 5 / (l > w ? l : w);
            texture.repeat.set(repeatFactor, repeatFactor * (w/l));
            stoneMaterial.map = texture;
            stoneMaterial.needsUpdate = true;
            textureCache.current[textureUrl] = texture;
        });
      }
    }

    const profileName = profile.name.toLowerCase();
    
    const smusMatch = profileName.match(/smuš c(\d+\.?\d*)mm/);
    const poluRMatch = profileName.match(/polu-zaobljena r(\d+\.?\d*)cm/);
    const punoRMatch = profileName.match(/puno-zaobljena r(\d+\.?\d*)cm/);
    
    const shape = new THREE.Shape();
    
    shape.moveTo(0, 0);
    shape.lineTo(0, h);

    if (poluRMatch) {
      const R = parseFloat(poluRMatch[1]) / 100; // cm to scene units
      shape.lineTo(l - R, h);
      shape.absarc(l - R, h - R, R, Math.PI / 2, 0, true);
    } else if(punoRMatch) {
      const R = parseFloat(punoRMatch[1]) / 100; // cm to scene units
      shape.lineTo(l-R, h);
      shape.absarc(l-R, R, R, Math.PI / 2, -Math.PI/2, true);
    } else if (smusMatch) {
      const chamferSize = parseFloat(smusMatch[1]) / 1000; // mm to scene units
      shape.lineTo(l - chamferSize, h);
      shape.lineTo(l, h - chamferSize);
    } else { // Ravni rez
      shape.lineTo(l, h);
    }
    
    shape.lineTo(l, 0);
    shape.lineTo(0, 0);
    
    const extrudeSettings = {
      steps: 1,
      depth: w,
      bevelEnabled: false,
    };
    
    let geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.rotateX(-Math.PI / 2);
    
    const mainObject = new THREE.Mesh(geometry, stoneMaterial);
    
    const mainObjectGroup = new THREE.Group();
    mainObjectGroup.add(mainObject);
    mainObjectGroup.position.set(-l/2, -h/2, -w/2);
    
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xffd700, linewidth: 3 });
    const dx = l / 2, dy = h / 2, dz = w / 2;

    const edgePoints: THREE.Vector3[] = [];

    if (processedEdges.front) edgePoints.push(new THREE.Vector3(-dx, dy, dz), new THREE.Vector3(dx, dy, dz));
    if (processedEdges.back) edgePoints.push(new THREE.Vector3(-dx, dy, -dz), new THREE.Vector3(dx, dy, -dz));
    if (processedEdges.left) edgePoints.push(new THREE.Vector3(-dx, dy, -dz), new THREE.Vector3(-dx, dy, dz));
    if (processedEdges.right) edgePoints.push(new THREE.Vector3(dx, dy, -dz), new THREE.Vector3(dx, dy, dz));
    
    if (edgePoints.length > 0) {
      const edgeGeometry = new THREE.BufferGeometry().setFromPoints(edgePoints);
      const edgeLines = new THREE.LineSegments(edgeGeometry, edgeMaterial);
      mainObjectGroup.add(edgeLines);
    }
    
    const okapnikMaterial = new THREE.LineBasicMaterial({ color: 0x00ffff, linewidth: 2 });
    const okapnikPoints: THREE.Vector3[] = [];
    const oo = 1.0 / scale; // okapnik offset in scene units
    if(okapnikEdges.front) okapnikPoints.push(new THREE.Vector3(-dx+oo, -dy, dz-oo), new THREE.Vector3(dx-oo, -dy, dz-oo));
    if(okapnikEdges.back) okapnikPoints.push(new THREE.Vector3(-dx+oo, -dy, -dz+oo), new THREE.Vector3(dx-oo, -dy, -dz+oo));
    if(okapnikEdges.left) okapnikPoints.push(new THREE.Vector3(-dx+oo, -dy, -dz+oo), new THREE.Vector3(-dx+oo, -dy, dz-oo));
    if(okapnikEdges.right) okapnikPoints.push(new THREE.Vector3(dx-oo, -dy, -dz+oo), new THREE.Vector3(dx-oo, -dy, dz-oo));

    if (okapnikPoints.length > 0) {
      const okapnikLinesGeom = new THREE.BufferGeometry().setFromPoints(okapnikPoints);
      const okapnikLines = new THREE.LineSegments(okapnikLinesGeom, okapnikMaterial);
      mainObjectGroup.add(okapnikLines);
    }

    mainGroupRef.current.add(mainObjectGroup);

    if (cameraRef.current && controlsRef.current) {
        const box = new THREE.Box3().setFromObject(mainObjectGroup);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = cameraRef.current.fov * (Math.PI / 180);
        let cameraZ = maxDim / (2 * Math.tan(fov / 2));
        
        cameraZ *= 1.8;

        cameraRef.current.position.set(center.x + cameraZ, center.y + cameraZ * 0.5, center.z + cameraZ);
        controlsRef.current.target.copy(center);
        controlsRef.current.update();
    }
    
  }, [dims, material, finish, profile, processedEdges, okapnikEdges, resolvedTheme]);

  return <div ref={mountRef} className="h-full w-full rounded-lg" data-ai-hint="stone slab 3d render" />;
});

VisualizationCanvas.displayName = 'VisualizationCanvas';
export default VisualizationCanvas;
