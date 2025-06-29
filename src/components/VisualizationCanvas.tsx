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
  let R = 0; // Radius or chamfer size
  const roundSegments = 5;

  if (smusMatch) {
    profileType = 'chamfer';
    R = parseFloat(smusMatch[1]) / 1000; // cmm to cm
  } else if (poluRMatch) {
    profileType = 'half-round';
    R = parseFloat(poluRMatch[1]);
  } else if (punoRMatch) {
    profileType = 'full-round';
    R = parseFloat(punoRMatch[1]);
  }
  
  R = Math.min(R, H, W/2, L/2);

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

  // Create vertices
  const points: { [key: string]: number } = {};

  const halfL = L / 2;
  const halfW = W / 2;

  // Bottom face
  points.blb = addVertex(-halfL, 0, -halfW); // back-left-bottom
  points.brb = addVertex( halfL, 0, -halfW); // back-right-bottom
  points.frb = addVertex( halfL, 0,  halfW); // front-right-bottom
  points.flb = addVertex(-halfL, 0,  halfW); // front-left-bottom

  const createTopVertices = (cx: number, cz: number, pE1: boolean, pE2: boolean) => {
    const signX = Math.sign(cx);
    const signZ = Math.sign(cz);

    if (profileType === 'none' || (!pE1 && !pE2)) {
      return { corner: addVertex(cx, H, cz) };
    }
    if (profileType === 'chamfer') {
      const v_top = addVertex(cx - signX * R, H, cz - signZ * R);
      const v_edge1 = addVertex(cx, H - R, cz - signZ * R);
      const v_edge2 = addVertex(cx - signX * R, H - R, cz);
      return { corner: v_top, edge1: v_edge1, edge2: v_edge2 };
    }
    if (profileType === 'half-round' || profileType === 'full-round') {
        const center_x = cx - signX * R;
        const center_z = cz - signZ * R;
        const pts: number[] = [];
        const isFullRound = profileType === 'full-round';
        const startAngle = Math.PI / 2;
        const endAngle = isFullRound ? -Math.PI / 2 : 0;
        
        for (let i = 0; i <= roundSegments; i++) {
            const angle = startAngle + (i / roundSegments) * (endAngle - startAngle);
            const vx = center_x + R * Math.cos(angle);
            const vy = (isFullRound ? H - R : H) + R * Math.sin(angle);
            const vz = center_z;
            pts.push(addVertex(vx, vy, vz));
        }

        if (pE1 && pE2) { // Corner case
            const cornerPoints: { [key: string]: number[] } = { main: [] };
            for (let i = 0; i <= roundSegments; i++) {
                const angle = Math.PI/2 + (i / roundSegments) * (Math.PI/2);
                const r_slice = R * Math.cos(angle);
                const y_slice = H - R * Math.sin(angle);
                
                cornerPoints.main.push(addVertex(cx - signX*r_slice, y_slice, cz - signZ*r_slice));
            }
            return { corner: cornerPoints.main };
        } else if (pE1) { // single edge
            const pts: number[] = [];
            for (let i = 0; i <= roundSegments; i++) {
              const angle = Math.PI / 2;
              const y = isFullRound ? H - R + R * Math.sin(angle * i/roundSegments) : H - R * (1-Math.cos(angle * i/roundSegments));
              const z_offset = R * (1 - Math.cos(angle * i/roundSegments));
              pts.push(addVertex(cx, y, cz - signZ*z_offset));
            }
            return { corner: pts };
        } else { // pE2
            const pts: number[] = [];
             for (let i = 0; i <= roundSegments; i++) {
              const angle = Math.PI / 2;
              const y = isFullRound ? H - R + R * Math.sin(angle * i/roundSegments) : H - R * (1-Math.cos(angle * i/roundSegments));
              const x_offset = R * (1 - Math.cos(angle * i/roundSegments));
              pts.push(addVertex(cx - signX*x_offset, y, cz));
            }
            return { corner: pts };
        }
    }
    return { corner: addVertex(cx, H, cz) };
  };

  const flt = createTopVertices(-halfL, halfW, processedEdges.front, processedEdges.left);
  const frt = createTopVertices(halfL, halfW, processedEdges.front, processedEdges.right);
  const blt = createTopVertices(-halfL, -halfW, processedEdges.back, processedEdges.left);
  const brt = createTopVertices(halfL, -halfW, processedEdges.back, processedEdges.right);

  // Build faces
  addQuad(points.blb, points.brb, points.frb, points.flb); // Bottom
  
  const connectCorners = (c1_data: any, c2_data: any, isEdge1: boolean, isVertical: boolean) => {
    const c1 = Array.isArray(c1_data.corner) ? c1_data.corner : [c1_data.corner];
    const c2 = Array.isArray(c2_data.corner) ? c2_data.corner : [c2_data.corner];
    
    for (let i = 0; i < Math.max(c1.length, c2.length) - 1; i++) {
        const i1 = Math.min(i, c1.length - 1);
        const i2 = Math.min(i, c2.length - 1);
        const i1_next = Math.min(i + 1, c1.length - 1);
        const i2_next = Math.min(i + 1, c2.length - 1);
        
        if (isVertical) addQuad(c1[i1], c2[i2], c2[i2_next], c1[i1_next]);
        else addQuad(c2[i2], c1[i1], c1[i1_next], c2[i2_next]);
    }
  };
  
  if (profileType === 'none' || profileType === 'chamfer') {
    const c_flt = (flt as any).corner; const c_frt = (frt as any).corner;
    const c_blt = (blt as any).corner; const c_brt = (brt as any).corner;
    addQuad(c_blt, c_brt, c_frt, c_flt); // Top main face
  } else {
    connectCorners(blt, brt, true, false); // Top
    connectCorners(brt, frt, false, true);
    connectCorners(frt, flt, true, false);
    connectCorners(flt, blt, false, true);
  }

  // Side faces
  const connectSide = (c_top_data: any, c_bottom: number, pEdge: boolean) => {
      if (Array.isArray(c_top_data.corner)) {
          for (let i = 0; i < c_top_data.corner.length - 1; i++) {
              addQuad(c_bottom, c_top_data.corner[i+1], c_top_data.corner[i], c_bottom);
          }
      } else {
         addQuad(c_bottom, c_top_data.corner, c_top_data.corner, c_bottom);
      }
  }

  // Back
  addQuad(points.blb, brt.corner, brt.edge2 || brt.corner, points.brb);
  addQuad(points.brb, blt.edge2 || blt.corner, blt.corner, points.blb);
  
  // Front
  addQuad(points.flb, frt.corner, frt.edge2 || frt.corner, points.frb);
  addQuad(points.frb, flt.edge2 || flt.corner, flt.corner, points.flb);

  // Left
  addQuad(points.blb, flt.corner, flt.edge1 || flt.corner, points.flb);
  addQuad(points.flb, blt.edge1 || blt.corner, blt.corner, points.blb);
  
  // Right
  addQuad(points.brb, frt.corner, frt.edge1 || frt.corner, points.frb);
  addQuad(points.frb, brt.edge1 || brt.corner, brt.corner, points.brb);

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
    
    const { length, width, height } = dims;
    const scale = 100;

    const shouldSwap = width > length;
    const vizL = (shouldSwap ? width : length) / scale;
    const vizW = (shouldSwap ? length : width) / scale;
    const h = height / scale;

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
        metalness: 0.05,
        roughness: 0.8,
        clearcoat: 0.0,
        clearcoatRoughness: 0.5,
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
    
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xffd700, linewidth: 3 });
    const edgePoints: THREE.Vector3[] = [];
    
    const halfL = vizL/2; const halfW = vizW/2;
    if (vizProcessedEdges.front) { edgePoints.push(new THREE.Vector3(-halfL, 0, halfW), new THREE.Vector3(halfL, 0, halfW)); }
    if (vizProcessedEdges.back) { edgePoints.push(new THREE.Vector3(-halfL, 0, -halfW), new THREE.Vector3(halfL, 0, -halfW)); }
    if (vizProcessedEdges.left) { edgePoints.push(new THREE.Vector3(-halfL, 0, -halfW), new THREE.Vector3(-halfL, 0, halfW)); }
    if (vizProcessedEdges.right) { edgePoints.push(new THREE.Vector3(halfL, 0, -halfW), new THREE.Vector3(halfL, 0, halfW)); }
    
    if (edgePoints.length > 0) {
      const edgeGeometry = new THREE.BufferGeometry().setFromPoints(edgePoints);
      const edgeLines = new THREE.LineSegments(edgeGeometry, edgeMaterial);
      edgeLines.position.y = h;
      slabGroup.add(edgeLines);
    }
    
    const okapnikMaterial = new THREE.LineBasicMaterial({ color: 0x00ffff, linewidth: 2 });
    const okapnikPoints: THREE.Vector3[] = [];
    const okapnikOffset = 2.0 / scale;
    
    if(vizOkapnikEdges.front) { okapnikPoints.push(new THREE.Vector3(-halfL + okapnikOffset, 0, halfW - okapnikOffset), new THREE.Vector3(halfL - okapnikOffset, 0, halfW - okapnikOffset)); }
    if(vizOkapnikEdges.back) { okapnikPoints.push(new THREE.Vector3(-halfL + okapnikOffset, 0, -halfW + okapnikOffset), new THREE.Vector3(halfL - okapnikOffset, 0, -halfW + okapnikOffset)); }
    if(vizOkapnikEdges.left) { okapnikPoints.push(new THREE.Vector3(-halfL + okapnikOffset, 0, -halfW + okapnikOffset), new THREE.Vector3(-halfL + okapnikOffset, 0, halfW - okapnikOffset)); }
    if(vizOkapnikEdges.right) { okapnikPoints.push(new THREE.Vector3(halfL - okapnikOffset, 0, -halfW + okapnikOffset), new THREE.Vector3(halfL - okapnikOffset, 0, halfW - okapnikOffset)); }

    if (okapnikPoints.length > 0) {
      const okapnikLinesGeom = new THREE.BufferGeometry().setFromPoints(okapnikPoints);
      const okapnikLines = new THREE.LineSegments(okapnikLinesGeom, okapnikMaterial);
      slabGroup.add(okapnikLines);
    }

    mainGroupRef.current.add(slabGroup);

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
