"use client";

import React, { useRef, useEffect } from 'react';
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

const VisualizationCanvas: React.FC<VisualizationProps> = ({ dims, material, finish, profile }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const textureCache = useRef<{ [key: string]: THREE.Texture }>({});

  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(resolvedTheme === 'dark' ? 0x1A1F26 : 0xF0F2F5);

    // Camera
    const camera = new THREE.PerspectiveCamera(50, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.physicallyCorrectLights = true;
    currentMount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
    keyLight.position.set(-5, 10, 8);
    scene.add(ambientLight, keyLight);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (currentMount) {
        camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (currentMount) {
        currentMount.removeChild(renderer.domElement);
      }
      Object.values(textureCache.current).forEach(texture => texture.dispose());
    };
  }, [resolvedTheme]);


  useEffect(() => {
    if (!sceneRef.current || !material || !finish || !profile) return;
    
    // Clear previous mesh
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

    // Create new geometry
    const { length, width, height } = dims;
    const scale = 100;
    const profileName = profile.name.toLowerCase();

    const shape = new THREE.Shape()
        .moveTo(0, 0)
        .lineTo(0, width / scale)
        .lineTo(length / scale, width / scale)
        .lineTo(length / scale, 0)
        .lineTo(0, 0);

    const extrudeSettings: THREE.ExtrudeGeometryOptions = { depth: height / scale, bevelEnabled: false };

    if (profileName.includes('polirana ravna')) {
        extrudeSettings.bevelEnabled = true;
        extrudeSettings.bevelThickness = 0.002;
        extrudeSettings.bevelSize = 0.001;
        extrudeSettings.bevelSegments = 1;
    } else if (profileName.includes('faza') || profileName.includes('oborena')) {
        extrudeSettings.bevelEnabled = true;
        extrudeSettings.bevelThickness = Math.min(height / scale, 0.02) / 2;
        extrudeSettings.bevelSize = Math.min(height / scale, 0.02) / 2;
        extrudeSettings.bevelSegments = 1;
    } else if (profileName.includes('četvrt-krug')) {
        const radius = 0.5 / scale; // 5mm radius
        extrudeSettings.bevelEnabled = true;
        extrudeSettings.bevelThickness = Math.min(radius, height / (2 * scale));
        extrudeSettings.bevelSize = Math.min(radius, height / (2 * scale));
        extrudeSettings.bevelSegments = 4;
    } else if (profileName.includes('polu-zaobljena')) {
        extrudeSettings.bevelEnabled = true;
        extrudeSettings.bevelThickness = height / (2 * scale);
        extrudeSettings.bevelSize = height / (2 * scale);
        extrudeSettings.bevelSegments = 8;
    } else if (profileName.includes('puno zaobljena')) {
        extrudeSettings.bevelEnabled = true;
        extrudeSettings.bevelThickness = height / (2.1 * scale);
        extrudeSettings.bevelSize = height / (2.1 * scale);
        extrudeSettings.bevelSegments = 8;
    }
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.center();

    // Create material
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
    } else if (finishName.includes('paljeno')) {
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
    
    // Focus camera
    if (cameraRef.current && controlsRef.current) {
        const box = new THREE.Box3().setFromObject(mesh);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = cameraRef.current.fov * (Math.PI / 180);
        let cameraZ = maxDim / (2 * Math.tan(fov / 2));
        cameraZ *= 1.5; // zoom out a bit
        cameraRef.current.position.set(center.x, center.y, center.z + cameraZ);
        controlsRef.current.target.copy(center);
        controlsRef.current.update();
    }
    
  }, [dims, material, finish, profile]);

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(resolvedTheme === 'dark' ? 0x1A1F26 : 0xF0F2F5);
    }
  }, [resolvedTheme]);

  return <div ref={mountRef} className="h-full w-full rounded-lg" data-ai-hint="stone slab 3d render" />;
};

export default VisualizationCanvas;
