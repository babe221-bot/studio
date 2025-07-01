
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

    const addVertex = (x: number, y: number, z: number) => {
        vertices.push(x, y, z);
        return vIdx++;
    };
    const addFace = (v1: number, v2: number, v3: number) => indices.push(v1, v2, v3);
    const addQuad = (v1: number, v2: number, v3: number, v4: number) => {
        addFace(v1, v2, v3);
        addFace(v1, v3, v4);
    };
    const addGroup = (start: number, count: number, materialIndex: number) => {
        if (count > 0) groups.push({ start, count, materialIndex });
    };

    const profileName = profile.name.toLowerCase();
    const smusMatch = profileName.match(/smuš c([\d.]+)/);
    const poluRMatch = profileName.match(/polu-zaobljena r([\d.]+)cm/);
    const punoRMatch = profileName.match(/puno-zaobljena r([\d.]+)cm/);

    let profileType: 'chamfer' | 'half-round' | 'full-round' | 'none' = 'none';
    let R = 0;
    const segments = 16;
    const halfL = L / 2;
    const halfW = W / 2;

    if (smusMatch) {
        profileType = 'chamfer';
        // Profile name has value in mm, convert to meters
        const val_m = parseFloat(smusMatch[1]) / 1000;
        R = Math.min(val_m, H, L / 2, W / 2);
    } else if (poluRMatch) {
        profileType = 'half-round';
        // Profile name has value in cm, convert to meters
        const val_m = parseFloat(poluRMatch[1]) / 100;
        R = Math.min(val_m, H);
    } else if (punoRMatch) {
        profileType = 'full-round';
        // Radius is half the height
        R = H / 2;
    }

    if (R <= 1e-6) {
        profileType = 'none';
        R = 0;
    }
    
    const corners = {
        flt: { x: -halfL, z: halfW, procX: processedEdges.left, procZ: processedEdges.front, signX: -1, signZ: 1 },
        frt: { x: halfL, z: halfW, procX: processedEdges.right, procZ: processedEdges.front, signX: 1, signZ: 1 },
        brt: { x: halfL, z: -halfW, procX: processedEdges.right, procZ: processedEdges.back, signX: 1, signZ: -1 },
        blt: { x: -halfL, z: -halfW, procX: processedEdges.left, procZ: processedEdges.back, signX: -1, signZ: -1 },
    };

    const cornerData: any = {};
    const topFacePoints: any = {};

    for (const key in corners) {
        const c = corners[key as keyof typeof corners];
        const { x, z, procX, procZ, signX, signZ } = c;
        const data: any = { base_bl: addVertex(x, 0, z) };

        const hasProfile = profileType !== 'none';
        const hasProfileX = hasProfile && procX;
        const hasProfileZ = hasProfile && procZ;
        
        const genArc = (r: number, yCenter: number, startAngle: number, endAngle: number, angleOffset: number) => {
            const arc = [];
            for (let i = 0; i <= segments; i++) {
                const angle = startAngle + (i / segments) * (endAngle - startAngle);
                const vx = x - signX * r * Math.cos(angle) * Math.cos(angleOffset);
                const vy = yCenter + r * Math.sin(angle);
                const vz = z - signZ * r * Math.cos(angle) * Math.sin(angleOffset);
                arc.push(addVertex(vx, vy, vz));
            }
            return arc;
        };
        
        if (profileType === 'chamfer') {
            data.top_corner = addVertex(x, H, z);
            data.side_profile = hasProfileX ? [addVertex(x, H - R, z), addVertex(x - signX * R, H, z)] : [addVertex(x, H, z)];
            data.front_profile = hasProfileZ ? [addVertex(x, H - R, z), addVertex(x - signX * R, H, z)] : [addVertex(x, H, z)]; // Placeholder, needs fixing
            
            const pBase = addVertex(x, H-R, z);
            const pSide = hasProfileX ? addVertex(x - signX*R, H, z) : addVertex(x, H, z);
            const pFront = hasProfileZ ? addVertex(x, H, z - signZ*R) : addVertex(x, H, z);
            
            data.side_profile = [pBase, pSide];
            data.front_profile = [pBase, pFront];
            
            topFacePoints[key] = addVertex(x - (hasProfileX ? signX * R : 0), H, z - (hasProfileZ ? signZ * R : 0));

        } else if (profileType.includes('round')) {
            const isFull = profileType === 'full-round';
            const r = isFull ? H / 2 : R;
            const yCenter = isFull ? H / 2 : H - r;
            const startAngle = isFull ? Math.PI : Math.PI / 2;
            const endAngle = isFull ? 0 : Math.PI / 2;
            
            const genCornerArc = () => {
                const cornerGrid = [];
                for(let i=0; i<=segments; i++) { // vertical slices
                    const row = [];
                    const angle_v = startAngle - (i / segments) * (startAngle - endAngle);
                    const r_h = r * Math.cos(angle_v);
                    const y = yCenter + r * Math.sin(angle_v);
                    for (let j = 0; j <= segments; j++) { // horizontal slices
                        const angle_h = (j / segments) * (Math.PI / 2);
                        const vx = x - signX * r_h * Math.cos(angle_h);
                        const vz = z - signZ * r_h * Math.sin(angle_h);
                        row.push(addVertex(vx, y, vz));
                    }
                    cornerGrid.push(row);
                }
                return cornerGrid;
            };

            if (hasProfileX && hasProfileZ) {
                data.corner_grid = genCornerArc();
                data.side_profile = data.corner_grid.map((row:any) => row[segments]);
                data.front_profile = data.corner_grid[0];
                topFacePoints[key] = data.side_profile[0];
            } else if (hasProfileX) {
                 data.side_profile = genArc(r, yCenter, startAngle, endAngle, Math.PI/2).reverse();
                 data.front_profile = Array(segments + 1).fill(addVertex(x,H,z));
                 topFacePoints[key] = data.side_profile[0];
            } else if (hasProfileZ) {
                 data.front_profile = genArc(r, yCenter, startAngle, endAngle, 0);
                 data.side_profile = Array(segments + 1).fill(addVertex(x,H,z));
                 topFacePoints[key] = data.front_profile[segments];
            } else {
                 data.top_corner = addVertex(x,H,z);
                 data.side_profile = [data.top_corner];
                 data.front_profile = [data.top_corner];
                 topFacePoints[key] = data.top_corner;
            }

        } else { // No profile
            data.top_corner = addVertex(x, H, z);
            data.side_profile = [data.top_corner];
            data.front_profile = [data.top_corner];
            topFacePoints[key] = data.top_corner;
        }
        cornerData[key] = data;
    }
    
    // 2. Build Faces
    let groupStart = indices.length;
    addQuad(cornerData.blt.base_bl, cornerData.brt.base_bl, cornerData.frt.base_bl, cornerData.flt.base_bl);
    addGroup(groupStart, indices.length - groupStart, 0); // Bottom face

    groupStart = indices.length;
    addQuad(topFacePoints.blt, topFacePoints.brt, topFacePoints.frt, topFacePoints.flt);
    addGroup(groupStart, indices.length - groupStart, 0); // Top face

    const buildSide = (c1_key: string, c2_key: string, isFront: boolean, isProcessed: boolean) => {
        const c1 = cornerData[c1_key];
        const c2 = cornerData[c2_key];
        const profile1 = (isFront ? c1.front_profile : c1.side_profile).slice().reverse();
        const profile2 = (isFront ? c2.front_profile : c2.side_profile);

        // Flat part of the side
        groupStart = indices.length;
        if (!isProcessed || profileType === 'none') {
             addQuad(c1.base_bl, c2.base_bl, c2.top_corner, c1.top_corner);
        } else {
            addQuad(c1.base_bl, c2.base_bl, profile2[profile2.length - 1], profile1[0]);
        }
        addGroup(groupStart, indices.length - groupStart, 1);
        
        // Profiled part
        groupStart = indices.length;
        if (isProcessed && profile1.length > 1) {
            for (let i = 0; i < profile1.length - 1; i++) {
                addQuad(profile1[i], profile2[i], profile2[i + 1], profile1[i + 1]);
            }
        }
        addGroup(groupStart, indices.length - groupStart, 2);
    };

    buildSide('flt', 'frt', true, processedEdges.front); // Front
    buildSide('frt', 'brt', false, processedEdges.right); // Right
    buildSide('brt', 'blt', true, processedEdges.back); // Back
    buildSide('blt', 'flt', false, processedEdges.left); // Left

    groupStart = indices.length;
    for (const key in corners) {
        const c = corners[key as keyof typeof corners];
        const data = cornerData[key];
        if (c.procX && c.procZ && data.corner_grid) { // Rounded corner
            for (let i = 0; i < segments; i++) {
                for (let j = 0; j < segments; j++) {
                    addQuad(
                        data.corner_grid[i][j+1],
                        data.corner_grid[i][j],
                        data.corner_grid[i + 1][j],
                        data.corner_grid[i + 1][j+1]
                    );
                }
            }
        } else if (c.procX && c.procZ && profileType === 'chamfer') {
             addFace(data.side_profile[0], data.front_profile[1], data.side_profile[1]);
        }
    }
    addGroup(groupStart, indices.length - groupStart, 2);
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
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
      okapnik.position.set(0, -h / 2, (vizW / 2) - okapnikOffset);
      slabGroup.add(okapnik);
    }
    if (okapnikEdges.back) {
      const okapnik = createOkapnik(vizL, false);
      okapnik.position.set(0, -h / 2, -(vizW / 2) + okapnikOffset);
      slabGroup.add(okapnik);
    }
    if (okapnikEdges.left) {
      const okapnik = createOkapnik(vizW, true);
      okapnik.position.set(-(vizL / 2) + okapnikOffset, -h / 2, 0);
      slabGroup.add(okapnik);
    }
    if (okapnikEdges.right) {
      const okapnik = createOkapnik(vizW, true);
      okapnik.position.set((vizL / 2) - okapnikOffset, -h / 2, 0);
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
        
        cameraRef.current.position.set(center.x, center.y + cameraZ * 0.6, center.z + cameraZ * 1.2);
        controlsRef.current.target.copy(center);
        controlsRef.current.update();
    }
    
  }, [dims, material, finish, profile, processedEdges, okapnikEdges, materials]);

  return <div ref={mountRef} className="h-full w-full rounded-lg" data-ai-hint="stone slab 3d render" />;
});

VisualizationCanvas.displayName = 'VisualizationCanvas';
export default VisualizationCanvas;
