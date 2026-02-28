
"use client";

import React, { useRef, useEffect, useImperativeHandle, forwardRef, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
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

// --------------------------------------------------------------------------
// Dimension label sprites
// --------------------------------------------------------------------------
const createDimensionLabel = (text: string, size: number = 32) => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  canvas.width = 256;
  canvas.height = 64;

  context.fillStyle = 'rgba(0, 0, 0, 0.75)';
  context.roundRect(0, 0, canvas.width, canvas.height, 8);
  context.fill();

  context.strokeStyle = 'rgba(255,255,255,0.5)';
  context.lineWidth = 1.5;
  context.roundRect(2, 2, canvas.width - 4, canvas.height - 4, 6);
  context.stroke();

  context.font = 'bold 22px "Inter", Arial, sans-serif';
  context.fillStyle = '#ffffff';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(size * 4, size, 1);
  return sprite;
};

// --------------------------------------------------------------------------
// Procedural normal map generator for rough stone surfaces
// --------------------------------------------------------------------------
const generateProceduralNormalMap = (roughnessLevel: number, seed: number): THREE.CanvasTexture => {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Neutral normal (flat surface) = RGB(128, 128, 255)
  ctx.fillStyle = 'rgb(128,128,255)';
  ctx.fillRect(0, 0, size, size);

  // Add noise bumps proportional to roughness
  const numBumps = Math.floor(roughnessLevel * 2000);
  for (let i = 0; i < numBumps; i++) {
    const t = i / numBumps;
    const x = ((Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453) % 1 + 1) % 1 * size;
    const z = ((Math.cos(seed * 39.3468 + i * 21.441) * 12345.678) % 1 + 1) % 1 * size;
    const r = 1 + roughnessLevel * 5;
    const nx = Math.sin(i * 1.234) * roughnessLevel * 40 + 128;
    const ny = Math.cos(i * 2.678) * roughnessLevel * 40 + 128;
    ctx.fillStyle = `rgb(${Math.round(nx)},${Math.round(ny)},255)`;
    ctx.beginPath();
    ctx.ellipse(x, z, r, r * (0.5 + t * 0.5), i * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  return tex;
};

// --------------------------------------------------------------------------
// PBR presets per surface finish
// --------------------------------------------------------------------------
interface FinishPreset {
  roughness: number;
  metalness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  sheen: number;
  sheenRoughness: number;
  normalStrength: number; // 0 = no normal map, 1 = full strength
}

const getFinishPreset = (finishName: string): FinishPreset => {
  const n = finishName.toLowerCase();
  if (n.includes('poliran') || n.includes('polished')) {
    return { roughness: 0.05, metalness: 0.05, clearcoat: 1.0, clearcoatRoughness: 0.02, sheen: 0.0, sheenRoughness: 0.5, normalStrength: 0.0 };
  }
  if (n.includes('bruš') || n.includes('honed')) {
    return { roughness: 0.35, metalness: 0.05, clearcoat: 0.4, clearcoatRoughness: 0.2, sheen: 0.0, sheenRoughness: 0.5, normalStrength: 0.3 };
  }
  if (n.includes('četk') || n.includes('brushed')) {
    return { roughness: 0.45, metalness: 0.1, clearcoat: 0.2, clearcoatRoughness: 0.4, sheen: 0.3, sheenRoughness: 0.5, normalStrength: 0.4 };
  }
  if (n.includes('plamen') || n.includes('flamed')) {
    return { roughness: 0.92, metalness: 0.0, clearcoat: 0.0, clearcoatRoughness: 1.0, sheen: 0.0, sheenRoughness: 1.0, normalStrength: 0.9 };
  }
  if (n.includes('pjeskaren') || n.includes('sandblast')) {
    return { roughness: 0.88, metalness: 0.0, clearcoat: 0.0, clearcoatRoughness: 1.0, sheen: 0.0, sheenRoughness: 1.0, normalStrength: 0.8 };
  }
  if (n.includes('bućardan') || n.includes('bush')) {
    return { roughness: 0.85, metalness: 0.0, clearcoat: 0.0, clearcoatRoughness: 1.0, sheen: 0.2, sheenRoughness: 0.8, normalStrength: 0.85 };
  }
  if (n.includes('štokovan') || n.includes('tooled')) {
    return { roughness: 0.8, metalness: 0.0, clearcoat: 0.0, clearcoatRoughness: 1.0, sheen: 0.1, sheenRoughness: 0.9, normalStrength: 0.75 };
  }
  if (n.includes('antico') || n.includes('antiqued')) {
    return { roughness: 0.5, metalness: 0.05, clearcoat: 0.3, clearcoatRoughness: 0.5, sheen: 0.3, sheenRoughness: 0.6, normalStrength: 0.5 };
  }
  if (n.includes('martelan') || n.includes('martellina')) {
    return { roughness: 0.75, metalness: 0.0, clearcoat: 0.05, clearcoatRoughness: 0.8, sheen: 0.2, sheenRoughness: 0.7, normalStrength: 0.7 };
  }
  if (n.includes('pilano') || n.includes('sawn')) {
    return { roughness: 0.7, metalness: 0.0, clearcoat: 0.0, clearcoatRoughness: 1.0, sheen: 0.0, sheenRoughness: 1.0, normalStrength: 0.55 };
  }
  // Default / bez obrade
  return { roughness: 0.65, metalness: 0.05, clearcoat: 0.1, clearcoatRoughness: 0.5, sheen: 0.0, sheenRoughness: 0.5, normalStrength: 0.2 };
};

// --------------------------------------------------------------------------
// Component
// --------------------------------------------------------------------------
const VisualizationCanvas = forwardRef<CanvasHandle, VisualizationProps>(
  ({ dims, material, finish, profile, processedEdges, okapnikEdges, showDimensions = false }, ref) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const mainGroupRef = useRef<THREE.Group | null>(null);
    const dimensionGroupRef = useRef<THREE.Group | null>(null);
    const textureCache = useRef<{ [key: string]: THREE.Texture }>({});
    const normalMapCache = useRef<{ [key: string]: THREE.CanvasTexture }>({});

    // Three base materials — shared, updated in place
    const materials = useMemo(() => [
      new THREE.MeshPhysicalMaterial({ side: THREE.FrontSide, metalness: 0.05, roughness: 0.6 }),   // 0: Main (top)
      new THREE.MeshPhysicalMaterial({ side: THREE.FrontSide, metalness: 0.05, roughness: 0.75 }),   // 1: Sides
      new THREE.MeshPhysicalMaterial({ side: THREE.FrontSide, metalness: 0.05, roughness: 0.65 }),   // 2: Profile
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

    // ── Scene Initialisation ────────────────────────────────────────────────
    useEffect(() => {
      const currentMount = mountRef.current;
      if (!currentMount) return;

      const scene = new THREE.Scene();
      sceneRef.current = scene;

      // Checkerboard background
      const cbCanvas = document.createElement('canvas');
      const sq = 32;
      cbCanvas.width = cbCanvas.height = sq * 2;
      const cbCtx = cbCanvas.getContext('2d');
      if (cbCtx) {
        cbCtx.fillStyle = 'hsl(240 3.7% 11%)';
        cbCtx.fillRect(0, 0, cbCanvas.width, cbCanvas.height);
        cbCtx.fillStyle = 'hsl(240 3.7% 16%)';
        cbCtx.fillRect(0, 0, sq, sq);
        cbCtx.fillRect(sq, sq, sq, sq);
      }
      const bgTex = new THREE.CanvasTexture(cbCanvas);
      bgTex.wrapS = bgTex.wrapT = THREE.RepeatWrapping;
      bgTex.repeat.set(80, 80);
      scene.background = bgTex;

      // Camera
      const camera = new THREE.PerspectiveCamera(42, currentMount.clientWidth / currentMount.clientHeight, 0.05, 500);
      camera.position.set(5, 3.5, 5);
      cameraRef.current = camera;

      // Renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
      renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.4;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      currentMount.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // Environment map (room environment for realistic reflections)
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      pmremGenerator.compileEquirectangularShader();
      const envTexture = pmremGenerator.fromScene(new RoomEnvironment(0.5)).texture;
      scene.environment = envTexture;
      pmremGenerator.dispose();

      // OrbitControls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.07;
      controls.minDistance = 0.5;
      controls.maxDistance = 30;
      controls.target.set(0, 0, 0);
      controlsRef.current = controls;

      // ── Studio Lighting ──
      // Soft ambient (environment drives most ambient)
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
      scene.add(ambientLight);

      // Key light — warm, high angle
      const keyLight = new THREE.DirectionalLight(0xFFFAF0, 1.6);
      keyLight.position.set(4, 9, 4);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(4096, 4096);
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 50;
      keyLight.shadow.camera.left = -6;
      keyLight.shadow.camera.right = 6;
      keyLight.shadow.camera.top = 6;
      keyLight.shadow.camera.bottom = -6;
      keyLight.shadow.bias = -0.0005;
      scene.add(keyLight);

      // Fill light — cool, opposite side
      const fillLight = new THREE.DirectionalLight(0xC8D8FF, 0.55);
      fillLight.position.set(-5, 3, -3);
      scene.add(fillLight);

      // Rim light — pure white, behind and above
      const rimLight = new THREE.DirectionalLight(0xFFFFFF, 0.7);
      rimLight.position.set(0, 5, -9);
      scene.add(rimLight);

      // Bottom bounce light — subtle warm fill from below
      const bounceLight = new THREE.DirectionalLight(0xFFEECC, 0.25);
      bounceLight.position.set(0, -3, 2);
      scene.add(bounceLight);

      // Ground plane
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(60, 60),
        new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9, metalness: 0.1 })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.5;
      ground.receiveShadow = true;
      scene.add(ground);

      const mainGroup = new THREE.Group();
      mainGroupRef.current = mainGroup;
      scene.add(mainGroup);

      const dimensionGroup = new THREE.Group();
      dimensionGroupRef.current = dimensionGroup;
      scene.add(dimensionGroup);

      // Animation loop
      let animId: number;
      const animate = () => {
        animId = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      const handleResize = () => {
        if (!currentMount || !cameraRef.current || !rendererRef.current) return;
        cameraRef.current.aspect = currentMount.clientWidth / currentMount.clientHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(currentMount.clientWidth, currentMount.clientHeight);
      };
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animId);
        if (currentMount && renderer.domElement.parentNode === currentMount) {
          currentMount.removeChild(renderer.domElement);
        }
        envTexture.dispose();
        Object.values(textureCache.current).forEach(t => t.dispose());
        Object.values(normalMapCache.current).forEach(t => t.dispose());
        materials.forEach(m => m.dispose());
        renderer.dispose();
      };
    }, [materials]);

    // ── Slab Geometry & Materials ───────────────────────────────────────────
    useEffect(() => {
      if (!sceneRef.current || !mainGroupRef.current || !material || !finish || !profile) return;

      const { length, width, height } = dims;
      const vizL = length / 100;
      const vizW = width / 100;
      const h = height / 100;

      const [mainMat, sideMat, profileMat] = materials;
      const baseColor = new THREE.Color(material.color || '#CCCCCC');
      const darkerColor = baseColor.clone().lerp(new THREE.Color(0x000000), 0.18);
      const lighterColor = baseColor.clone().lerp(new THREE.Color(0xffffff), 0.25);

      mainMat.color = baseColor;
      sideMat.color = darkerColor;
      profileMat.color = lighterColor;

      // Apply PBR finish preset to main face
      const preset = getFinishPreset(finish.name);
      mainMat.roughness = preset.roughness;
      mainMat.metalness = preset.metalness;
      mainMat.clearcoat = preset.clearcoat;
      mainMat.clearcoatRoughness = preset.clearcoatRoughness;
      mainMat.sheen = preset.sheen;
      mainMat.sheenRoughness = preset.sheenRoughness;

      // Side and profile share a modified preset (slightly rougher than top)
      const sideRoughness = Math.min(preset.roughness + 0.12, 1.0);
      sideMat.roughness = sideRoughness;
      sideMat.metalness = preset.metalness * 0.5;
      sideMat.clearcoat = preset.clearcoat * 0.4;
      sideMat.clearcoatRoughness = preset.clearcoatRoughness;
      profileMat.roughness = Math.max(preset.roughness - 0.05, 0.05);
      profileMat.metalness = preset.metalness;
      profileMat.clearcoat = preset.clearcoat * 0.8;
      profileMat.clearcoatRoughness = preset.clearcoatRoughness;

      // Normal map for surface microdetail (only for rough finishes)
      if (preset.normalStrength > 0.05) {
        const nmKey = `${material.id}-${finish.id}`;
        if (!normalMapCache.current[nmKey]) {
          normalMapCache.current[nmKey] = generateProceduralNormalMap(preset.normalStrength, material.id);
        }
        const nm = normalMapCache.current[nmKey];
        mainMat.normalMap = nm;
        mainMat.normalScale.set(preset.normalStrength, preset.normalStrength);
      } else {
        mainMat.normalMap = null;
      }
      mainMat.needsUpdate = true;

      // Load or reuse colour texture
      const textureUrl = material.texture;
      const loadTexture = (url: string) => {
        if (textureCache.current[url]) {
          applyTexture(textureCache.current[url]);
        } else {
          new THREE.TextureLoader().load(url, (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            tex.anisotropy = rendererRef.current?.capabilities.getMaxAnisotropy() ?? 4;
            textureCache.current[url] = tex;
            applyTexture(tex);
          });
        }
      };

      const applyTexture = (tex: THREE.Texture) => {
        // Physical scale: one tile every 30cm
        const tileSizeM = 0.30;
        tex.repeat.set(vizL / tileSizeM, vizW / tileSizeM);
        tex.needsUpdate = true;
        mainMat.map = tex;
        mainMat.needsUpdate = true;
      };

      if (textureUrl) {
        loadTexture(textureUrl);
      } else {
        mainMat.map = null;
        mainMat.needsUpdate = true;
      }
      mainMat.userData.url = textureUrl;

      // ── Spawn geometry worker ──
      const worker = new Worker(new URL('@/workers/geometryWorker.ts', import.meta.url));
      worker.postMessage({ L: vizL, W: vizW, H: h, profile, processedEdges, okapnikEdges });

      worker.onmessage = (e) => {
        const { positions, uvs, indices, groups } = e.data;
        if (!mainGroupRef.current) return;

        // Clear old meshes
        while (mainGroupRef.current.children.length > 0) {
          const obj = mainGroupRef.current.children[0];
          mainGroupRef.current.remove(obj);
          obj.traverse(node => {
            if ((node as THREE.Mesh).isMesh) {
              (node as THREE.Mesh).geometry.dispose();
            }
          });
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        if (uvs) geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        geometry.setIndex(new THREE.BufferAttribute(indices, 1));
        groups.forEach((g: { start: number; count: number; materialIndex: number }) =>
          geometry.addGroup(g.start, g.count, g.materialIndex)
        );
        geometry.computeVertexNormals();

        const mesh = new THREE.Mesh(geometry, materials);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.position.y = 0; // bottom sits at y=0

        mainGroupRef.current.add(mesh);

        // Reposition camera target to the centre of the slab
        if (controlsRef.current) {
          controlsRef.current.target.set(0, h / 2, 0);
          controlsRef.current.update();
        }

        worker.terminate();
      };

      return () => worker.terminate();

    }, [dims, material, finish, profile, processedEdges, okapnikEdges, materials]);

    // ── Dimension Labels ────────────────────────────────────────────────────
    useEffect(() => {
      if (!dimensionGroupRef.current) return;
      while (dimensionGroupRef.current.children.length > 0) {
        dimensionGroupRef.current.remove(dimensionGroupRef.current.children[0]);
      }
      if (!showDimensions) return;

      const { length, width, height } = dims;
      const vizL = length / 100, vizW = width / 100, h = height / 100;

      const lengthLabel = createDimensionLabel(`${length} cm`);
      lengthLabel.position.set(0, h + 0.35, vizW / 2 + 0.35);
      dimensionGroupRef.current.add(lengthLabel);

      const widthLabel = createDimensionLabel(`${width} cm`);
      widthLabel.position.set(-vizL / 2 - 0.35, h + 0.35, 0);
      dimensionGroupRef.current.add(widthLabel);

      const heightLabel = createDimensionLabel(`${height} cm`);
      heightLabel.position.set(vizL / 2 + 0.35, h / 2, -vizW / 2 - 0.35);
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
