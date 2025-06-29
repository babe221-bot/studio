
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
}

type CanvasHandle = {
  getSnapshot: () => string | null;
};

const VisualizationCanvas = forwardRef<CanvasHandle, VisualizationProps>(({ dims, material, finish, profile, processedEdges }, ref) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const textureCache = useRef<{ [key: string]: THREE.Texture }>({});
  const mainMeshRef = useRef<THREE.Mesh | null>(null);
  const edgeGroupRef = useRef<THREE.Group | null>(null);

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

    const edgeGroup = new THREE.Group();
    edgeGroupRef.current = edgeGroup;
    scene.add(edgeGroup);
    
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
      sceneRef.current.background = new THREE.Color(resolvedTheme === 'dark' ? 0x2C303A : 0xF0F2F5);
    }
  }, [resolvedTheme]);

  useEffect(() => {
    if (!sceneRef.current || !material || !finish || !profile) return;
    
    if (mainMeshRef.current) {
        sceneRef.current.remove(mainMeshRef.current);
        mainMeshRef.current.geometry.dispose();
        if (Array.isArray(mainMeshRef.current.material)) {
            mainMeshRef.current.material.forEach(m => m.dispose());
        } else {
            mainMeshRef.current.material.dispose();
        }
        mainMeshRef.current = null;
    }
    
    if (edgeGroupRef.current) {
      while (edgeGroupRef.current.children.length > 0) {
        const child = edgeGroupRef.current.children[0];
        if (child instanceof THREE.LineSegments) {
            child.geometry.dispose();
            (child.material as THREE.Material).dispose();
        }
        edgeGroupRef.current.remove(child);
      }
    }

    const { length, width, height } = dims;
    const scale = 100;
    const l_m = length / scale;
    const h_m = height / scale;
    const w_m = width / scale;

    let geometry: THREE.BufferGeometry;
    
    const profileName = profile.name || '';
    const chamferMatch = profileName.match(/^C(\d+\.?\d*)/);
    const radiusMatch = profileName.match(/^R(\d+\.?\d*)/);
    
    if (chamferMatch) {
      const shape = new THREE.Shape();
      const bevelSize = parseFloat(chamferMatch[1]) / 1000; // mm to m
      
      shape.moveTo(0, 0); // bottom-back (z,y)
      shape.lineTo(w_m, 0); // bottom-front
      shape.lineTo(w_m, h_m - bevelSize); // top-front start of bevel
      shape.lineTo(w_m - bevelSize, h_m); // top-front end of bevel
      shape.lineTo(bevelSize, h_m);     // top-back end of bevel
      shape.lineTo(0, h_m - bevelSize); // top-back start of bevel
      shape.lineTo(0,0);

      const extrudeSettings = { steps: 1, depth: l_m, bevelEnabled: false };
      geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geometry.rotateY(-Math.PI / 2);
      geometry.center();

    } else if (radiusMatch) {
        const R = parseFloat(radiusMatch[1]) / 1000; // mm to m
        const shape = new THREE.Shape();
        
        if (profileName.includes('Puno')) { // Full roundover
            shape.moveTo(0, h_m); // top-back
            shape.lineTo(w_m-R, h_m); // to start of arc
            shape.absarc(w_m-R, R, R, Math.PI/2, -Math.PI/2, false); // front half circle
            shape.lineTo(0, 0); // bottom-back
            shape.lineTo(0, h_m); // close path
        } else { // Polu C profile (quarter circle on top front and back)
            shape.moveTo(0, 0);
            shape.lineTo(w_m, 0);
            shape.lineTo(w_m, h_m - R);
            shape.absarc(w_m - R, h_m - R, R, 0, Math.PI / 2, false);
            shape.lineTo(R, h_m);
            shape.absarc(R, h_m - R, R, Math.PI / 2, Math.PI, false);
            shape.lineTo(0, 0);
        }
        
        const extrudeSettings = { steps: 1, depth: l_m, bevelEnabled: false };
        geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geometry.rotateY(-Math.PI / 2);
        geometry.center();

    } else {
      geometry = new THREE.BoxGeometry(l_m, h_m, w_m);
    }
    
    const finishName = finish.name.toLowerCase();
    const textureUrl = material.texture;
    const stoneMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.05,
        roughness: 0.8,
        clearcoat: 0.0,
        clearcoatRoughness: 0.5,
    });

    if (finishName.includes('poliran')) {
        stoneMaterial.roughness = 0.1;
        stoneMaterial.clearcoat = 0.9;
        stoneMaterial.clearcoatRoughness = 0.1;
    } else if (finishName.includes('plamena') || finishName.includes('štokovan')) {
        stoneMaterial.roughness = 0.95;
    }

    if (textureUrl) {
      if (textureCache.current[textureUrl]) {
        stoneMaterial.map = textureCache.current[textureUrl];
        stoneMaterial.needsUpdate = true;
      } else {
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(textureUrl, (texture) => {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            const repeatFactor = 5 / (l_m);
            texture.repeat.set(repeatFactor, repeatFactor * (w_m/l_m));
            stoneMaterial.map = texture;
            stoneMaterial.needsUpdate = true;
            textureCache.current[textureUrl] = texture;
        });
      }
    }
    
    const mesh = new THREE.Mesh(geometry, stoneMaterial);
    mesh.name = 'specimen';
    sceneRef.current.add(mesh);
    mainMeshRef.current = mesh;

    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xffd700, linewidth: 3 });
    const hx = l_m / 2, hy = h_m / 2, hz = w_m / 2;

    const edgePoints: THREE.Vector3[] = [];
    if (processedEdges.front) edgePoints.push(new THREE.Vector3(-hx, hy, hz), new THREE.Vector3(hx, hy, hz));
    if (processedEdges.back) edgePoints.push(new THREE.Vector3(-hx, hy, -hz), new THREE.Vector3(hx, hy, -hz));
    if (processedEdges.left) edgePoints.push(new THREE.Vector3(-hx, hy, -hz), new THREE.Vector3(-hx, hy, hz));
    if (processedEdges.right) edgePoints.push(new THREE.Vector3(hx, hy, -hz), new THREE.Vector3(hx, hy, hz));
    
    if (edgePoints.length > 0) {
      const edgeGeometry = new THREE.BufferGeometry().setFromPoints(edgePoints);
      const edgeLines = new THREE.LineSegments(edgeGeometry, edgeMaterial);
      edgeGroupRef.current?.add(edgeLines);
    }
    
    if (cameraRef.current && controlsRef.current) {
        const box = new THREE.Box3().setFromObject(mesh);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = cameraRef.current.fov * (Math.PI / 180);
        let cameraZ = maxDim / (2 * Math.tan(fov / 2));
        
        cameraZ *= 1.5;

        cameraRef.current.position.set(center.x + cameraZ, center.y + cameraZ * 0.5, center.z + cameraZ);
        controlsRef.current.target.copy(center);
        controlsRef.current.update();
    }
    
  }, [dims, material, finish, profile, processedEdges, resolvedTheme]);

  return <div ref={mountRef} className="h-full w-full rounded-lg" data-ai-hint="stone slab 3d render" />;
});

VisualizationCanvas.displayName = 'VisualizationCanvas';
export default VisualizationCanvas;
