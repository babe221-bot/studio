
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

// This function is a more robust implementation for generating the slab geometry.
// It builds the object from distinct parts: top, bottom, sides, and profile strips,
// ensuring that there are no gaps or holes.
const generateSlabGeometry = (
    L: number, W: number, H: number,
    profile: EdgeProfile,
    processedEdges: ProcessedEdges
) => {
    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const indices: number[] = [];
    const groups: { start: number; count: number; materialIndex: number }[] = [];
    let vertexCursor = 0;
    
    // --- Helper Functions ---
    const addVertex = (x: number, y: number, z: number) => {
        vertices.push(x, y, z);
        return vertexCursor++;
    };
    const addFace = (v1: number, v2: number, v3: number) => indices.push(v1, v2, v3);
    const addQuad = (v1: number, v2: number, v3: number, v4: number) => {
        addFace(v1, v2, v3);
        addFace(v1, v3, v4);
    };
    let groupIndicesCount = 0;
    const addGroup = (materialIndex: number) => {
        const count = indices.length - groupIndicesCount;
        if (count > 0) {
            groups.push({ start: groupIndicesCount, count, materialIndex });
        }
        groupIndicesCount = indices.length;
    };

    // --- Profile Calculation ---
    const profileName = profile.name.toLowerCase();
    const smusMatch = profileName.match(/smuš c([\d.]+)/);
    const poluRMatch = profileName.match(/polu-zaobljena r([\d.]+)cm/);
    const punoRMatch = profileName.match(/puno-zaobljena r([\d.]+)cm/);

    let R = 0;
    const profileSegments = 8;
    
    if (smusMatch) { // Chamfer
        R = parseFloat(smusMatch[1]) / 1000; // mm to m
    } else if (poluRMatch) { // Half-round
        R = parseFloat(poluRMatch[1]) / 100; // cm to m
    } else if (punoRMatch) { // Full-round
        R = H / 2;
    }

    // Clamp radius to prevent geometry errors
    R = Math.min(R, H / (punoRMatch ? 1 : 2), L / 2, W / 2);
    if (R < 1e-6) R = 0;

    // --- Cross-section Path Definition ---
    const getPath = (isProcessed: boolean) => {
        if (!isProcessed || R === 0) {
            return [{ x: 0, y: 0 }, { x: 0, y: H }];
        }
        const path = [{ x: 0, y: 0 }];
        if (smusMatch) {
            path.push({ x: 0, y: H - R });
            path.push({ x: -R, y: H });
        } else if (poluRMatch) {
            const yCenter = H - R;
            path.push({ x: 0, y: yCenter });
            for (let i = 0; i <= profileSegments; i++) {
                const angle = (Math.PI / 2) * (i / profileSegments);
                path.push({ x: -R * Math.cos(angle), y: yCenter + R * Math.sin(angle) });
            }
        } else if (punoRMatch) {
            const yCenter = H / 2;
            path.push({ x: 0, y: 0 }); // Re-add bottom point for full round
            for (let i = 0; i <= profileSegments; i++) {
                const angle = Math.PI * (i / profileSegments);
                path.push({ x: -R * Math.cos(angle), y: yCenter + R * Math.sin(angle) });
            }
        }
        return path;
    };
    
    // --- Define the 4 corner "pillars" by creating transformed vertex paths ---
    const halfL = L / 2;
    const halfW = W / 2;
    const pillars: { [key: string]: number[][] } = {
        bl: [], br: [], fr: [], fl: []
    };
    
    const frontPath = getPath(processedEdges.front);
    const backPath = getPath(processedEdges.back);
    const leftPath = getPath(processedEdges.left);
    const rightPath = getPath(processedEdges.right);
    
    pillars.bl[0] = backPath.map(p => addVertex(-halfL + p.x, p.y, -halfW)); // Back edge at left corner
    pillars.bl[1] = leftPath.map(p => addVertex(-halfL, p.y, -halfW + p.x)); // Left edge at back corner
    
    pillars.br[0] = backPath.map(p => addVertex(halfL - p.x, p.y, -halfW)); // Back edge at right corner
    pillars.br[1] = rightPath.map(p => addVertex(halfL, p.y, -halfW + p.x)); // Right edge at back corner
    
    pillars.fr[0] = frontPath.map(p => addVertex(halfL - p.x, p.y, halfW)); // Front edge at right corner
    pillars.fr[1] = rightPath.map(p => addVertex(halfL, p.y, halfW - p.x)); // Right edge at front corner
    
    pillars.fl[0] = frontPath.map(p => addVertex(-halfL + p.x, p.y, halfW)); // Front edge at left corner
    pillars.fl[1] = leftPath.map(p => addVertex(-halfL, p.y, halfW - p.x)); // Left edge at front corner

    // --- Build Faces ---
    // Bottom Face (Material 0)
    addQuad(pillars.bl[0][0], pillars.br[0][0], pillars.fr[1][0], pillars.fl[1][0]);
    addGroup(0);

    // Top Face (Material 0)
    const tl = pillars.fl[0][pillars.fl[0].length - 1];
    const tr = pillars.fr[0][pillars.fr[0].length - 1];
    const br = pillars.br[0][pillars.br[0].length - 1];
    const bl = pillars.bl[0][pillars.bl[0].length - 1];
    addQuad(bl, br, tr, tl);
    addGroup(0);
    
    // Side and Profile Faces
    const stitch = (p1: number[], p2: number[], isProfile: boolean) => {
        const len = Math.min(p1.length, p2.length);
        for (let i = 0; i < len - 1; i++) {
            addQuad(p1[i], p2[i], p2[i + 1], p1[i + 1]);
        }
        addGroup(isProfile ? 2 : 1);
    };
    
    stitch(pillars.bl[0], pillars.br[0], processedEdges.back);   // Back
    stitch(pillars.br[1], pillars.fr[1], processedEdges.right);  // Right
    stitch(pillars.fr[0], pillars.fl[0], processedEdges.front);  // Front
    stitch(pillars.fl[1], pillars.bl[1], processedEdges.left);   // Left

    // Corner Faces (The part that fixes the holes)
    const stitchCorner = (p1: number[], p2: number[]) => {
       const len = Math.min(p1.length, p2.length);
       for (let i = 0; i < len - 1; i++) {
           addFace(p1[i], p1[i + 1], p2[i + 1]);
           addFace(p1[i], p2[i+1], p2[i]);
       }
    };
    
    stitchCorner(pillars.fr[1], pillars.fr[0]); // front-right corner
    stitchCorner(pillars.fl[0], pillars.fl[1]); // front-left corner
    stitchCorner(pillars.bl[1], pillars.bl[0]); // back-left corner
    stitchCorner(pillars.br[0], pillars.br[1]); // back-right corner
    addGroup(2);

    // --- Finalize Geometry ---
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    groups.forEach(g => geometry.addGroup(g.start, g.count, g.materialIndex));
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
    new THREE.MeshPhysicalMaterial({ side: THREE.DoubleSide, metalness: 0.1, roughness: 0.95 }), // 0: Main (textured)
    new THREE.MeshPhysicalMaterial({ side: THREE.DoubleSide, metalness: 0.1, roughness: 0.9 }), // 1: Flat Sides
    new THREE.MeshPhysicalMaterial({ side: THREE.DoubleSide, metalness: 0.1, roughness: 0.8 }), // 2: Profile
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
    
    const checkerboardCanvas = document.createElement('canvas');
    const size = 32;
    checkerboardCanvas.width = size * 2;
    checkerboardCanvas.height = size * 2;
    const context = checkerboardCanvas.getContext('2d');
    if (context) {
        context.fillStyle = 'hsl(240 3.7% 15.9%)';
        context.fillRect(0, 0, checkerboardCanvas.width, checkerboardCanvas.height);
        context.fillStyle = 'hsl(240 3.7% 20%)';
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
    
    const [mainMaterial, sideMaterial, profileMaterial] = materials;
    const baseColor = new THREE.Color(material.color || '#FFFFFF');
    
    mainMaterial.color = baseColor;
    sideMaterial.color = baseColor.clone().lerp(new THREE.Color(0x000000), 0.1);
    profileMaterial.color = baseColor.clone().lerp(new THREE.Color(0xffffff), 0.5);

    const finishName = finish.name.toLowerCase();
    const isPolished = finishName.includes('poliran');
    
    mainMaterial.roughness = isPolished ? 0.9 : 0.95;
    sideMaterial.roughness = 0.9;
    profileMaterial.roughness = 0.8;
    mainMaterial.clearcoat = 0;
    sideMaterial.clearcoat = 0;
    profileMaterial.clearcoat = 0;


    const textureUrl = material.texture;
    if (textureUrl && textureUrl !== mainMaterial.userData.url) {
      if (textureCache.current[textureUrl]) {
        mainMaterial.map = textureCache.current[textureUrl];
        mainMaterial.needsUpdate = true;
      } else {
        new THREE.TextureLoader().load(textureUrl, (texture) => {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(5 / Math.max(vizL, vizW), 5 / Math.max(vizL, vizW) * (vizW/vizL));
            mainMaterial.map = texture;
            mainMaterial.needsUpdate = true;
            textureCache.current[textureUrl] = texture;
        });
      }
    } else if(!textureUrl) {
      mainMaterial.map = null;
      mainMaterial.needsUpdate = true;
    }
    mainMaterial.userData.url = textureUrl;
    
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
    
    const okapnikGrooveDepth = 0.5 / 100;
    const okapnikGrooveWidth = 0.8 / 100;
    const okapnikOffset = 2.0 / 100;
    const createOkapnik = (edgeL: number, vertical: boolean) => new THREE.Mesh(
      new THREE.BoxGeometry( vertical ? okapnikGrooveWidth : edgeL, okapnikGrooveDepth, vertical ? edgeL: okapnikGrooveWidth ),
      sideMaterial
    );
    
    if (okapnikEdges.front) {
      const okapnik = createOkapnik(vizL, false);
      okapnik.position.set(0, -okapnikGrooveDepth/2, (vizW / 2) - okapnikOffset);
      slabGroup.add(okapnik);
    }
    if (okapnikEdges.back) {
      const okapnik = createOkapnik(vizL, false);
      okapnik.position.set(0, -okapnikGrooveDepth/2, -(vizW / 2) + okapnikOffset);
      slabGroup.add(okapnik);
    }
    if (okapnikEdges.left) {
      const okapnik = createOkapnik(vizW, true);
      okapnik.position.set(-(vizL / 2) + okapnikOffset, -okapnikGrooveDepth/2, 0);
      slabGroup.add(okapnik);
    }
    if (okapnikEdges.right) {
      const okapnik = createOkapnik(vizW, true);
      okapnik.position.set((vizL / 2) - okapnikOffset, -okapnikGrooveDepth/2, 0);
      slabGroup.add(okapnik);
    }

    mainGroupRef.current.add(slabGroup);
    slabGroup.position.y = h / 2;

    if (cameraRef.current && controlsRef.current) {
        const box = new THREE.Box3().setFromObject(slabGroup);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = cameraRef.current.fov * (Math.PI / 180);
        let cameraZ = maxDim / (2 * Math.tan(fov / 2));
        
        // Don't zoom in too close
        cameraZ = Math.max(cameraZ, maxDim * 1.2);

        cameraRef.current.position.set(center.x, center.y + cameraZ * 0.6, center.z + cameraZ * 1.2);
        controlsRef.current.target.copy(center);
        controlsRef.current.update();
    }
    
  }, [dims, material, finish, profile, processedEdges, okapnikEdges, materials]);

  return <div ref={mountRef} className="h-full w-full rounded-lg" data-ai-hint="stone slab 3d render" />;
});

VisualizationCanvas.displayName = 'VisualizationCanvas';
export default VisualizationCanvas;

    