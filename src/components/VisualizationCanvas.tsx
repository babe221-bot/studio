
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
  
  R = Math.min(R, H / 2, L/2, W/2);
  if (R < 0) R = 0;
  const segments = 16; 

  const geometry = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const indices: number[] = [];
  let vIdx = 0;

  const addVertex = (x: number, y: number, z: number) => {
    vertices.push(x, y, z);
    return vIdx++;
  };
  
  const addFace = (v1: number, v2: number, v3: number) => {
    indices.push(v1, v2, v3);
  };
  
  const addQuad = (v1: number, v2: number, v3: number, v4: number) => {
    addFace(v1, v2, v3);
    addFace(v1, v3, v4);
  };

  const halfL = L / 2;
  const halfW = W / 2;
  
  let currentFaceIndex = 0;

  const blb = addVertex(-halfL, 0, -halfW);
  const brb = addVertex( halfL, 0, -halfW);
  const frb = addVertex( halfL, 0,  halfW);
  const flb = addVertex(-halfL, 0,  halfW);
  addQuad(flb, frb, brb, blb);
  geometry.addGroup(currentFaceIndex, 6, 0);
  currentFaceIndex += 6;

  const topCorners: { [key: string]: any } = {};
  const cornerPositions = {
      flt: { x: -halfL, z:  halfW, procX: processedEdges.left, procZ: processedEdges.front, signX: -1, signZ:  1 },
      frt: { x:  halfL, z:  halfW, procX: processedEdges.right, procZ: processedEdges.front, signX:  1, signZ:  1 },
      brt: { x:  halfL, z: -halfW, procX: processedEdges.right, procZ: processedEdges.back, signX:  1, signZ: -1 },
      blt: { x: -halfL, z: -halfW, procX: processedEdges.left, procZ: processedEdges.back, signX: -1, signZ: -1 },
  };

  Object.keys(cornerPositions).forEach(key => {
      const corner = cornerPositions[key as keyof typeof cornerPositions];
      const { x, z, procX, procZ, signX, signZ } = corner;
      
      const cornerData: any = {};
      
      const isProcessed = (profileType !== 'none' && (procX || procZ));

      if (!isProcessed || profileType === 'none') {
        cornerData.main = cornerData.edgeX = cornerData.edgeZ = addVertex(x, H, z);
      } else if (profileType === 'chamfer') {
          const topX = procX ? x - signX * R : x;
          const topZ = procZ ? z - signZ * R : z;
          cornerData.main = addVertex(topX, H, topZ);
          cornerData.edgeX = addVertex(x, procX ? H - R : H, z);
          cornerData.edgeZ = addVertex(x, procZ ? H - R : H, z);
      } else { // half-round or full-round
        if (procX && procZ) {
            const cornerGrid: number[][] = [];
            for (let i = 0; i <= segments; i++) {
                const row: number[] = [];
                const theta = (i / segments) * (Math.PI / 2); // vertical angle from top
                const d_v = R * (1 - Math.cos(theta));
                const d_h = R * Math.sin(theta);
                
                for (let j = 0; j <= segments; j++) {
                    const phi = (j / segments) * (Math.PI / 2); // horizontal angle in the quadrant
                    const vx = x - signX * d_h * Math.cos(phi);
                    const vy = H - d_v;
                    const vz = z - signZ * d_h * Math.sin(phi);
                    row.push(addVertex(vx, vy, vz));
                }
                cornerGrid.push(row);
            }

            for (let i = 0; i < segments; i++) {
                for (let j = 0; j < segments; j++) {
                    addQuad(cornerGrid[i][j], cornerGrid[i+1][j], cornerGrid[i+1][j+1], cornerGrid[i][j+1]);
                }
            }
            
            const sideArc: number[] = [], frontArc: number[] = [], topArc = cornerGrid[0];
            for (let i = 0; i <= segments; i++) {
                sideArc.push(cornerGrid[i][0]);
                frontArc.push(cornerGrid[i][segments]);
            }
            cornerData.topArc = topArc;
            cornerData.sideArc = sideArc;
            cornerData.frontArc = frontArc;

            cornerData.main = topArc[0];
            cornerData.edgeX = sideArc[segments];
            cornerData.edgeZ = frontArc[segments];
        } else if (procZ) {
            const arc: number[] = [];
            for (let i = 0; i <= segments; i++) {
                const angle = (Math.PI / 2) * (i / segments);
                arc.push(addVertex(x, H - R * (1 - Math.cos(angle)), z - signZ * R * Math.sin(angle)));
            }
            cornerData.frontArc = arc;
            cornerData.sideArc = [arc[0], arc[segments]];
            cornerData.main = arc[0];
            cornerData.edgeX = arc[0];
            cornerData.edgeZ = arc[segments];
        } else if (procX) {
            const arc: number[] = [];
            for (let i = 0; i <= segments; i++) {
                const angle = (Math.PI / 2) * (i / segments);
                arc.push(addVertex(x - signX * R * Math.sin(angle), H - R * (1 - Math.cos(angle)), z));
            }
            cornerData.sideArc = arc;
            cornerData.frontArc = [arc[0], arc[segments]];
            cornerData.main = arc[0];
            cornerData.edgeX = arc[segments];
            cornerData.edgeZ = arc[0];
        }
      }
      topCorners[key] = cornerData;
  });

  addQuad(topCorners.flt.main, topCorners.frt.main, topCorners.brt.main, topCorners.blt.main);
  
  // Fill gaps on top surface
  const fillTopGap = (c1: any, c2: any, isXEdge: boolean) => {
    if (profileType === 'chamfer' || profileType === 'none') {
       addQuad(c1.main, c2.main, c2.edgeZ, c1.edgeZ);
    } else { // Rounded
       const arc1 = isXEdge ? c1.topArc : [c1.main];
       const arc2 = isXEdge ? c2.topArc : [c2.main];
       
       if (c1.topArc && c2.topArc) { // Corner-to-corner on top
         // This case is for future improvement, for now the central quad is enough.
       } else if(c1.topArc) { // Corner to straight
           for (let j = 0; j < segments; j++) {
              addQuad(c1.topArc[j], c1.topArc[j+1], c2.main, c2.main);
           }
       } else if(c2.topArc) { // Straight to corner
           for (let j = 0; j < segments; j++) {
              addQuad(c1.main, c1.main, c2.topArc[j+1], c2.topArc[j]);
           }
       } else {
         const p1 = isXEdge ? c1.edgeZ : c1.edgeX;
         const p2 = isXEdge ? c2.edgeZ : c2.edgeX;
         addQuad(c1.main, c2.main, p2, p1);
       }
    }
  };
  
  // Create top face
  geometry.addGroup(currentFaceIndex, indices.length - currentFaceIndex, 0);
  currentFaceIndex = indices.length;
  
  const connectEdges = (c1_key: string, c2_key: string, bottom1: number, bottom2: number, isXEdge: boolean) => {
    const c1 = topCorners[c1_key];
    const c2 = topCorners[c2_key];
    const arc1 = isXEdge ? (c1.frontArc || [c1.main, c1.edgeZ]) : (c1.sideArc || [c1.main, c1.edgeX]);
    const arc2 = isXEdge ? (c2.frontArc || [c2.main, c2.edgeZ]) : (c2.sideArc || [c2.main, c2.edgeX]);
    
    const startIndex = indices.length;
    
    const len = Math.max(arc1.length, arc2.length);

    if (profileType !== 'none') {
        if (!isProcessed(c1_key, isXEdge) && !isProcessed(c2_key, isXEdge)) {
             addQuad(bottom2, bottom1, arc1[0], arc2[0]);
        } else {
             // Bottom part of the side face
            addQuad(bottom2, bottom1, arc1[arc1.length-1], arc2[arc2.length-1]);
            // The profile itself
            for (let i = 0; i < len - 1; i++) {
                const i1 = Math.min(i, arc1.length-1);
                const i1_next = Math.min(i+1, arc1.length-1);
                const i2 = Math.min(i, arc2.length-1);
                const i2_next = Math.min(i+1, arc2.length-1);
                addQuad(arc1[i1], arc1[i1_next], arc2[i2_next], arc2[i2]);
            }
        }
    } else {
        addQuad(bottom2, bottom1, c1.main, c2.main);
    }

    const count = indices.length - startIndex;
    if (count > 0) {
      geometry.addGroup(startIndex, count, 1);
    }
  };
  
  const isProcessed = (cornerKey: string, isX: boolean) => {
      const c = cornerPositions[cornerKey as keyof typeof cornerPositions];
      return isX ? c.procZ : c.procX;
  }

  connectEdges('flt', 'frt', flb, frb, true); // front
  connectEdges('frt', 'brt', frb, brb, false); // right
  connectEdges('brt', 'blt', brb, blb, true); // back
  connectEdges('blt', 'flt', blb, flb, false); // left

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
    scene.background = new THREE.Color(0xF0F0F0);

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

    const ambientLight = new THREE.AmbientLight(0xffffff, 2.0); 
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
    mainLight.position.set(5, 10, 7.5);
    scene.add(mainLight);
    
    const fillLight = new THREE.DirectionalLight(0xffffff, 1.0);
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

    const originalMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.1,
        roughness: 0.7,
        clearcoat: 0.1,
        clearcoatRoughness: 0.4,
        side: THREE.DoubleSide,
    });
    
    const processedMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xcccccc,
        metalness: 0.2,
        roughness: 0.5,
        side: THREE.DoubleSide,
    });

    const finishName = finish.name.toLowerCase();
    if (finishName.includes('poliran')) {
        originalMaterial.roughness = 0.1;
        originalMaterial.clearcoat = 0.9;
        originalMaterial.clearcoatRoughness = 0.1;
        processedMaterial.roughness = 0.2;
        processedMaterial.color.set(0xdddddd);
    } else if (finishName.includes('plamena') || finishName.includes('štokovan')) {
        originalMaterial.roughness = 0.95;
        processedMaterial.roughness = 0.8;
        processedMaterial.color.set(0xb0b0b0);
    }

    const textureUrl = material.texture;
    if (textureUrl) {
      if (textureCache.current[textureUrl]) {
        originalMaterial.map = textureCache.current[textureUrl];
        originalMaterial.needsUpdate = true;
      } else {
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(textureUrl, (texture) => {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            const repeatFactor = 5 / (vizL > vizW ? vizL : vizW);
            texture.repeat.set(repeatFactor, repeatFactor * (vizW/vizL));
            originalMaterial.map = texture;
            originalMaterial.needsUpdate = true;
            textureCache.current[textureUrl] = texture;
        });
      }
    }
    
    const geometry = generateSlabGeometry(vizL, vizW, h, profile, vizProcessedEdges);
    const mainObject = new THREE.Mesh(geometry, [originalMaterial, processedMaterial]);
    
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
        processedMaterial
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
    slabGroup.position.y = -h/2; // Center the slab vertically

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
