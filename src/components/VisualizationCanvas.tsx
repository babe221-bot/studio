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
  okapnik: ProcessedEdges;
}

type CanvasHandle = {
  getSnapshot: () => string | null;
};

const VisualizationCanvas = forwardRef<CanvasHandle, VisualizationProps>(({ dims, material, finish, profile, processedEdges, okapnik }, ref) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const textureCache = useRef<{ [key: string]: THREE.Texture }>({});
  const edgeGroupRef = useRef<THREE.Group | null>(null);
  const okapnikGroupRef = useRef<THREE.Group | null>(null);

  const { resolvedTheme } = useTheme();

  useImperativeHandle(ref, () => ({
    getSnapshot: () => {
      if (rendererRef.current) {
        // Temporarily set background to white for snapshot
        const originalBackground = sceneRef.current?.background;
        if(sceneRef.current) sceneRef.current.background = new THREE.Color(0xffffff);
        rendererRef.current.render(sceneRef.current as THREE.Scene, cameraRef.current as THREE.Camera);
        const dataUrl = rendererRef.current.domElement.toDataURL('image/png');
        if(sceneRef.current) sceneRef.current.background = originalBackground;
        rendererRef.current.render(sceneRef.current as THREE.Scene, cameraRef.current as THREE.Camera);
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
    scene.background = new THREE.Color(resolvedTheme === 'dark' ? 0x2C303A : 0xF0F2F5);

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
    
    const okapnikGroup = new THREE.Group();
    okapnikGroupRef.current = okapnikGroup;
    scene.add(okapnikGroup);

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
  }, [resolvedTheme]);


  useEffect(() => {
    if (!sceneRef.current || !material || !finish || !profile) return;
    
    const previousMesh = sceneRef.current.getObjectByName('specimen');
    if (previousMesh) {
      sceneRef.current.remove(previousMesh);
      if (previousMesh instanceof THREE.Mesh) {
        previousMesh.geometry.dispose();
        if (Array.isArray(previousMesh.material)) {
            previousMesh.material.forEach(m => m.dispose());
        } else {
            previousMesh.material.dispose();
        }
      }
    }
    
    if (edgeGroupRef.current) {
      while (edgeGroupRef.current.children.length > 0) {
        const child = edgeGroupRef.current.children[0] as THREE.LineSegments;
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
        edgeGroupRef.current.remove(child);
      }
    }
    
    if (okapnikGroupRef.current) {
      while (okapnikGroupRef.current.children.length > 0) {
        const child = okapnikGroupRef.current.children[0] as THREE.Mesh;
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
        okapnikGroupRef.current.remove(child);
      }
    }


    const { length, width, height } = dims;
    const scale = 100;
    
    const w_m = width / scale;
    const h_m = height / scale;
    const l_m = length / scale;

    let geometry;
    const shape = new THREE.Shape();
    
    const smusMatch = profile.name.match(/Smuš (\d+)mm/);
    const poluZaobljenaMatch = profile.name.match(/Polu-zaobljena R(\d+)mm/);
    const punoZaobljenaMatch = profile.name.match(/Puno zaobljena R(\d+)mm/);

    if (smusMatch) {
        const bevelSize = parseFloat(smusMatch[1]) / (1000 * scale);
        shape.moveTo(0,0);
        shape.lineTo(w_m, 0);
        shape.lineTo(w_m, h_m - bevelSize);
        shape.lineTo(w_m - bevelSize, h_m);
        shape.lineTo(0, h_m);
        shape.lineTo(0,0);
    } else if (poluZaobljenaMatch) {
        const R = parseFloat(poluZaobljenaMatch[1]) / (1000 * scale);
        shape.moveTo(0, 0); 
        shape.lineTo(w_m, 0); 
        shape.lineTo(w_m, h_m - R); 
        shape.absarc(w_m - R, h_m - R, R, 0, Math.PI / 2, false);
        shape.lineTo(0, h_m);
        shape.lineTo(0, 0);
    } else if (punoZaobljenaMatch) {
        const R = parseFloat(punoZaobljenaMatch[1]) / (1000 * scale);
        shape.moveTo(0, 0);
        shape.lineTo(w_m - R, 0);
        shape.absarc(w_m - R, R, R, -Math.PI / 2, 0, false);
        shape.absarc(w_m - R, h_m-R, R, 0, Math.PI / 2, false);
        shape.lineTo(0, h_m);
        shape.lineTo(0, 0);
    } else {
        geometry = new THREE.BoxGeometry(l_m, h_m, w_m);
    }

    if (!geometry) {
      const extrudeSettings = { steps: 2, depth: l_m, bevelEnabled: false };
      geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geometry.rotateX(-Math.PI/2);
      geometry.translate(0, 0, -l_m);
    }
    
    geometry.center();
    
    const finishName = finish.name.toLowerCase();
    const textureUrl = material.texture;
    const stoneMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.05,
        roughness: 0.8,
        clearcoat: 0.0,
        clearcoatRoughness: 0.5,
    });

    if (finishName.includes('polirano')) {
        stoneMaterial.roughness = 0.1;
        stoneMaterial.clearcoat = 0.9;
        stoneMaterial.clearcoatRoughness = 0.1;
    } else if (finishName.includes('paljeno') || finishName.includes('štokovano')) {
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
            const repeatFactor = 5 / (length / 100);
            texture.repeat.set(repeatFactor, repeatFactor * (width/length));
            stoneMaterial.map = texture;
            stoneMaterial.needsUpdate = true;
            textureCache.current[textureUrl] = texture;
        });
      }
    }
    
    const mesh = new THREE.Mesh(geometry, stoneMaterial);
    mesh.name = 'specimen';
    sceneRef.current.add(mesh);

    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xffd700, linewidth: 3 });
    const hx = l_m / 2, hy = h_m / 2, hz = w_m / 2;

    const edgePoints: THREE.Vector3[] = [];
    if (processedEdges.front) edgePoints.push(new THREE.Vector3(-hx, hy, -hz), new THREE.Vector3(hx, hy, -hz));
    if (processedEdges.back) edgePoints.push(new THREE.Vector3(-hx, hy, hz), new THREE.Vector3(hx, hy, hz));
    if (processedEdges.left) edgePoints.push(new THREE.Vector3(-hx, hy, -hz), new THREE.Vector3(-hx, hy, hz));
    if (processedEdges.right) edgePoints.push(new THREE.Vector3(hx, hy, -hz), new THREE.Vector3(hx, hy, hz));
    
    if (edgePoints.length > 0) {
      const edgeGeometry = new THREE.BufferGeometry().setFromPoints(edgePoints);
      const edgeLines = new THREE.LineSegments(edgeGeometry, edgeMaterial);
      edgeGroupRef.current?.add(edgeLines);
    }
    
    const okapnikGrooveMaterial = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const okapnikInset = 0.015;
    const okapnikSize = 0.005;
    const cornerGap = okapnikSize;

    const createGroove = (width: number, height: number, depth: number) => new THREE.BoxGeometry(width, height, depth);

    if (okapnik.front) {
        const groove = createGroove(l_m - 2 * cornerGap, okapnikSize, okapnikSize);
        const grooveMesh = new THREE.Mesh(groove, okapnikGrooveMaterial);
        grooveMesh.position.set(0, -hy + (okapnikSize / 2), -hz + okapnikInset + (okapnikSize / 2));
        okapnikGroupRef.current?.add(grooveMesh);
    }
    if (okapnik.back) {
        const groove = createGroove(l_m - 2 * cornerGap, okapnikSize, okapnikSize);
        const grooveMesh = new THREE.Mesh(groove, okapnikGrooveMaterial);
        grooveMesh.position.set(0, -hy + (okapnikSize / 2), hz - okapnikInset - (okapnikSize / 2));
        okapnikGroupRef.current?.add(grooveMesh);
    }
    if (okapnik.left) {
        const groove = createGroove(okapnikSize, okapnikSize, w_m - 2 * cornerGap);
        const grooveMesh = new THREE.Mesh(groove, okapnikGrooveMaterial);
        grooveMesh.position.set(-hx + okapnikInset + (okapnikSize / 2), -hy + (okapnikSize / 2), 0);
        okapnikGroupRef.current?.add(grooveMesh);
    }
    if (okapnik.right) {
        const groove = createGroove(okapnikSize, okapnikSize, w_m - 2 * cornerGap);
        const grooveMesh = new THREE.Mesh(groove, okapnikGrooveMaterial);
        grooveMesh.position.set(hx - okapnikInset - (okapnikSize / 2), -hy + (okapnikSize / 2), 0);
        okapnikGroupRef.current?.add(grooveMesh);
    }
    
    if (cameraRef.current && controlsRef.current) {
        const box = new THREE.Box3().setFromObject(mesh);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = cameraRef.current.fov * (Math.PI / 180);
        let cameraZ = maxDim / (2 * Math.tan(fov / 2));
        
        cameraZ *= 1.2; 

        cameraRef.current.position.set(center.x, center.y + cameraZ * 0.5, center.z + cameraZ);
        controlsRef.current.target.copy(center);
        
        const distance = cameraRef.current.position.distanceTo(center);
        const zoomFactor = Math.max(l_m, w_m, h_m) * 2.5; 
        cameraRef.current.position.normalize().multiplyScalar(distance * zoomFactor);

        controlsRef.current.update();
    }
    
  }, [dims, material, finish, profile, processedEdges, okapnik, resolvedTheme]);

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(resolvedTheme === 'dark' ? 0x2C303A : 0xF0F2F5);
    }
  }, [resolvedTheme]);

  return <div ref={mountRef} className="h-full w-full rounded-lg" data-ai-hint="stone slab 3d render" />;
});

VisualizationCanvas.displayName = 'VisualizationCanvas';
export default VisualizationCanvas;
