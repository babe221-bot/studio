"use client";

import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useTheme } from 'next-themes';
import type { Material as MaterialType, SurfaceFinish, EdgeProfile } from '@/types';

interface VisualizationProps {
  dims: { length: number; width: number; height: number };
  material?: MaterialType;
  finish?: SurfaceFinish;
  profile?: EdgeProfile;
}

type CanvasHandle = {
  getSnapshot: () => string | null;
};

const VisualizationCanvas = forwardRef<CanvasHandle, VisualizationProps>(({ dims, material, finish, profile }, ref) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const textureCache = useRef<{ [key: string]: THREE.Texture }>({});

  const { resolvedTheme } = useTheme();

  useImperativeHandle(ref, () => ({
    getSnapshot: () => {
      if (rendererRef.current) {
        return rendererRef.current.domElement.toDataURL('image/png');
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

    const { length, width, height } = dims;
    const scale = 100;
    const profileName = profile.name.toLowerCase();
    
    const mainHeight = height / scale;
    let geometry;

    if (profileName.includes('okapnik')) {
      const slab = new THREE.BoxGeometry(length / scale, mainHeight, width / scale);
      const groove = new THREE.BoxGeometry(length / scale, 0.005, 0.005);
      groove.translate(0, -mainHeight/2 + 0.005, -width/scale/2 + 0.015);
      
      // We need a CSG library for subtraction, for now we just show the block
      geometry = slab;
      geometry.translate(0, 0, 0); // Center the geometry

    } else if (profileName.includes('ravni rez')) {
        geometry = new THREE.BoxGeometry(length/scale, mainHeight, width/scale);
    } else {
        const shape = new THREE.Shape();
        const r = 0.005; // radius for simple curve
        
        if (profileName.includes('četvrt-krug')) {
            const R = Math.min(0.5 / scale, mainHeight / 2, width/scale/2);
            shape.moveTo(0, 0);
            shape.lineTo(width/scale - R, 0);
            shape.absarc(width/scale - R, R, R, -Math.PI/2, 0, false);
            shape.lineTo(width/scale, mainHeight);
            shape.lineTo(0, mainHeight);
            shape.lineTo(0, 0);
        } else if (profileName.includes('polu-zaobljena')) {
             const R = mainHeight/2;
             shape.moveTo(0,0);
             shape.lineTo(width/scale - R, 0);
             shape.absarc(width/scale-R, R, R, -Math.PI/2, Math.PI/2, false);
             shape.lineTo(0, mainHeight);
             shape.lineTo(0,0);
        } else if (profileName.includes('puno zaobljena')) {
             const R = mainHeight/2;
             shape.moveTo(0,0);
             shape.lineTo(width/scale - R, 0);
             shape.absarc(width/scale-R, R, R, -Math.PI/2, 0, false);
             shape.lineTo(width/scale, mainHeight-R);
             shape.absarc(width/scale-R, mainHeight-R, R, 0, Math.PI/2, false);
             shape.lineTo(R, mainHeight);
             shape.absarc(R, mainHeight-R, R, Math.PI/2, Math.PI, false);
             shape.lineTo(0,R);
             shape.absarc(R, R, R, Math.PI, Math.PI*1.5, false);

        } else { // Faza / Polirana ravna
            const bevelSize = profileName.includes('faza') ? 0.002 : 0.001;
            shape.moveTo(0,0);
            shape.lineTo(width/scale - bevelSize, 0);
            shape.lineTo(width/scale, bevelSize);
            shape.lineTo(width/scale, mainHeight - bevelSize);
            shape.lineTo(width/scale - bevelSize, mainHeight);
            shape.lineTo(0, mainHeight);
            shape.lineTo(0,0);
        }

        const extrudeSettings = {
            steps: 2,
            depth: length / scale,
            bevelEnabled: false,
        };
        geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geometry.rotateX(-Math.PI/2);
        geometry.translate(-width/scale/2, 0, -length/scale/2);
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
    
    if (cameraRef.current && controlsRef.current) {
        const box = new THREE.Box3().setFromObject(mesh);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = cameraRef.current.fov * (Math.PI / 180);
        let cameraZ = maxDim / (2 * Math.tan(fov / 2));
        
        cameraZ *= 1.2; // Zoom closer

        cameraRef.current.position.set(center.x + cameraZ, center.y + cameraZ * 0.75, center.z + cameraZ);
        controlsRef.current.target.copy(center);
        controlsRef.current.update();
    }
    
  }, [dims, material, finish, profile]);

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(resolvedTheme === 'dark' ? 0x2C303A : 0xF0F2F5);
    }
  }, [resolvedTheme]);

  return <div ref={mountRef} className="h-full w-full rounded-lg" data-ai-hint="stone slab 3d render" />;
});

VisualizationCanvas.displayName = 'VisualizationCanvas';
export default VisualizationCanvas;
