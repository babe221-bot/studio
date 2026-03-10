# Research: Advanced CAD Export (OBJ, STL, FBX, GLTF)

**Project:** Stone Slab Configurator  
**Researched:** March 10, 2026  
**Domain:** 3D CAD Export Pipeline  
**Overall Confidence:** HIGH

## Executive Summary

This research addresses implementing advanced CAD export functionality for a Next.js + FastAPI stone slab configurator using Three.js. The application requires exporting 3D models in standard CAD formats (OBJ, STL, FBX, GLTF) with support for quality settings, mesh simplification, multi-part exports, and file compression.

**Key Finding:** Three.js provides native exporters for all required formats (OBJ, STL, GLTF). For FBX, community solutions exist but require additional dependencies. The architecture should prioritize client-side export for immediate responsiveness, with server-side Blender fallback for advanced features and batch processing.

---

## 1. Format Analysis

### 1.1 STL Format (Stereolithography)

**Purpose:** 3D printing, rapid prototyping, CAM workflows  
**Format Types:** ASCII (human-readable) and Binary (compact)

| Aspect            | ASCII                 | Binary               |
| ----------------- | --------------------- | -------------------- |
| File Size         | Large                 | ~50-60% smaller      |
| Readability       | Editable              | Binary only          |
| Three.js Support  | Yes (`binary: false`) | Yes (`binary: true`) |
| Manufacturing Use | Rare                  | Standard             |

**Three.js Implementation:**

```javascript
import { STLExporter } from 'three/addons/exporters/STLExporter.js';

const exporter = new STLExporter();
const result = exporter.parse(mesh, { binary: true });
// result is ArrayBuffer for binary, string for ASCII
```

**Stone Slab Use Case:** Primary format for CNC machining and 3D printing quotes. Binary STL is the industry standard.

### 1.2 OBJ Format (Wavefront)

**Purpose:** CAD interchange, rendering software, CAD tools  
**Characteristics:** Text-based, vertex/normal/UV coordinates, optional MTL material file

| Aspect           | Details                       |
| ---------------- | ----------------------------- |
| File Size        | Large (no compression)        |
| Material Support | Via separate MTL file         |
| Three.js Support | Geometry only (no MTL export) |
| Compatibility    | Universal                     |

**Three.js Implementation:**

```javascript
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';

const exporter = new OBJExporter();
const result = exporter.parse(scene);
// result is string (OBJ format)
```

**Stone Slab Use Case:** Legacy CAD software compatibility, manual editing in MeshLab, Blender import.

### 1.3 GLTF/GLB Format (Khronos Group)

**Purpose:** Web 3D, real-time rendering, AR/VR  
**Characteristics:** Binary (GLB) or JSON-based (GLTF), supports materials PBR, animations, scenes

| Aspect           | Details                    |
| ---------------- | -------------------------- |
| File Size        | Compressed, very efficient |
| Material Support | Full PBR                   |
| Three.js Support | Comprehensive              |
| Web Use          | Primary format             |

**Three.js Implementation:**

```javascript
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

const exporter = new GLTFExporter();
const options = {
  binary: true, // GLB output
  onlyVisible: true,
  truncateDrawRange: true,
  maxTextureSize: 4096,
};
exporter.parse(
  scene,
  (gltf) => {
    // gltf is ArrayBuffer (binary) or object (GLTF)
  },
  options
);
```

**Stone Slab Use Case:** Web viewer integration, AR previews, CAD software that supports glTF (Revit, Fusion 360).

### 1.4 FBX Format

**Purpose:** Game engines, animation, professional CAD  
**Characteristics:** Binary format, supports materials, animations, hierarchy

**Status:** Three.js does NOT include an FBX exporter. Options:

| Solution              | Pros                    | Cons                           |
| --------------------- | ----------------------- | ------------------------------ |
| FBX SDK (Autodesk)    | Official, full support  | Requires registration, C++ SDK |
| `fbx exporter` npm    | Pure JS                 | Limited features, may lag      |
| Server-side (Blender) | Reliable, full features | Requires server processing     |

**Recommendation:** Use Blender as server-side converter for FBX export (see Section 3).

---

## 2. Export Pipeline Architecture

### 2.1 Hybrid Architecture: Client-Side + Server-Side

```
┌─────────────────────────────────────────────────────────────────┐
│                    STONE SLAB CONFIGURATOR                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐     ┌──────────────────┐     ┌─────────────┐  │
│  │   Frontend  │────▶│   Export Service  │────▶│   Backend   │  │
│  │  (Three.js) │     │    (In-Browser)   │     │  (FastAPI)  │  │
│  └─────────────┘     └──────────────────┘     └─────────────┘  │
│         │                     │                       │          │
│         ▼                     ▼                       ▼          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   EXPORT PIPELINE                        │   │
│  │                                                          │   │
│  │  Client-Side:          │   Server-Side (Blender):       │   │
│  │  ├─ STL (Binary)      │   ├─ STL (high-precision)      │   │
│  │  ├─ OBJ               │   ├─ OBJ (with MTL)           │   │
│  │  ├─ GLTF/GLB          │   ├─ FBX                      │   │
│  │  └─ Simplification    │   ├─ STEP/IGES                │   │
│  │                       │   └─ Batch processing         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Client-Side Export Flow

```typescript
// src/lib/export/CADExporter.ts
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

export type ExportFormat = 'stl' | 'obj' | 'gltf' | 'glb' | 'fbx';

export interface ExportOptions {
  format: ExportFormat;
  binary?: boolean; // STL: ASCII vs binary
  quality?: 'low' | 'medium' | 'high';
  simplify?: number; // Target triangle count reduction (0-1)
  includeTextures?: boolean; // GLTF: include embedded textures
  splitParts?: boolean; // Export each slab separately
  compression?: 'none' | 'gzip' | 'zip';
}

export class CADExporter {
  private exporters = {
    stl: new STLExporter(),
    obj: new OBJExporter(),
    gltf: new GLTFExporter(),
    glb: new GLTFExporter(), // Same class, different options
  };

  async export(scene: THREE.Scene, options: ExportOptions): Promise<Blob> {
    // 1. Prepare geometry (simplify if needed)
    const processedScene = await this.prepareGeometry(scene, options);

    // 2. Select exporter
    const exporter = this.exporters[options.format];

    // 3. Export based on format
    let result: string | ArrayBuffer;
    switch (options.format) {
      case 'stl':
        result = exporter.parse(processedScene, {
          binary: options.binary !== false,
        });
        break;
      case 'obj':
        result = exporter.parse(processedScene);
        break;
      case 'gltf':
      case 'glb':
        result = await this.exportGLTF(processedScene, options);
        break;
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }

    // 4. Compress if requested
    return this.compress(result, options.compression || 'none', options.format);
  }

  private async prepareGeometry(
    scene: THREE.Scene,
    options: ExportOptions
  ): Promise<THREE.Object3D> {
    if (!options.simplify || options.simplify <= 0) {
      return scene;
    }

    // Import SimplifyModifier dynamically (heavy operation)
    const { SimplifyModifier } =
      await import('three/addons/modifiers/SimplifyModifier.js');

    const modifier = new SimplifyModifier();
    const simplified = modifier.modify(
      scene.geometry,
      Math.floor(
        scene.geometry.attributes.position.count * (1 - options.simplify)
      )
    );

    return simplified;
  }

  private compress(
    data: string | ArrayBuffer,
    type: string,
    format: ExportFormat
  ): Blob {
    // Implementation uses CompressionStream API or fflate library
    // Returns final Blob with correct MIME type
  }
}
```

### 2.3 Server-Side Export Flow

For advanced exports requiring Blender:

```python
# backend/app/services/cad_export_service.py

import subprocess
import tempfile
import base64
import os
from pathlib import Path
from typing import Dict, Any, List, Optional

class CADExportService:
    """Server-side CAD export using Blender for advanced formats."""

    SUPPORTED_FORMATS = ['stl', 'obj', 'fbx', 'gltf', 'glb', 'step', 'iges']

    async def export_stone_slab(
        self,
        config: Dict[str, Any],
        format: str,
        options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Export stone slab to requested CAD format.

        Args:
            config: Slab configuration (dimensions, material, edges, etc.)
            format: Export format (stl, obj, fbx, etc.)
            options: Export options (quality, precision, etc.)
        """
        options = options or {}

        if format not in self.SUPPORTED_FORMATS:
            return {"success": False, "error": f"Unsupported format: {format}"}

        # Create temporary directory for export
        with tempfile.TemporaryDirectory(prefix="studio_export_") as tmpdir:
            # Generate 3D model (using existing Blender pipeline)
            model_path = await self._generate_blender_model(config, tmpdir)

            # Export to requested format
            output_path = os.path.join(tmpdir, f"slab.{format}")
            await self._run_blender_export(
                model_path,
                output_path,
                format,
                options
            )

            # Read and encode result
            with open(output_path, "rb") as f:
                data = base64.b64encode(f.read()).decode("utf-8")

            return {
                "success": True,
                "data": data,
                "filename": f"stone_slab.{format}",
                "mime_type": self._get_mime_type(format)
            }

    async def _generate_blender_model(
        self,
        config: Dict[str, Any],
        output_dir: str
    ) -> str:
        """Generate Blender model from config (reuse existing pipeline)."""
        # Implementation uses existing render_3d_simulation logic
        # Returns path to generated .blend file
        pass

    async def _run_blender_export(
        self,
        input_path: str,
        output_path: str,
        format: str,
        options: Dict[str, Any]
    ):
        """Run Blender export command."""

        precision = options.get('precision', 6)  # Decimal places
        batch = options.get('batch', False)      # Multi-slab export

        cmd = [
            'blender',
            '--background',
            '--python', self._get_export_script(format),
            '--',
            '--input', input_path,
            '--output', output_path,
            '--precision', str(precision)
        ]

        result = await subprocess.create_subprocess_exec(
            *cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )

        if result.returncode != 0:
            stdout, stderr = await result.communicate()
            raise RuntimeError(f"Blender export failed: {stderr.decode()}")

    def _get_mime_type(self, format: str) -> str:
        mime_types = {
            'stl': 'application/sla',
            'obj': 'model/obj',
            'fbx': 'application/octet-stream',
            'gltf': 'model/gltf+json',
            'glb': 'model/gltf-binary',
            'step': 'application/step',
            'iges': 'application/iges'
        }
        return mime_types.get(format, 'application/octet-stream')
```

---

## 3. API Endpoint Design

### 3.1 Client-Side Export (Direct Download)

```typescript
// Next.js API route: src/app/api/export/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { CADExporter, ExportOptions } from '@/lib/export/CADExporter';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scene, options } = body as {
      scene: SerializedScene;
      options: ExportOptions;
    };

    // Validate options
    if (!['stl', 'obj', 'gltf', 'glb'].includes(options.format)) {
      return NextResponse.json(
        { error: 'Invalid format. Use: stl, obj, gltf, glb' },
        { status: 400 }
      );
    }

    // Reconstruct Three.js scene from serialized data
    const threeScene = deserializeScene(scene);

    // Export
    const exporter = new CADExporter();
    const blob = await exporter.export(threeScene, options);

    // Return blob
    return new NextResponse(blob, {
      headers: {
        'Content-Type': blob.type,
        'Content-Disposition': `attachment; filename="stone_slab.${options.format}"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
```

### 3.2 Server-Side Export (Advanced Formats)

```typescript
// Backend API: backend/app/api/export.py

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

router = APIRouter(prefix="/api/export", tags=["export"])

class ExportRequest(BaseModel):
    config: Dict[str, Any]  # Slab configuration
    format: str            # stl, obj, fbx, gltf, glb, step, iges
    options: Optional[Dict[str, Any]] = {}

class ExportResponse(BaseModel):
    task_id: Optional[str] = None  # For async processing
    success: bool
    download_url: Optional[str] = None
    error: Optional[str] = None

@router.post("/", response_model=ExportResponse)
async def export_slab(
    request: ExportRequest,
    background_tasks: BackgroundTasks
):
    """Export stone slab to CAD format."""

    # Validate format
    if request.format not in ['stl', 'obj', 'fbx', 'gltf', 'glb', 'step', 'iges']:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format: {request.format}"
        )

    # Quick formats (client-side capable)
    if request.format in ['stl', 'obj', 'gltf', 'glb']:
        # Return instructions for client-side export
        return ExportResponse(
            success=True,
            download_url=f"/api/export/client/{request.format}",
            # Client should use client-side export for these formats
        )

    # Complex formats (server-side required)
    try:
        export_service = CADExportService()

        # For large exports, queue as background task
        if _is_large_export(request.config):
            task = background_tasks.add_task(
                export_service.export_stone_slab,
                request.config,
                request.format,
                request.options
            )
            return ExportResponse(
                task_id=task,
                success=True
            )

        # Direct export
        result = await export_service.export_stone_slab(
            request.config,
            request.format,
            request.options
        )

        return ExportResponse(
            success=result["success"],
            download_url=result.get("download_url"),
            error=result.get("error")
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/formats")
async def get_supported_formats():
    """Return supported export formats and their characteristics."""
    return {
        "formats": [
            {
                "id": "stl",
                "name": "STL (Stereolithography)",
                "description": "3D printing and CNC machining",
                "client_side": True,
                "supports_multipart": True,
                "file_extension": ".stl",
                "quality_presets": ["draft", "standard", "high"]
            },
            {
                "id": "obj",
                "name": "OBJ (Wavefront)",
                "description": "Universal CAD interchange format",
                "client_side": True,
                "supports_multipart": False,
                "file_extension": ".obj",
                "quality_presets": ["standard"]
            },
            {
                "id": "glb",
                "name": "GLB (GL Transmission Format)",
                "description": "Web 3D, AR/VR applications",
                "client_side": True,
                "supports_multipart": False,
                "file_extension": ".glb",
                "quality_presets": ["low", "medium", "high"]
            },
            {
                "id": "fbx",
                "name": "FBX (Filmbox)",
                "description": "Game engines, animation software",
                "client_side": False,
                "supports_multipart": True,
                "file_extension": ".fbx",
                "quality_presets": ["standard", "high"]
            },
            {
                "id": "step",
                "name": "STEP (STandard for Exchange of Product)",
                "description": "Industry-standard CAD interchange",
                "client_side": False,
                "supports_multipart": True,
                "file_extension": ".step",
                "quality_presets": ["standard"]
            }
        ]
    }
```

---

## 4. Mesh Simplification

### 4.1 Three.js SimplifyModifier

Three.js includes a built-in `SimplifyModifier` based on the Progressive Mesh algorithm by Stan Melax (1998).

```typescript
import { SimplifyModifier } from 'three/addons/modifiers/SimplifyModifier.js';

interface SimplifyOptions {
  ratio: number; // 0.0 - 1.0 (percentage of original vertices)
  quality?: number; // Higher = better quality but slower (default: 1)
  lockBoundary?: boolean; // Preserve mesh boundaries
}

export function simplifyGeometry(
  geometry: THREE.BufferGeometry,
  options: SimplifyOptions
): THREE.BufferGeometry {
  const modifier = new SimplifyModifier();

  // Calculate target vertex count
  const originalCount = geometry.attributes.position.count;
  const targetCount = Math.floor(originalCount * options.ratio);

  return modifier.modify(geometry, targetCount);
}
```

### 4.2 Quality Presets

| Preset     | Triangle Reduction | Use Case                      |
| ---------- | ------------------ | ----------------------------- |
| `draft`    | 80-90%             | Quick preview, mobile         |
| `standard` | 40-60%             | Web previews, email           |
| `high`     | 10-20%             | Print quotes, detailed review |
| `original` | 0%                 | Full precision export         |

### 4.3 Progressive Simplification

For large meshes, implement progressive simplification:

```typescript
export class ProgressiveSimplifier {
  private levels: Map<number, THREE.BufferGeometry> = new Map();

  async precomputeLevels(
    geometry: THREE.BufferGeometry,
    levels: number[] = [0.1, 0.25, 0.5, 0.75, 1.0]
  ): Promise<void> {
    const modifier = new SimplifyModifier();
    const baseGeometry = geometry.clone();

    for (const ratio of levels) {
      const targetCount = Math.floor(
        baseGeometry.attributes.position.count * ratio
      );
      const simplified = modifier.modify(baseGeometry, targetCount);
      this.levels.set(ratio, simplified);
    }
  }

  getLevel(ratio: number): THREE.BufferGeometry | null {
    // Find closest precomputed level
    const closest = Array.from(this.levels.keys()).reduce((prev, curr) =>
      Math.abs(curr - ratio) < Math.abs(prev - ratio) ? curr : prev
    );
    return this.levels.get(closest) || null;
  }
}
```

---

## 5. Multi-Part Export

### 5.1 Multiple Slab Export

For projects with multiple slabs, export each separately or as an assembly:

```typescript
interface MultiSlabExport {
  mode: 'individual' | 'combined';
  filename: string;
  parts: SlabPart[];
}

interface SlabPart {
  id: string;
  name: string;
  geometry: THREE.BufferGeometry;
  material?: THREE.Material;
  transform?: THREE.Matrix4;
}

export async function exportMultiSlab(
  scene: THREE.Scene,
  options: MultiSlabExport
): Promise<Blob[]> {
  const exporter = new CADExporter();
  const blobs: Blob[] = [];

  if (options.mode === 'individual') {
    // Export each slab separately
    for (const part of options.parts) {
      const partScene = new THREE.Scene();
      const mesh = new THREE.Mesh(part.geometry, part.material);
      mesh.applyMatrix4(part.transform || new THREE.Matrix4());
      partScene.add(mesh);

      const blob = await exporter.export(partScene, {
        format: 'stl',
        quality: 'high',
      });
      blobs.push(blob);
    }
  } else {
    // Export combined scene
    const combinedScene = new THREE.Scene();
    for (const part of options.parts) {
      const mesh = new THREE.Mesh(part.geometry, part.material);
      mesh.applyMatrix4(part.transform || new THREE.Matrix4());
      mesh.name = part.name;
      combinedScene.add(mesh);
    }

    const blob = await exporter.export(combinedScene, {
      format: 'stl',
      quality: 'high',
    });
    blobs.push(blob);
  }

  return blobs;
}
```

### 5.2 ZIP Archive for Multi-Part

```typescript
import JSZip from 'jszip';

export async function createExportZip(
  parts: Array<{ name: string; blob: Blob }>
): Promise<Blob> {
  const zip = new JSZip();

  for (const part of parts) {
    zip.file(part.name, part.blob);
  }

  // Add manifest
  const manifest = {
    exportDate: new Date().toISOString(),
    parts: parts.map((p) => ({ name: p.name })),
    version: '1.0',
  };
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  return zip.generateAsync({ type: 'blob' });
}
```

---

## 6. File Compression

### 6.1 Compression Options

| Format | Native Compression | Additional Options |
| ------ | ------------------ | ------------------ |
| STL    | None               | gzip, zip          |
| OBJ    | None               | gzip, zip          |
| GLTF   | draco, meshopt     | gzip               |
| GLB    | draco, meshopt     | gzip               |

### 6.2 Implementation

```typescript
export type CompressionType = 'none' | 'gzip' | 'zip';

export async function compressData(
  data: ArrayBuffer | string,
  compression: CompressionType,
  filename: string
): Promise<Blob> {
  if (compression === 'none') {
    return new Blob([data], { type: getMimeType(filename) });
  }

  if (compression === 'gzip') {
    const compressed = await gzip(data);
    return new Blob([compressed], {
      type: 'application/gzip',
    });
  }

  if (compression === 'zip') {
    const zip = new JSZip();
    zip.file(filename, data);
    const compressed = await zip.generateAsync({ type: 'uint8array' });
    return new Blob([compressed], {
      type: 'application/zip',
    });
  }

  throw new Error(`Unknown compression: ${compression}`);
}

// Use CompressionStream API (native, fast)
async function gzip(data: ArrayBuffer | string): Promise<Uint8Array> {
  const input =
    data instanceof ArrayBuffer ? data : new TextEncoder().encode(data);

  const cs = new CompressionStream('gzip');
  const writer = cs.writable.getWriter();
  writer.write(input);
  writer.close();

  const reader = cs.readable.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  // Concatenate chunks
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}
```

---

## 7. Performance Considerations

### 7.1 Client-Side Performance

| Operation           | Estimated Time (10K triangles) | Optimization    |
| ------------------- | ------------------------------ | --------------- |
| STL Export (Binary) | ~50ms                          | Native          |
| OBJ Export          | ~100ms                         | String building |
| GLTF Export         | ~200ms                         | Async, worker   |
| Mesh Simplification | ~500ms-2s                      | Web Worker      |

### 7.2 Web Worker for Heavy Operations

```typescript
// src/workers/exportWorker.ts

import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { SimplifyModifier } from 'three/addons/modifiers/SimplifyModifier.js';

self.onmessage = (event) => {
  const { type, data, options } = event.data;

  switch (type) {
    case 'export':
      const exporter = new STLExporter();
      const result = exporter.parse(data.scene, options);
      self.postMessage({ type: 'result', data: result });
      break;

    case 'simplify':
      const modifier = new SimplifyModifier();
      const simplified = modifier.modify(data.geometry, options.targetCount);
      self.postMessage({ type: 'result', data: simplified });
      break;
  }
};
```

### 7.3 Caching Strategy

- Cache simplified geometries by config hash
- Cache exported files for re-download
- Use CDN for frequently exported configurations

---

## 8. Recommended Implementation Priority

### Phase 1: Client-Side Core (Week 1-2)

1. **STL Binary Export** - Primary for manufacturing
   - Direct download, no server
   - Quality settings via segment count
2. **OBJ Export** - CAD compatibility
   - Simple geometry export
   - No materials (Three.js limitation)

3. **Basic UI Integration**
   - Export button in configurator
   - Format selector dropdown

### Phase 2: Advanced Client (Week 3-4)

1. **GLTF/GLB Export** - Web integration
2. **Mesh Simplification** - Quality presets
3. **ZIP archives** - Multi-slab

### Phase 3: Server-Side (Week 5-6)

1. **FBX Export** - Blender pipeline
2. **STEP/IGES** - Industry CAD (if needed)
3. **Batch processing** - Multiple slabs
4. **Background tasks** - Large exports

---

## 9. Dependencies

### Frontend (package.json additions)

```json
{
  "dependencies": {
    "jszip": "^3.10.1",
    "fflate": "^0.8.0"
  }
}
```

### Backend (requirements.txt additions)

```text
# CAD Export
# (Uses existing Blender installation)
```

### Three.js Addons (already in drei/fiber)

```typescript
// Import from three/addons/ - no additional install needed
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { SimplifyModifier } from 'three/addons/modifiers/SimplifyModifier.js';
```

---

## 10. Summary

| Format           | Recommendation           | Priority             |
| ---------------- | ------------------------ | -------------------- |
| **STL (Binary)** | Client-side via Three.js | P0 - Primary         |
| **OBJ**          | Client-side via Three.js | P0 - Compatibility   |
| **GLTF/GLB**     | Client-side via Three.js | P1 - Web integration |
| **FBX**          | Server-side via Blender  | P2 - Advanced        |
| **STEP/IGES**    | Server-side (if needed)  | P3 - Enterprise      |

**Architecture:** Hybrid client/server with client-side priority for immediate responsiveness. Server-side reserved for advanced formats (FBX, STEP), batch processing, and high-precision exports.

**Quality Settings:** Implement via mesh simplification ratio and STL decimal precision (6 for high, 3 for standard, 1 for draft).

---

## Sources

- Three.js STLExporter: https://github.com/mrdoob/three.js/blob/master/examples/jsm/exporters/STLExporter.js
- Three.js OBJExporter: https://github.com/mrdoob/three.js/blob/master/examples/jsm/exporters/OBJExporter.js
- Three.js GLTFExporter: https://github.com/mrdoob/three.js/blob/master/examples/jsm/exporters/GLTFExporter.js
- Three.js SimplifyModifier: https://github.com/mrdoob/three.js/blob/master/examples/jsm/modifiers/SimplifyModifier.js
- Three.js Exporters Documentation: https://threejs.org/docs/#examples/en/exporters/
