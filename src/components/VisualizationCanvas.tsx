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
  const roundSegments = 5;

  if (smusMatch) {
    profileType = 'chamfer';
    R = parseFloat(smusMatch[1]) / 1000; 
  } else if (poluRMatch) {
    profileType = 'half-round';
    R = parseFloat(poluRMatch[1]) / 100;
  } else if (punoRMatch) {
    profileType = 'full-round';
    R = parseFloat(punoRMatch[1]) / 100;
  }
  
  R = Math.min(R, H / 2, W / 2, L / 2);

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
        if (pE1 && pE2) {
          cornerPoints.main = addVertex(cx - signX * R, H, cz - signZ * R);
          cornerPoints.e1 = addVertex(cx, H - R, cz - signZ * R);
          cornerPoints.e2 = addVertex(cx - signX * R, H - R, cz);
        } else if (pE1) {
          cornerPoints.main = addVertex(cx, H, cz - signZ * R);
          cornerPoints.e1 = addVertex(cx, H - R, cz - signZ * R);
        } else { // pE2
          cornerPoints.main = addVertex(cx - signX * R, H, cz);
          cornerPoints.e2 = addVertex(cx - signX * R, H - R, cz);
        }
        return cornerPoints;
    }
    
    if (profileType === 'half-round' || profileType === 'full-round') {
        const cornerPoints: { [key:string]: any } = { main: [] };
        const isFullRound = profileType === 'full-round';
        
        if(pE1 && pE2) { // Corner
            const startAngle = isFullRound ? 0 : Math.PI/2;
            const endAngle = isFullRound ? Math.PI : Math.PI;

            for(let i=0; i<=roundSegments; ++i) {
                const cornerAngle = Math.PI/2; // for corner between two edges
                const sliceAngle = (i/roundSegments) * cornerAngle;

                const y = H - R * Math.sin(sliceAngle);
                const r_slice = R * Math.cos(sliceAngle);

                cornerPoints.main.push(addVertex(cx - signX * r_slice, y, cz - signZ * r_slice));
            }
        } else if (pE1) { // Edge along Z
             const startAngle = isFullRound ? 0 : Math.PI/2;
             const endAngle = Math.PI;
             for (let i = 0; i <= roundSegments; i++) {
                const angle = startAngle + (i/roundSegments) * (endAngle-startAngle);
                const y = H - R * Math.sin(angle);
                const z_offset = R * Math.cos(angle);
                if (isFullRound) {
                   cornerPoints.main.push(addVertex(cx, y, cz - signZ * z_offset));
                } else {
                   cornerPoints.main.push(addVertex(cx, y, cz - signZ * (R - z_offset)));
                }
             }
        } else { // pE2, Edge along X
            const startAngle = isFullRound ? 0 : Math.PI/2;
            const endAngle = Math.PI;
            for (let i = 0; i <= roundSegments; i++) {
                const angle = startAngle + (i/roundSegments) * (endAngle-startAngle);
                const y = H - R * Math.sin(angle);
                const x_offset = R * Math.cos(angle);
                if(isFullRound) {
                    cornerPoints.main.push(addVertex(cx - signX * x_offset, y, cz));
                } else {
                    cornerPoints.main.push(addVertex(cx - signX * (R-x_offset), y, cz));
                }
            }
        }
        return cornerPoints;
    }
    
    return { corner: addVertex(cx, H, cz) };
  };

  const flt = createTopVertices(-halfL,  halfW, processedEdges.front, processedEdges.left);
  const frt = createTopVertices( halfL,  halfW, processedEdges.front, processedEdges.right);
  const blt = createTopVertices(-halfL, -halfW, processedEdges.back,  processedEdges.left);
  const brt = createTopVertices( halfL, -halfW, processedEdges.back,  processedEdges.right);

  addQuad(points.blb, points.brb, points.frb, points.flb);

  const connectEdge = (c1_data: any, c2_data: any, isVertical: boolean, isProcessed: boolean, bottomP1: number, bottomP2: number) => {
    if (!isProcessed) {
        addQuad(bottomP1, bottomP2, getTopPoint(c2_data), getTopPoint(c1_data));
        return;
    }

      const c1 = Array.isArray(c1_data.main) ? c1_data.main : [c1_data.e1 || c1_data.main, c1_data.e2 || c1_data.main];
      const c2 = Array.isArray(c2_data.main) ? c2_data.main : [c2_data.e1 || c2_data.main, c2_data.e2 || c2_data.main];
      
      const v_c1 = vertices.slice(c1[0]*3, c1[0]*3+3);
      const v_c2 = vertices.slice(c2[0]*3, c2[0]*3+3);

      addQuad(bottomP1, bottomP2, c2[0], c1[0]);
  }

  const getTopPoint = (c_data: any) => Array.isArray(c_data.main) ? c_data.main[0] : c_data.main;
  addQuad(getTopPoint(blt), getTopPoint(brt), getTopPoint(frt), getTopPoint(flt));

  connectEdge(flt, frt, false, processedEdges.front, points.flb, points.frb);
  connectEdge(frt, brt, true, processedEdges.right, points.frb, points.brb);
  connectEdge(brt, blt, false, processedEdges.back, points.brb, points.blb);
  connectEdge(blt, flt, true, processedEdges.left, points.blb, points.flb);

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

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8d8d8d, 2.5);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight.position.set(-8, 12, 8);
    scene.add(dirLight);

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
    
  }, [dims, material, finish, profile, processedEdges, okapnikEdges, resolvedTheme]);

  return <div ref={mountRef} className="h-full w-full rounded-lg" data-ai-hint="stone slab 3d render" />;
});

VisualizationCanvas.displayName = 'VisualizationCanvas';
export default VisualizationCanvas;
