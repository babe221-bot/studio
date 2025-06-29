
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
      const blb_corner = addVertex(x, 0, z);

      if (profileType === 'none' || (!procX && !procZ)) {
          const top_v = addVertex(x, H, z);
          cornerData.sideArc = [top_v];
          cornerData.frontArc = [top_v];
      } else if (profileType === 'chamfer') {
          const top_v_main = addVertex(x, H, z);
          const topX = procX ? x - signX * R : x;
          const topZ = procZ ? z - signZ * R : z;
          const chamfer_v_top = addVertex(topX, H, topZ);
          const chamfer_v_side = addVertex(x, H-R, z);
          
          if (procX && procZ) {
              cornerData.sideArc = [chamfer_v_top, chamfer_v_side];
              cornerData.frontArc = [chamfer_v_top, chamfer_v_side];
          } else if (procX) {
              cornerData.sideArc = [chamfer_v_top, chamfer_v_side];
              cornerData.frontArc = [top_v_main];
          } else { // procZ
              cornerData.frontArc = [chamfer_v_top, chamfer_v_side];
              cornerData.sideArc = [top_v_main];
          }
      } else { // half-round or full-round
        const isFullRound = profileType === 'full-round';
        const radius = isFullRound ? H / 2 : R;
        const yCenter = isFullRound ? H / 2 : H - radius;
        
        const genArc = (arcSignX: number, arcSignZ: number) => {
            const arc: number[] = [];
            const startAngle = isFullRound ? -Math.PI / 2 : 0;
            const endAngle = Math.PI / 2;
            for (let i = 0; i <= segments; i++) {
                const angle = startAngle + (i/segments) * (endAngle - startAngle);
                const vx = x - arcSignX * radius * (1 - Math.cos(angle));
                const vy = yCenter + radius * Math.sin(angle);
                const vz = z - arcSignZ * radius * (1 - Math.cos(angle));
                arc.push(addVertex(vx, vy, vz));
            }
            return arc;
        }

        if (procX && procZ) {
            const cornerGrid: number[][] = [];
            const startAngle = isFullRound ? -Math.PI / 2 : 0;
            const endAngle = Math.PI / 2;
            
            for (let i = 0; i <= segments; i++) {
                const row: number[] = [];
                const theta = startAngle + (i / segments) * (endAngle - startAngle);
                const d_v = radius * Math.sin(theta);
                const d_h = radius * (1-Math.cos(theta));

                for (let j = 0; j <= segments; j++) {
                    const phi = (j / segments) * (Math.PI / 2);
                    const vx = x - signX * d_h * (1-Math.cos(phi));
                    const vy = yCenter + d_v;
                    const vz = z - signZ * d_h * (1-Math.sin(phi));
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
                sideArc.push(cornerGrid[i][segments]);
                frontArc.push(cornerGrid[i][0]);
            }
            cornerData.sideArc = sideArc;
            cornerData.frontArc = frontArc;

        } else if (procZ) { // Front/Back edge only
            cornerData.frontArc = genArc(0, signZ);
            cornerData.sideArc = [addVertex(x, H, z)];
        } else { // procX - Left/Right edge only
            cornerData.sideArc = genArc(signX, 0);
            cornerData.frontArc = [addVertex(x, H, z)];
        }
      }
      cornerData.bottomVertex = blb_corner;
      topCorners[key] = cornerData;
  });

  const flt_main_v_idx = topCorners.flt.frontArc[0];
  const frt_main_v_idx = topCorners.frt.frontArc[0];
  const brt_main_v_idx = topCorners.brt.sideArc[0];
  const blt_main_v_idx = topCorners.blt.sideArc[0];

  const flt_main = vertices.slice(flt_main_v_idx*3, flt_main_v_idx*3 + 3);
  const frt_main = vertices.slice(frt_main_v_idx*3, frt_main_v_idx*3 + 3);
  const brt_main = vertices.slice(brt_main_v_idx*3, brt_main_v_idx*3 + 3);
  const blt_main = vertices.slice(blt_main_v_idx*3, blt_main_v_idx*3 + 3);
  
  const topPlane = new THREE.Shape();
  topPlane.moveTo(flt_main[0], flt_main[2]);
  topPlane.lineTo(frt_main[0], frt_main[2]);
  topPlane.lineTo(brt_main[0], brt_main[2]);
  topPlane.lineTo(blt_main[0], blt_main[2]);
  topPlane.closePath();
  
  const topGeom = new THREE.ShapeGeometry(topPlane);
  const topVertices = topGeom.attributes.position.array;
  for(let i=0; i < topVertices.length/3; i++){
      topVertices[i*3+1] = H; 
  }
  
  const tempGeom = new THREE.BufferGeometry();
  tempGeom.setAttribute('position', new THREE.BufferAttribute(topVertices, 3));
  tempGeom.setIndex(Array.from(topGeom.index.array));
  tempGeom.computeVertexNormals();

  const existingVertices = vIdx;
  vertices.push(...Array.from(tempGeom.attributes.position.array));
  const newIndices = Array.from(tempGeom.index.array).map(i => i + existingVertices);
  indices.push(...newIndices);

  geometry.addGroup(currentFaceIndex, newIndices.length, 0);
  currentFaceIndex += newIndices.length;

  const connectEdges = (c1_key: string, c2_key: string, isXEdge: boolean) => {
    const c1 = topCorners[c1_key];
    const c2 = topCorners[c2_key];
    const arc1_top = isXEdge ? c1.frontArc : c1.sideArc;
    const arc2_top = (isXEdge ? c2.frontArc : c2.sideArc).slice().reverse();
    
    const arc1 = [...arc1_top, c1.bottomVertex];
    const arc2 = [...arc2_top, c2.bottomVertex];

    const startIndex = indices.length;
    
    if (arc1.length != arc2.length) {
      console.warn("Mismatched arc lengths for edge connection, using simple connection", c1_key, c2_key);
      addQuad(arc1[0], arc1[arc1.length-1], arc2[arc2.length-1], arc2[0]);
    } else {
      for (let i = 0; i < arc1.length - 1; i++) {
        addQuad(arc1[i], arc1[i + 1], arc2[i + 1], arc2[i]);
      }
    }

    const count = indices.length - startIndex;
    if (count > 0) {
      geometry.addGroup(startIndex, count, 1);
    }
  };

  connectEdges('flt', 'frt', true);  // front
  connectEdges('frt', 'brt', false); // right
  connectEdges('brt', 'blt', true);  // back
  connectEdges('blt', 'flt', false); // left

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
    
    const checkerboardCanvas = document.createElement('canvas');
    const size = 32;
    checkerboardCanvas.width = size * 2;
    checkerboardCanvas.height = size * 2;
    const context = checkerboardCanvas.getContext('2d');
    if (context) {
        context.fillStyle = 'hsl(220 13% 94%)';
        context.fillRect(0, 0, checkerboardCanvas.width, checkerboardCanvas.height);
        context.fillStyle = 'hsl(220 13% 88%)';
        context.fillRect(0, 0, size, size);
        context.fillRect(size, size, size, size);
    }
    const texture = new THREE.CanvasTexture(checkerboardCanvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(50, 50);
    scene.background = texture;


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

    const ambientLight = new THREE.AmbientLight(0xffffff, 2.5); 
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 2.0);
    mainLight.position.set(5, 10, 7.5);
    scene.add(mainLight);
    
    const fillLight = new THREE.DirectionalLight(0xffffff, 1.5);
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

    const vizL = length / 100;
    const vizW = width / 100;
    const h = height / 100;

    const vizProcessedEdges = processedEdges;
    const vizOkapnikEdges = okapnikEdges;

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
        color: material.color ? new THREE.Color(material.color) : 0xffffff,
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
    slabGroup.position.y = 0;

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
