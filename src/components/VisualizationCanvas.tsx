"use client";

import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
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

const generateSlabGeometry = (
    L: number, W: number, H: number, 
    profile: EdgeProfile, 
    processedEdges: ProcessedEdges
  ) => {
    
  const profileName = profile.name.toLowerCase();
  const smusMatch = profileName.match(/smuš c(\d+\.?\d*)/);
  const poluRMatch = profileName.match(/polu-zaobljena r(\d+\.?\d*)cm/);
  const punoRMatch = profileName.match(/puno-zaobljena r(\d+\.?\d*)cm/);

  let profileType: 'chamfer' | 'half-round' | 'full-round' | 'none' = 'none';
  let R = 0;
  const roundSegments = 8;

  if (smusMatch) {
    profileType = 'chamfer';
    R = parseFloat(smusMatch[1]) / 1000; // mm to meters
  } else if (poluRMatch) {
    profileType = 'half-round';
    R = parseFloat(poluRMatch[1]) / 100; // cm to meters
  } else if (punoRMatch) {
    profileType = 'full-round';
    R = parseFloat(punoRMatch[1]) / 100; // cm to meters
  }
  
  R = Math.min(R, H / 2, L / 2, W / 2);

  const vertices: number[] = [];
  const indices: number[] = [];
  let vertexIndex = 0;

  const addVertex = (x: number, y: number, z: number) => {
    vertices.push(x, y, z);
    return vertexIndex++;
  };
  
  const addFace = (v1: number, v2: number, v3: number) => {
    indices.push(v1, v2, v3);
  };
  
  const addQuad = (v1: number, v2: number, v3: number, v4: number) => {
    addFace(v1, v2, v3);
    addFace(v1, v3, v4);
  };

  const points: { [key: string]: number } = {};

  const halfL = L / 2;
  const halfW = W / 2;

  points.blb = addVertex(-halfL, 0, -halfW);
  points.brb = addVertex( halfL, 0, -halfW);
  points.frb = addVertex( halfL, 0,  halfW);
  points.flb = addVertex(-halfL, 0,  halfW);

  const createTopVertices = (cx: number, cz: number, pE1: boolean, pE2: boolean) => {
    const signX = Math.sign(cx);
    const signZ = Math.sign(cz);

    if (profileType === 'none' || (!pE1 && !pE2)) {
      return { corner: addVertex(cx, H, cz) };
    }
    
    if (profileType === 'chamfer') {
        const cornerPoints: { [key:string]: any } = {};
        if (pE1 && pE2) { // Corner with two processed edges
          cornerPoints.main = addVertex(cx - signX * R, H, cz - signZ * R);
          cornerPoints.e1 = addVertex(cx, H - R, cz - signZ * R);
          cornerPoints.e2 = addVertex(cx - signX * R, H - R, cz);
        } else if (pE1) { // Edge along Z-axis (front/back)
          cornerPoints.main = addVertex(cx, H, cz - signZ * R);
          cornerPoints.e1 = addVertex(cx, H - R, cz - signZ * R);
        } else { // pE2, Edge along X-axis (left/right)
          cornerPoints.main = addVertex(cx - signX * R, H, cz);
          cornerPoints.e2 = addVertex(cx - signX * R, H - R, cz);
        }
        return cornerPoints;
    }
    
    if (profileType === 'half-round' || profileType === 'full-round') {
        const cornerPoints: { [key:string]: any } = { main: [] };
        // This simplified version generates the profile as if it's on an edge
        if (pE1 && pE2) { // Corner - quarter torus
             for (let i = 0; i <= roundSegments; i++) {
                const angle = (i / roundSegments) * (Math.PI / 2);
                const x = cx - signX * R * (1 - Math.cos(angle));
                const z = cz - signZ * R * (1 - Math.cos(angle));
                cornerPoints.main.push(addVertex(x, H, z)); // Top point
                // side points would need more logic
             }
        } else if (pE1) { // Profile primarily on Z-axis for front/back edge
             for (let i = 0; i <= roundSegments; i++) {
                const angle = (i / roundSegments) * (Math.PI / 2);
                const y = H - R * (1 - Math.sin(angle));
                const z = cz - signZ * R * (1 - Math.cos(angle));
                cornerPoints.main.push(addVertex(cx, y, z));
             }
        } else if (pE2){ // Profile primarily on X-axis for left/right edge
            for (let i = 0; i <= roundSegments; i++) {
                const angle = (i / roundSegments) * (Math.PI / 2);
                const y = H - R * (1 - Math.sin(angle));
                const x = cx - signX * R * (1 - Math.cos(angle));
                cornerPoints.main.push(addVertex(x, y, cz));
            }
        } else {
             cornerPoints.main.push(addVertex(cx,H,cz));
        }
        return cornerPoints;
    }
    
    return { corner: addVertex(cx, H, cz) };
  };

  const fltData = createTopVertices(-halfL,  halfW, processedEdges.front, processedEdges.left);
  const frtData = createTopVertices( halfL,  halfW, processedEdges.front, processedEdges.right);
  const bltData = createTopVertices(-halfL, -halfW, processedEdges.back,  processedEdges.left);
  const brtData = createTopVertices( halfL, -halfW, processedEdges.back,  processedEdges.right);

  // Bottom face
  addQuad(points.blb, points.brb, points.frb, points.flb);

  const getTopVertex = (data: any) => {
    if (Array.isArray(data.main) && data.main.length > 0) return data.main[data.main.length - 1];
    return data.main || data.e1 || data.corner;
  };
  
  const getSideVertex = (data: any, axis: 'x' | 'z') => {
     if (Array.isArray(data.main) && data.main.length > 0) return data.main[0];
     if (axis === 'x') return data.e1 || data.main || data.corner; // front/back edges are along x
     return data.e2 || data.main || data.corner; // left/right edges are along z
  };

  // Top Surface - connects the highest points of each corner profile
  addQuad(
      getTopVertex(bltData),
      getTopVertex(brtData),
      getTopVertex(frtData),
      getTopVertex(fltData)
  );

  // Side Faces
  const connectEdge = (c1_data: any, c2_data: any, isProcessed: boolean, bottomP1: number, bottomP2: number, axis: 'x' | 'z') => {
    const side1 = getSideVertex(c1_data, axis);
    const side2 = getSideVertex(c2_data, axis);
    
    addQuad(bottomP1, bottomP2, side2, side1);
    
    if (isProcessed) {
        if (profileType === 'chamfer') {
            const top1 = getTopVertex(c1_data);
            const top2 = getTopVertex(c2_data);
            addQuad(side1, side2, top2, top1);
        } else if (profileType === 'half-round' || profileType === 'full-round') {
            if (Array.isArray(c1_data.main) && c1_data.main.length > 1 && Array.isArray(c2_data.main) && c2_data.main.length > 1) {
                const v1 = c1_data.main;
                const v2 = c2_data.main;
                for (let i = 0; i < roundSegments; i++) {
                    addQuad(v1[i], v2[i], v2[i+1], v1[i+1]);
                }
            } else {
                 const top1 = getTopVertex(c1_data);
                 const top2 = getTopVertex(c2_data);
                 addQuad(side1, side2, top2, top1);
            }
        }
    }
  };

  // Simplified connection logic
  connectEdge(fltData, frtData, processedEdges.front, points.flb, points.frb, 'x');
  connectEdge(frtData, brtData, processedEdges.right, points.frb, points.brb, 'z');
  connectEdge(brtData, bltData, processedEdges.back, points.brb, points.blb, 'x');
  connectEdge(bltData, fltData, processedEdges.left, points.blb, points.flb, 'z');

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
};


const VisualizationCanvas = forwardRef<CanvasHandle, VisualizationProps>(({ dims, material, finish, profile, processedEdges, okapnikEdges }, ref) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const textureCache = useRef<{ [key: string]: THREE.Texture }>({});
  const mainGroupRef = useRef<THREE.Group | null>(null);
  
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
    // Use a consistent, neutral studio background
    scene.background = new THREE.Color(0xEAEAEA);

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

    // New lighting setup for a more neutral, studio look
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 2.0);
    mainLight.position.set(5, 10, 7.5);
    scene.add(mainLight);
    
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
    fillLight.position.set(-5, -5, -5);
    scene.add(fillLight);

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
    if (!sceneRef.current || !mainGroupRef.current || !material || !finish || !profile) return;
    
    const { length, width, height } = dims;

    const shouldSwap = width > length;
    const vizL = (shouldSwap ? width : length) / 100;
    const vizW = (shouldSwap ? length : width) / 100;
    const h = height / 100;

    const vizProcessedEdges: ProcessedEdges = {
      front: shouldSwap ? processedEdges.left : processedEdges.front,
      back: shouldSwap ? processedEdges.right : processedEdges.back,
      left: shouldSwap ? processedEdges.front : processedEdges.left,
      right: shouldSwap ? processedEdges.back : processedEdges.right,
    };
    
    const vizOkapnikEdges: ProcessedEdges = {
      front: shouldSwap ? (okapnikEdges.left ?? false) : (okapnikEdges.front ?? false),
      back: shouldSwap ? (okapnikEdges.right ?? false) : (okapnikEdges.back ?? false),
      left: shouldSwap ? (okapnikEdges.front ?? false) : (okapnikEdges.left ?? false),
      right: shouldSwap ? (okapnikEdges.back ?? false) : (okapnikEdges.right ?? false),
    };

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

    const stoneMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.1,
        roughness: 0.7,
        clearcoat: 0.1,
        clearcoatRoughness: 0.4,
        side: THREE.DoubleSide,
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
            const repeatFactor = 5 / (vizL > vizW ? vizL : vizW);
            texture.repeat.set(repeatFactor, repeatFactor * (vizW/vizL));
            stoneMaterial.map = texture;
            stoneMaterial.needsUpdate = true;
            textureCache.current[textureUrl] = texture;
        });
      }
    }
    
    const geometry = generateSlabGeometry(vizL, vizW, h, profile, vizProcessedEdges);
    const mainObject = new THREE.Mesh(geometry, stoneMaterial);
    
    const slabGroup = new THREE.Group();
    slabGroup.add(mainObject);
    
    const okapnikGrooveDepth = 0.5 / 100;
    const okapnikGrooveWidth = 0.8 / 100;
    const okapnikOffset = 2.0 / 100;

    const createOkapnik = (edgeL: number, vertical: boolean) => {
      const groove = new THREE.Mesh(
        new THREE.BoxGeometry(
          vertical ? okapnikGrooveWidth : edgeL - okapnikOffset * 2,
          okapnikGrooveDepth,
          vertical ? edgeL - okapnikOffset * 2: okapnikGrooveWidth
        ),
        stoneMaterial
      );
      return groove;
    }
    
    if(vizOkapnikEdges.front) { 
      const okapnik = createOkapnik(vizL, false);
      okapnik.position.set(0, -okapnikGrooveDepth/2, (vizW/2) - okapnikOffset);
      slabGroup.add(okapnik);
    }
    if(vizOkapnikEdges.back) { 
      const okapnik = createOkapnik(vizL, false);
      okapnik.position.set(0, -okapnikGrooveDepth/2, -(vizW/2) + okapnikOffset);
      slabGroup.add(okapnik);
    }
    if(vizOkapnikEdges.left) {
      const okapnik = createOkapnik(vizW, true);
      okapnik.position.set(-(vizL/2) + okapnikOffset, -okapnikGrooveDepth/2, 0);
      slabGroup.add(okapnik);
    }
    if(vizOkapnikEdges.right) { 
      const okapnik = createOkapnik(vizW, true);
      okapnik.position.set((vizL/2) - okapnikOffset, -okapnikGrooveDepth/2, 0);
      slabGroup.add(okapnik);
    }

    mainGroupRef.current.add(slabGroup);
    slabGroup.position.y = h/2;

    if (cameraRef.current && controlsRef.current) {
        const box = new THREE.Box3().setFromObject(slabGroup);
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
    
  }, [dims, material, finish, profile, processedEdges, okapnikEdges]);

  return <div ref={mountRef} className="h-full w-full rounded-lg" data-ai-hint="stone slab 3d render" />;
});

VisualizationCanvas.displayName = 'VisualizationCanvas';
export default VisualizationCanvas;
