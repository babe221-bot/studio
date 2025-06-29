
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
    R = H / 2; // Full round radius is always half the height
  }
  
  if (profileType === 'half-round') R = Math.min(R, H);
  R = Math.min(R, L/2, W/2);
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

  // Bottom face
  const blb = addVertex(-halfL, 0, -halfW);
  const brb = addVertex( halfL, 0, -halfW);
  const frb = addVertex( halfL, 0,  halfW);
  const flb = addVertex(-halfL, 0,  halfW);
  addQuad(flb, frb, brb, blb);
  geometry.addGroup(currentFaceIndex, 6, 0);
  currentFaceIndex += 6;

  // Top face and profiles
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

      if (!isProcessed) {
        cornerData.main = cornerData.edgeX = cornerData.edgeZ = addVertex(x, H, z);
        cornerData.sideArc = [cornerData.main, addVertex(x, 0, z)];
        cornerData.frontArc = [cornerData.main, addVertex(x, 0, z)];
      } else if (profileType === 'chamfer') {
          const topX = procX ? x - signX * R : x;
          const topZ = procZ ? z - signZ * R : z;
          cornerData.main = addVertex(topX, H, topZ);
          cornerData.edgeX = addVertex(x, procX ? H - R : H, z);
          cornerData.edgeZ = addVertex(x, procZ ? H - R : H, z);
          // For chamfer, arcs are simple lines
          cornerData.sideArc = [procX ? cornerData.main : addVertex(x, H, z), procX ? cornerData.edgeX : addVertex(x, 0, z)];
          cornerData.frontArc = [procZ ? cornerData.main : addVertex(x, H, z), procZ ? cornerData.edgeZ : addVertex(x, 0, z)];

      } else { // half-round or full-round
        const isFullRound = profileType === 'full-round';
        const radius = isFullRound ? H / 2 : R;
        const yCenter = isFullRound ? H / 2 : H - radius;
        const startAngle = isFullRound ? -Math.PI / 2 : 0;
        const endAngle = Math.PI / 2;

        if (procX && procZ) { // Coved corner
            const cornerGrid: number[][] = [];
            for (let i = 0; i <= segments; i++) {
                const row: number[] = [];
                const theta = startAngle + (i / segments) * (endAngle - startAngle);
                const d_v = radius * Math.sin(theta);
                const d_h = radius * Math.cos(theta);
                for (let j = 0; j <= segments; j++) {
                    const phi = (j / segments) * (Math.PI / 2);
                    const vx = x - signX * d_h * Math.cos(phi);
                    const vy = yCenter + d_v;
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
            const sideArc: number[] = [], frontArc: number[] = [];
            for(let i=0; i<=segments; i++){
                sideArc.push(cornerGrid[i][0]);
                frontArc.push(cornerGrid[i][segments]);
            }
            cornerData.sideArc = sideArc;
            cornerData.frontArc = frontArc;
        } else if (procZ) { // Z-edge only
            const arc: number[] = [];
            for (let i = 0; i <= segments; i++) {
                const angle = startAngle + (i/segments) * (endAngle - startAngle);
                arc.push(addVertex(x, yCenter + radius * Math.sin(angle), z - signZ * radius * Math.cos(angle)));
            }
            cornerData.frontArc = arc;
            cornerData.sideArc = [addVertex(x, H, z), addVertex(x, 0, z)];
        } else if (procX) { // X-edge only
            const arc: number[] = [];
            for (let i = 0; i <= segments; i++) {
                const angle = startAngle + (i/segments) * (endAngle - startAngle);
                arc.push(addVertex(x - signX * radius * Math.cos(angle), yCenter + radius * Math.sin(angle), z));
            }
            cornerData.sideArc = arc;
            cornerData.frontArc = [addVertex(x, H, z), addVertex(x, 0, z)];
        } else { // Not processed on this corner, but might connect to a processed edge
            cornerData.main = cornerData.edgeX = cornerData.edgeZ = addVertex(x, H, z);
            cornerData.sideArc = [cornerData.main, addVertex(x, 0, z)];
            cornerData.frontArc = [cornerData.main, addVertex(x, 0, z)];
        }
      }
      topCorners[key] = cornerData;
  });

  // Top Face
  const flt_main = vertices.slice(topCorners.flt.sideArc[0]*3, topCorners.flt.sideArc[0]*3 + 3);
  const frt_main = vertices.slice(topCorners.frt.sideArc[0]*3, topCorners.frt.sideArc[0]*3 + 3);
  const brt_main = vertices.slice(topCorners.brt.sideArc[0]*3, topCorners.brt.sideArc[0]*3 + 3);
  const blt_main = vertices.slice(topCorners.blt.sideArc[0]*3, topCorners.blt.sideArc[0]*3 + 3);

  const topPlane = new THREE.Shape();
  topPlane.moveTo(flt_main[0], flt_main[2]);
  topPlane.lineTo(frt_main[0], frt_main[2]);
  topPlane.lineTo(brt_main[0], brt_main[2]);
  topPlane.lineTo(blt_main[0], blt_main[2]);
  topPlane.closePath();
  
  const topGeom = new THREE.ShapeGeometry(topPlane);
  const topVertices = topGeom.attributes.position.array;
  for(let i=0; i < topVertices.length/3; i++){
      topVertices[i*3+1] = H; // Set Y coordinate to H
  }
  
  const tempGeom = new THREE.BufferGeometry();
  tempGeom.setAttribute('position', new THREE.BufferAttribute(topVertices, 3));
  tempGeom.setIndex(Array.from(topGeom.index.array));

  const existingVertices = vertices.length / 3;
  vertices.push(...Array.from(tempGeom.attributes.position.array));
  const newIndices = Array.from(tempGeom.index.array).map(i => i + existingVertices);
  indices.push(...newIndices);

  geometry.addGroup(currentFaceIndex, newIndices.length, 0);
  currentFaceIndex += newIndices.length;

  // Side Faces
  const connectEdges = (c1_key: string, c2_key: string, bottom1: number, bottom2: number, isXEdge: boolean) => {
    const c1 = topCorners[c1_key];
    const c2 = topCorners[c2_key];
    const arc1 = isXEdge ? c1.frontArc : c1.sideArc;
    const arc2 = isXEdge ? c2.frontArc.slice().reverse() : c2.sideArc.slice().reverse();
    
    const startIndex = indices.length;
    
    const len = Math.max(arc1.length, arc2.length);

    for (let i = 0; i < len - 1; i++) {
        const i1 = Math.min(i, arc1.length-1);
        const i1_next = Math.min(i+1, arc1.length-1);
        const i2 = Math.min(i, arc2.length-1);
        const i2_next = Math.min(i+1, arc2.length-1);
        addQuad(arc1[i1], arc1[i1_next], arc2[i2_next], arc2[i2]);
    }

    const count = indices.length - startIndex;
    if (count > 0) {
      geometry.addGroup(startIndex, count, 1);
    }
  };

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
    slabGroup.position.y = h/2; // Center the slab vertically
    slabGroup.position.y = 0; // Center the slab vertically

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
