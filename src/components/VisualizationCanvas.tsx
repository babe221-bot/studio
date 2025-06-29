
"use client";

import React, { useRef, useEffect, useImperativeHandle, forwardRef, useMemo } from 'react';
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

// --- Geometry Generation ---
const generateSlabGeometry = (
    L: number, W: number, H: number, 
    profile: EdgeProfile, 
    processedEdges: ProcessedEdges
) => {
  const geometry = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const indices: number[] = [];
  const groups: { start: number; count: number; materialIndex: number }[] = [];
  let vIdx = 0;

  // --- Helper functions ---
  const addVertex = (x: number, y: number, z: number) => {
    vertices.push(x, y, z);
    return vIdx++;
  };
  const addFace = (v1: number, v2: number, v3: number) => indices.push(v1, v2, v3);
  const addQuad = (v1: number, v2: number, v3: number, v4: number) => {
    if (v1 === v2 || v1 === v3 || v1 === v4 || v2 === v3 || v2 === v4 || v3 === v4) return;
    addFace(v1, v2, v3);
    addFace(v1, v3, v4);
  };
  const addGroup = (start: number, count: number, materialIndex: number) => {
    if (count > 0) {
      groups.push({ start, count, materialIndex });
    }
  };
  
  // --- Profile Parameter Calculation ---
  const profileName = profile.name.toLowerCase();
  const smusMatch = profileName.match(/smuš c(\d+\.?\d*)/);
  const poluRMatch = profileName.match(/polu-zaobljena r(\d+\.?\d*)cm/);
  const punoRMatch = profileName.match(/puno-zaobljena r(\d+\.?\d*)cm/);

  let profileType: 'chamfer' | 'half-round' | 'full-round' | 'none' = 'none';
  let R = 0;
  const segments = 16;
  const halfL = L / 2;
  const halfW = W / 2;

  if (smusMatch) {
    profileType = 'chamfer';
    R = Math.min(parseFloat(smusMatch[1]) / 100, H, L/2, W/2); // mm to m, but input is cm, so /100
  } else if (poluRMatch) {
    profileType = 'half-round';
    R = Math.min(parseFloat(poluRMatch[1]) / 100, H); // cm to m, capped by thickness
  } else if (punoRMatch) {
    profileType = 'full-round';
    R = H / 2; // Full round radius is always half the height
  }
  if (R <= 0) profileType = 'none';
  
  // --- Corner Data Generation ---
  const cornerPositions = {
      flt: { x: -halfL, z:  halfW, procX: processedEdges.left, procZ: processedEdges.front, signX: -1, signZ:  1 },
      frt: { x:  halfL, z:  halfW, procX: processedEdges.right, procZ: processedEdges.front, signX:  1, signZ:  1 },
      brt: { x:  halfL, z: -halfW, procX: processedEdges.right, procZ: processedEdges.back, signX:  1, signZ: -1 },
      blt: { x: -halfL, z: -halfW, procX: processedEdges.left, procZ: processedEdges.back, signX: -1, signZ: -1 },
  };

  const cornerData: { [key: string]: any } = {};

  Object.keys(cornerPositions).forEach(key => {
    const cPos = cornerPositions[key as keyof typeof cornerPositions];
    const { x, z, procX, procZ, signX, signZ } = cPos;
    
    const data: any = {
      base_bl: addVertex(x, 0, z),
      base_tl: addVertex(x, H, z),
      sideArc: [], // Arc along X edge (left/right)
      frontArc: [], // Arc along Z edge (front/back)
    };

    const hasProfile = profileType !== 'none';
    const hasProfileX = hasProfile && procX;
    const hasProfileZ = hasProfile && procZ;

    // --- Generate Arcs ---
    const genArc = (isX: boolean) => {
      const arc: number[] = [];
      const isFullRound = profileType === 'full-round';
      const yCenter = isFullRound ? H / 2 : H - R;
      const startAngle = isFullRound ? -Math.PI / 2 : 0;
      const endAngle = Math.PI / 2;

      for (let i = 0; i <= segments; i++) {
        const angle = startAngle + (i / segments) * (endAngle - startAngle);
        const vx = x - (isX ? signX : 0) * R * (1 - Math.cos(angle));
        const vy = yCenter + R * Math.sin(angle);
        const vz = z - (isX ? 0 : signZ) * R * (1 - Math.cos(angle));
        arc.push(addVertex(vx, vy, vz));
      }
      return arc;
    };
    
    if (profileType === 'chamfer') {
        if (hasProfileX) data.sideArc = [addVertex(x, H - R, z), addVertex(x - signX * R, H, z)];
        if (hasProfileZ) data.frontArc = [addVertex(x, H - R, z), addVertex(x, H, z - signZ * R)];
    } else if (profileType === 'half-round' || profileType === 'full-round') {
        if (hasProfileX) data.sideArc = genArc(true);
        if (hasProfileZ) data.frontArc = genArc(false);
    }
    
    // Fill in missing arcs with flat top vertex
    if (!hasProfileX) data.sideArc = Array(data.frontArc.length || 1).fill(data.base_tl);
    if (!hasProfileZ) data.frontArc = Array(data.sideArc.length || 1).fill(data.base_tl);
    
    // --- Generate Corner Surface ---
    if (hasProfileX && hasProfileZ) {
      const cornerFaceStart = indices.length;
      if (profileType === 'chamfer') {
        addFace(
          data.base_tl,
          data.sideArc[1],
          data.frontArc[1],
        );
      } else {
        const cornerGrid: number[][] = [];
        const isFullRound = profileType === 'full-round';
        const yCenter = isFullRound ? H / 2 : H - R;
        const startAngle = isFullRound ? -Math.PI / 2 : 0;
        const endAngle = Math.PI / 2;
        
        for (let i = 0; i <= segments; i++) {
            const row: number[] = [];
            const theta = startAngle + (i / segments) * (endAngle - startAngle);
            const d_v = R * Math.sin(theta);
            const d_h = R * (1 - Math.cos(theta));
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
        data.sideArc = cornerGrid.map(row => row[0]).reverse();
        data.frontArc = cornerGrid[0];
      }
      addGroup(cornerFaceStart, indices.length - cornerFaceStart, 2); // Material 2 for profile corners
    }
    
    cornerData[key] = data;
  });

  // --- Main Faces (Top/Bottom) ---
  const bottomFaceStart = indices.length;
  addQuad(cornerData.blt.base_bl, cornerData.brt.base_bl, cornerData.frt.base_bl, cornerData.flt.base_bl);
  addGroup(bottomFaceStart, indices.length - bottomFaceStart, 0);

  const topFaceStart = indices.length;
  const flt_main = cornerData.flt.sideArc.slice(-1)[0];
  const frt_main = cornerData.frt.frontArc.slice(-1)[0];
  const brt_main = cornerData.brt.sideArc.slice(-1)[0];
  const blt_main = cornerData.blt.frontArc.slice(-1)[0];
  addQuad(blt_main, brt_main, frt_main, flt_main);
  addGroup(topFaceStart, indices.length - topFaceStart, 0);

  // --- Connect Edges (Sides) ---
  const connectAndBuildSides = (c1_key: string, c2_key: string, isFrontBack: boolean) => {
    const c1 = cornerData[c1_key];
    const c2 = cornerData[c2_key];
    const arc1 = isFrontBack ? c1.frontArc : c1.sideArc;
    const arc2 = (isFrontBack ? c2.frontArc : c2.sideArc).slice().reverse();

    // Profiled Surface (Material 2)
    const profileFaceStart = indices.length;
    for (let i = 0; i < arc1.length - 1; i++) {
        addQuad(arc1[i], arc1[i+1], arc2[i+1], arc2[i]);
    }
    addGroup(profileFaceStart, indices.length - profileFaceStart, 2);

    // Flat Side Surface (Material 1)
    const flatSideStart = indices.length;
    addQuad(c1.base_bl, c2.base_bl, arc2[0], arc1[0]);
    addGroup(flatSideStart, indices.length - flatSideStart, 1);
  };

  connectAndBuildSides('flt', 'frt', true);  // front
  connectAndBuildSides('frt', 'brt', false); // right
  connectAndBuildSides('brt', 'blt', true);  // back
  connectAndBuildSides('blt', 'flt', false); // left

  // --- Finalize Geometry ---
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  groups.forEach(group => geometry.addGroup(group.start, group.count, group.materialIndex));
  geometry.computeVertexNormals();
  return geometry;
};


// --- React Component ---
const VisualizationCanvas = forwardRef<CanvasHandle, VisualizationProps>(({ dims, material, finish, profile, processedEdges, okapnikEdges }, ref) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const mainGroupRef = useRef<THREE.Group | null>(null);
  const textureCache = useRef<{ [key: string]: THREE.Texture }>({});

  const materials = useMemo(() => [
    new THREE.MeshPhysicalMaterial({ side: THREE.DoubleSide, metalness: 0.1, roughness: 0.8, clearcoat: 0, clearcoatRoughness: 0 }), // 0: Main (textured)
    new THREE.MeshPhysicalMaterial({ side: THREE.DoubleSide, metalness: 0.1, roughness: 0.8 }), // 1: Flat Sides
    new THREE.MeshPhysicalMaterial({ side: THREE.DoubleSide, metalness: 0.1, roughness: 0.7, clearcoat: 0, clearcoatRoughness: 0 }), // 2: Profile
  ], []);

  useImperativeHandle(ref, () => ({
    getSnapshot: () => {
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        const originalBackground = sceneRef.current.background;
        sceneRef.current.background = new THREE.Color(0xffffff); // White background for snapshot
        rendererRef.current.render(sceneRef.current, cameraRef.current);
        const dataUrl = rendererRef.current.domElement.toDataURL('image/png');
        sceneRef.current.background = originalBackground;
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
    
    // Checkerboard background
    const checkerboardCanvas = document.createElement('canvas');
    const size = 32;
    checkerboardCanvas.width = size * 2;
    checkerboardCanvas.height = size * 2;
    const context = checkerboardCanvas.getContext('2d');
    if (context) {
        context.fillStyle = 'hsl(220 13% 18%)';
        context.fillRect(0, 0, checkerboardCanvas.width, checkerboardCanvas.height);
        context.fillStyle = 'hsl(220 13% 22%)';
        context.fillRect(0, 0, size, size);
        context.fillRect(size, size, size, size);
    }
    const bgTexture = new THREE.CanvasTexture(checkerboardCanvas);
    bgTexture.wrapS = THREE.RepeatWrapping;
    bgTexture.wrapT = THREE.RepeatWrapping;
    bgTexture.repeat.set(100, 100);
    scene.background = bgTexture;

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

    scene.add(new THREE.AmbientLight(0xffffff, 2.5));
    const mainLight = new THREE.DirectionalLight(0xffffff, 2.0);
    mainLight.position.set(5, 10, 7.5);
    scene.add(mainLight);
    const fillLight = new THREE.DirectionalLight(0xffffff, 1.5);
    fillLight.position.set(-5, -5, -5);
    scene.add(fillLight);

    const mainGroup = new THREE.Group();
    mainGroupRef.current = mainGroup;
    scene.add(mainGroup);
    
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
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
      cancelAnimationFrame(animationFrameId);
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      Object.values(textureCache.current).forEach(t => t.dispose());
      materials.forEach(m => m.dispose());
    };
  }, [materials]);

  useEffect(() => {
    if (!sceneRef.current || !mainGroupRef.current || !material || !finish || !profile) return;
    
    const { length, width, height } = dims;
    const vizL = length / 100;
    const vizW = width / 100;
    const h = height / 100;
    
    // --- Update Materials ---
    const [originalMaterial, processedMaterial, profileMaterial] = materials;
    const baseColor = new THREE.Color(material.color || '#FFFFFF');
    
    originalMaterial.color = baseColor;
    processedMaterial.color = baseColor.clone().lerp(new THREE.Color(0x000000), 0.1);
    profileMaterial.color = baseColor.clone().lerp(new THREE.Color(0xffffff), 0.5);

    const finishName = finish.name.toLowerCase();
    if (finishName.includes('poliran')) {
        originalMaterial.roughness = 0.8;
        originalMaterial.clearcoat = 0;
    } else {
        originalMaterial.roughness = 0.9;
        originalMaterial.clearcoat = 0;
    }

    const textureUrl = material.texture;
    if (textureUrl && textureUrl !== originalMaterial.userData.url) {
      if (textureCache.current[textureUrl]) {
        originalMaterial.map = textureCache.current[textureUrl];
        originalMaterial.needsUpdate = true;
      } else {
        new THREE.TextureLoader().load(textureUrl, (texture) => {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(5 / Math.max(vizL, vizW), 5 / Math.max(vizL, vizW) * (vizW/vizL));
            originalMaterial.map = texture;
            originalMaterial.needsUpdate = true;
            textureCache.current[textureUrl] = texture;
        });
      }
    } else if(!textureUrl) {
      originalMaterial.map = null;
      originalMaterial.needsUpdate = true;
    }
    originalMaterial.userData.url = textureUrl;
    
    // --- Rebuild Scene ---
    while (mainGroupRef.current.children.length > 0) {
      const object = mainGroupRef.current.children[0];
      mainGroupRef.current.remove(object);
      object.traverse((node) => {
        if ((node as THREE.Mesh).isMesh) {
          (node as THREE.Mesh).geometry.dispose();
        }
      });
    }

    const geometry = generateSlabGeometry(vizL, vizW, h, profile, processedEdges);
    const mainObject = new THREE.Mesh(geometry, materials);
    
    const slabGroup = new THREE.Group();
    slabGroup.add(mainObject);
    
    // Okapnik
    const okapnikGrooveDepth = 0.5 / 100;
    const okapnikGrooveWidth = 0.8 / 100;
    const okapnikOffset = 2.0 / 100;
    const createOkapnik = (edgeL: number, vertical: boolean) => new THREE.Mesh(
      new THREE.BoxGeometry( vertical ? okapnikGrooveWidth : edgeL, okapnikGrooveDepth, vertical ? edgeL: okapnikGrooveWidth ),
      processedMaterial
    );
    
    if(okapnikEdges.front) slabGroup.add(createOkapnik(vizL, false)).position.set(0, -okapnikGrooveDepth/2, (vizW/2) - okapnikOffset);
    if(okapnikEdges.back) slabGroup.add(createOkapnik(vizL, false)).position.set(0, -okapnikGrooveDepth/2, -(vizW/2) + okapnikOffset);
    if(okapnikEdges.left) slabGroup.add(createOkapnik(vizW, true)).position.set(-(vizL/2) + okapnikOffset, -okapnikGrooveDepth/2, 0);
    if(okapnikEdges.right) slabGroup.add(createOkapnik(vizW, true)).position.set((vizL/2) - okapnikOffset, -okapnikGrooveDepth/2, 0);

    mainGroupRef.current.add(slabGroup);
    // No rotation
    slabGroup.position.y = -h / 2;

    if (cameraRef.current && controlsRef.current) {
        const box = new THREE.Box3().setFromObject(slabGroup);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = cameraRef.current.fov * (Math.PI / 180);
        let cameraZ = maxDim / (2 * Math.tan(fov / 2));
        
        cameraRef.current.position.set(center.x, center.y + cameraZ * 0.6, center.z + cameraZ * 1.2);
        controlsRef.current.target.copy(center);
        controlsRef.current.update();
    }
    
  }, [dims, material, finish, profile, processedEdges, okapnikEdges, materials]);

  return <div ref={mountRef} className="h-full w-full rounded-lg" data-ai-hint="stone slab 3d render" />;
});

VisualizationCanvas.displayName = 'VisualizationCanvas';
export default VisualizationCanvas;

    