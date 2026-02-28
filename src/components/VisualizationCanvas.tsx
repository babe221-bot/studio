
"use client";

import React, { useRef, useEffect, useImperativeHandle, forwardRef, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Material as MaterialType, SurfaceFinish, EdgeProfile, ProcessedEdges } from '@/types';

export interface VisualizationProps {
  dims: { length: number; width: number; height: number };
  material?: MaterialType;
  finish?: SurfaceFinish;
  profile?: EdgeProfile;
  processedEdges: ProcessedEdges;
  okapnikEdges: ProcessedEdges;
  showDimensions?: boolean;
  onCapture?: (dataUrl: string) => void;
}

export type CanvasHandle = {
  captureImage: () => string | null;
};

// Generate dimension labels as sprites
const createDimensionLabel = (text: string, size: number = 32) => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  canvas.width = 256;
  canvas.height = 64;

  // Background
  context.fillStyle = 'rgba(0, 0, 0, 0.7)';
  context.roundRect(0, 0, canvas.width, canvas.height, 8);
  context.fill();

  // Border
  context.strokeStyle = '#ffffff';
  context.lineWidth = 2;
  context.roundRect(2, 2, canvas.width - 4, canvas.height - 4, 6);
  context.stroke();

  // Text
  context.font = 'bold 24px Arial, sans-serif';
  context.fillStyle = '#ffffff';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(size * 4, size, 1);

  return sprite;
};

// This function is a more robust implementation for generating the slab geometry.
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
      path.push({ x: 0, y: 0 });
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

  pillars.bl[0] = backPath.map(p => addVertex(-halfL + p.x, p.y, -halfW));
  pillars.bl[1] = leftPath.map(p => addVertex(-halfL, p.y, -halfW + p.x));

  pillars.br[0] = backPath.map(p => addVertex(halfL - p.x, p.y, -halfW));
  pillars.br[1] = rightPath.map(p => addVertex(halfL, p.y, -halfW + p.x));

  pillars.fr[0] = frontPath.map(p => addVertex(halfL - p.x, p.y, halfW));
  pillars.fr[1] = rightPath.map(p => addVertex(halfL, p.y, halfW - p.x));

  pillars.fl[0] = frontPath.map(p => addVertex(-halfL + p.x, p.y, halfW));
  pillars.fl[1] = leftPath.map(p => addVertex(-halfL, p.y, halfW - p.x));

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

  stitch(pillars.bl[0], pillars.br[0], processedEdges.back);
  stitch(pillars.br[1], pillars.fr[1], processedEdges.right);
  stitch(pillars.fr[0], pillars.fl[0], processedEdges.front);
  stitch(pillars.fl[1], pillars.bl[1], processedEdges.left);

  // Corner Faces
  const stitchCorner = (p1: number[], p2: number[]) => {
    const len = Math.min(p1.length, p2.length);
    for (let i = 0; i < len - 1; i++) {
      addFace(p1[i], p1[i + 1], p2[i + 1]);
      addFace(p1[i], p2[i + 1], p2[i]);
    }
  };

  stitchCorner(pillars.fr[1], pillars.fr[0]);
  stitchCorner(pillars.fl[0], pillars.fl[1]);
  stitchCorner(pillars.bl[1], pillars.bl[0]);
  stitchCorner(pillars.br[0], pillars.br[1]);
  addGroup(2);

  // --- Finalize Geometry ---
  geometry.setIndex(indices);
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  groups.forEach(g => geometry.addGroup(g.start, g.count, g.materialIndex));
  geometry.computeVertexNormals();

  return geometry;
};

// --- React Component ---
const VisualizationCanvas = forwardRef<CanvasHandle, VisualizationProps>(
  ({ dims, material, finish, profile, processedEdges, okapnikEdges, showDimensions = false }, ref) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const mainGroupRef = useRef<THREE.Group | null>(null);
    const textureCache = useRef<{ [key: string]: THREE.Texture }>({});
    const dimensionGroupRef = useRef<THREE.Group | null>(null);

    const materials = useMemo(() => [
      new THREE.MeshPhysicalMaterial({
        side: THREE.DoubleSide,
        metalness: 0.1,
        roughness: 0.95,
        clearcoat: 0.3,
        clearcoatRoughness: 0.1
      }), // 0: Main (textured)
      new THREE.MeshPhysicalMaterial({
        side: THREE.DoubleSide,
        metalness: 0.1,
        roughness: 0.9,
        clearcoat: 0.2
      }), // 1: Flat Sides
      new THREE.MeshPhysicalMaterial({
        side: THREE.DoubleSide,
        metalness: 0.15,
        roughness: 0.8,
        clearcoat: 0.4
      }), // 2: Profile
    ], []);

    // Expose capture method
    useImperativeHandle(ref, () => ({
      captureImage: () => {
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
          return rendererRef.current.domElement.toDataURL('image/png');
        }
        return null;
      },
    }));

    // Initialize Three.js scene
    useEffect(() => {
      const currentMount = mountRef.current;
      if (!currentMount) return;

      const scene = new THREE.Scene();
      sceneRef.current = scene;

      // Create checkerboard background
      const checkerboardCanvas = document.createElement('canvas');
      const size = 32;
      checkerboardCanvas.width = size * 2;
      checkerboardCanvas.height = size * 2;
      const context = checkerboardCanvas.getContext('2d');
      if (context) {
        context.fillStyle = 'hsl(240 3.7% 12%)';
        context.fillRect(0, 0, checkerboardCanvas.width, checkerboardCanvas.height);
        context.fillStyle = 'hsl(240 3.7% 18%)';
        context.fillRect(0, 0, size, size);
        context.fillRect(size, size, size, size);
      }
      const bgTexture = new THREE.CanvasTexture(checkerboardCanvas);
      bgTexture.wrapS = THREE.RepeatWrapping;
      bgTexture.wrapT = THREE.RepeatWrapping;
      bgTexture.repeat.set(100, 100);
      scene.background = bgTexture;

      // Camera setup
      const camera = new THREE.PerspectiveCamera(
        45,
        currentMount.clientWidth / currentMount.clientHeight,
        0.1,
        1000
      );
      camera.position.set(5, 4, 5);
      cameraRef.current = camera;

      // Renderer setup with shadows
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        preserveDrawingBuffer: true,
        alpha: true
      });
      renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      currentMount.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // Controls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.minDistance = 1;
      controls.maxDistance = 20;
      controls.target.set(0, 0, 0);
      controlsRef.current = controls;

      // Enhanced lighting
      // Ambient light
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
      scene.add(ambientLight);

      // Main directional light with shadows
      const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
      mainLight.position.set(5, 10, 5);
      mainLight.castShadow = true;
      mainLight.shadow.mapSize.width = 2048;
      mainLight.shadow.mapSize.height = 2048;
      mainLight.shadow.camera.near = 0.5;
      mainLight.shadow.camera.far = 50;
      mainLight.shadow.camera.left = -10;
      mainLight.shadow.camera.right = 10;
      mainLight.shadow.camera.top = 10;
      mainLight.shadow.camera.bottom = -10;
      mainLight.shadow.bias = -0.0001;
      scene.add(mainLight);

      // Fill light
      const fillLight = new THREE.DirectionalLight(0xccddff, 0.5);
      fillLight.position.set(-5, 3, -5);
      scene.add(fillLight);

      // Rim light for edge highlighting
      const rimLight = new THREE.DirectionalLight(0xffeedd, 0.4);
      rimLight.position.set(0, 5, -8);
      scene.add(rimLight);

      // Ground plane with shadow receiving
      const groundGeometry = new THREE.PlaneGeometry(50, 50);
      const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        roughness: 0.8,
        metalness: 0.2
      });
      const ground = new THREE.Mesh(groundGeometry, groundMaterial);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.5;
      ground.receiveShadow = true;
      scene.add(ground);

      // Main group for the slab
      const mainGroup = new THREE.Group();
      mainGroupRef.current = mainGroup;
      scene.add(mainGroup);

      // Dimension labels group
      const dimensionGroup = new THREE.Group();
      dimensionGroupRef.current = dimensionGroup;
      scene.add(dimensionGroup);

      // Animation loop
      let animationFrameId: number;
      const animate = () => {
        animationFrameId = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      // Resize handler
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

    // Update slab geometry and materials
    useEffect(() => {
      if (!sceneRef.current || !mainGroupRef.current || !material || !finish || !profile) return;

      const { length, width, height } = dims;
      const vizL = length / 100;
      const vizW = width / 100;
      const h = height / 100;

      const [mainMaterial, sideMaterial, profileMaterial] = materials;
      const baseColor = new THREE.Color(material.color || '#FFFFFF');

      mainMaterial.color = baseColor;
      sideMaterial.color = baseColor.clone().lerp(new THREE.Color(0x000000), 0.15);
      profileMaterial.color = baseColor.clone().lerp(new THREE.Color(0xffffff), 0.3);

      const finishName = finish.name.toLowerCase();
      const isPolished = finishName.includes('poliran');
      const isHoned = finishName.includes('brus');
      const isFlamed = finishName.includes('plamen');

      if (isPolished) {
        mainMaterial.roughness = 0.1;
        mainMaterial.metalness = 0.2;
        mainMaterial.clearcoat = 1.0;
        mainMaterial.clearcoatRoughness = 0.1;
      } else if (isHoned) {
        mainMaterial.roughness = 0.4;
        mainMaterial.metalness = 0.1;
        mainMaterial.clearcoat = 0.3;
      } else if (isFlamed) {
        mainMaterial.roughness = 0.9;
        mainMaterial.metalness = 0.05;
        mainMaterial.clearcoat = 0;
      } else {
        mainMaterial.roughness = 0.6;
        mainMaterial.metalness = 0.1;
        mainMaterial.clearcoat = 0.2;
      }

      sideMaterial.roughness = 0.8;
      profileMaterial.roughness = 0.7;

      // Load texture
      const textureUrl = material.texture;
      if (textureUrl && textureUrl !== mainMaterial.userData.url) {
        if (textureCache.current[textureUrl]) {
          mainMaterial.map = textureCache.current[textureUrl];
          mainMaterial.needsUpdate = true;
        } else {
          new THREE.TextureLoader().load(textureUrl, (texture) => {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(5 / Math.max(vizL, vizW), 5 / Math.max(vizL, vizW) * (vizW / vizL));
            mainMaterial.map = texture;
            mainMaterial.needsUpdate = true;
            textureCache.current[textureUrl] = texture;
          });
        }
      } else if (!textureUrl) {
        mainMaterial.map = null;
        mainMaterial.needsUpdate = true;
      }
      mainMaterial.userData.url = textureUrl;

      // Clear existing objects
      while (mainGroupRef.current.children.length > 0) {
        const object = mainGroupRef.current.children[0];
        mainGroupRef.current.remove(object);
        object.traverse((node) => {
          if ((node as THREE.Mesh).isMesh) {
            (node as THREE.Mesh).geometry.dispose();
          }
        });
      }

      // Create slab geometry
      const geometry = generateSlabGeometry(vizL, vizW, h, profile, processedEdges);
      const mainObject = new THREE.Mesh(geometry, materials);
      mainObject.castShadow = true;
      mainObject.receiveShadow = true;

      const slabGroup = new THREE.Group();
      slabGroup.add(mainObject);

      // Add okapnik grooves
      const okapnikGrooveDepth = 0.5 / 100;
      const okapnikGrooveWidth = 0.8 / 100;
      const okapnikOffset = 2.0 / 100;
      const createOkapnik = (edgeL: number, vertical: boolean) => new THREE.Mesh(
        new THREE.BoxGeometry(
          vertical ? okapnikGrooveWidth : edgeL,
          okapnikGrooveDepth,
          vertical ? edgeL : okapnikGrooveWidth
        ),
        sideMaterial
      );

      if (okapnikEdges.front) {
        const okapnik = createOkapnik(vizL, false);
        okapnik.position.set(0, -okapnikGrooveDepth / 2, (vizW / 2) - okapnikOffset);
        slabGroup.add(okapnik);
      }
      if (okapnikEdges.back) {
        const okapnik = createOkapnik(vizL, false);
        okapnik.position.set(0, -okapnikGrooveDepth / 2, -(vizW / 2) + okapnikOffset);
        slabGroup.add(okapnik);
      }
      if (okapnikEdges.left) {
        const okapnik = createOkapnik(vizW, true);
        okapnik.position.set(-(vizL / 2) + okapnikOffset, -okapnikGrooveDepth / 2, 0);
        slabGroup.add(okapnik);
      }
      if (okapnikEdges.right) {
        const okapnik = createOkapnik(vizW, true);
        okapnik.position.set((vizL / 2) - okapnikOffset, -okapnikGrooveDepth / 2, 0);
        slabGroup.add(okapnik);
      }

      mainGroupRef.current.add(slabGroup);

      // Center camera on object
      if (controlsRef.current) {
        controlsRef.current.target.set(0, h / 2, 0);
        controlsRef.current.update();
      }

    }, [dims, material, finish, profile, processedEdges, okapnikEdges, materials]);

    // Update dimension labels
    useEffect(() => {
      if (!dimensionGroupRef.current || !sceneRef.current) return;

      // Clear existing dimension labels
      while (dimensionGroupRef.current.children.length > 0) {
        dimensionGroupRef.current.remove(dimensionGroupRef.current.children[0]);
      }

      if (!showDimensions) return;

      const { length, width, height } = dims;
      const vizL = length / 100;
      const vizW = width / 100;
      const h = height / 100;

      // Length label
      const lengthLabel = createDimensionLabel(`${length} cm`);
      lengthLabel.position.set(0, h + 0.3, vizW / 2 + 0.3);
      dimensionGroupRef.current.add(lengthLabel);

      // Width label
      const widthLabel = createDimensionLabel(`${width} cm`);
      widthLabel.position.set(-vizL / 2 - 0.3, h + 0.3, 0);
      dimensionGroupRef.current.add(widthLabel);

      // Height label
      const heightLabel = createDimensionLabel(`${height} cm`);
      heightLabel.position.set(vizL / 2 + 0.3, h / 2, -vizW / 2 - 0.3);
      dimensionGroupRef.current.add(heightLabel);

    }, [dims, showDimensions]);

    return (
      <div
        ref={mountRef}
        className="w-full h-full min-h-[400px]"
        style={{ touchAction: 'none' }}
      />
    );
  }
);

VisualizationCanvas.displayName = 'VisualizationCanvas';

export default VisualizationCanvas;
