# Three.js Application Performance and Resource Management

## Architecture Improvement Summary

This document outlines the comprehensive architecture improvements implemented for the Three.js stone slab visualization application. The improvements focus on three main areas:

1. **Resource Manager Pattern** - Centralized lifecycle management with reference counting
2. **@react-three/fiber Migration** - Declarative React integration with optimized rendering
3. **Worker Pool Architecture** - Persistent Web Worker pool with load balancing

---

## 1. Resource Manager Pattern

### Overview

The [`ResourceManager`](src/lib/ResourceManager.ts:1) provides centralized management of Three.js resources (textures, materials, geometries) with:

- **Reference Counting** - Track shared resource usage across components
- **LRU Cache** - Configurable cache size limits with automatic eviction
- **Automatic Disposal** - Resources disposed when reference count reaches zero
- **Memory Leak Prevention** - Strict cache size limits prevent unbounded growth

### Key Features

#### Reference Counting
```typescript
// Add texture with initial reference count of 1
resourceManager.addTexture('texture-key', texture, 1);

// Acquire additional reference (e.g., when another component uses it)
resourceManager.acquireTexture('texture-key'); // refCount = 2

// Release reference when done
resourceManager.releaseTexture('texture-key'); // refCount = 1

// When refCount reaches 0, texture is automatically disposed
resourceManager.releaseTexture('texture-key'); // refCount = 0 → disposed
```

#### LRU Cache with Size Limits
```typescript
const manager = ResourceManager.getInstance({
  maxTextureCacheSize: 20,   // Max 20 textures
  maxMaterialCacheSize: 30,  // Max 30 materials
  maxGeometryCacheSize: 50,  // Max 50 geometries
  debug: true,               // Enable debug logging
});
```

#### PBR Material Factory
```typescript
const material = resourceManager.getPBRMaterial('unique-key', {
  color: new THREE.Color(0xcccccc),
  roughness: 0.35,
  metalness: 0.05,
  clearcoat: 0.4,
  normalMap: texture,
  normalScale: [0.3, 0.3],
});
```

### React Integration

#### Hook for Resource Tracking
```typescript
import { useTrackedResource } from '@/lib/ResourceManager';

function MyComponent() {
  // Automatically releases resource on unmount
  const { release, acquire } = useTrackedResource('my-texture', 'texture');
  
  return <mesh />;
}
```

### Benefits

1. **Memory Efficiency** - Shared textures/materials reduce memory footprint
2. **Automatic Cleanup** - No manual disposal tracking needed
3. **Cache Control** - LRU eviction prevents memory leaks
4. **Debug Visibility** - Optional logging for resource lifecycle

---

## 2. Worker Pool Architecture

### Overview

The [`WorkerPool`](src/lib/WorkerPool.ts:1) replaces ephemeral worker instantiation with a persistent pool of 2-4 dedicated Web Workers for geometry generation tasks.

### Key Features

#### Persistent Worker Pool
```typescript
import { getGeometryWorkerPool } from '@/lib/WorkerPool';

const pool = getGeometryWorkerPool(); // Singleton instance
```

#### Job Queue with Load Balancing
```typescript
const result = await pool.execute({
  L: 2.0,  // length
  W: 1.5,  // width
  H: 0.03, // height
  profile: { name: 'puno-zaobljena' },
  processedEdges: { front: true, back: false, left: true, right: false },
  okapnikEdges: null,
}, {
  priority: 0,      // Lower = higher priority
  timeout: 30000,   // 30 second timeout
  signal: abortController.signal, // Cancellation support
});
```

#### Pool Statistics
```typescript
const stats = pool.getStats();
console.log(stats);
// {
//   totalWorkers: 2,
//   busyWorkers: 1,
//   idleWorkers: 1,
//   queueLength: 0,
//   totalProcessed: 42,
//   totalFailed: 0,
//   averageExecutionTime: 45.2
// }
```

### React Hook

```typescript
import { useGeometryWorkerPool } from '@/lib/WorkerPool';

function StoneSlabComponent() {
  const { executeJob, cancelJob, getStats } = useGeometryWorkerPool();
  
  useEffect(() => {
    const abortController = new AbortController();
    
    executeJob(geometryInput, abortController).then(result => {
      // Process geometry result
    });
    
    return () => {
      abortController.abort(); // Cancel pending job
    };
  }, []);
}
```

### Benefits

1. **No Worker Overhead** - Workers created once, reused indefinitely
2. **Concurrent Processing** - Multiple jobs processed in parallel
3. **Automatic Recovery** - Failed workers automatically recreated
4. **Cancellation Support** - AbortController integration for job cancellation
5. **Load Balancing** - Jobs distributed across available workers

---

## 3. @react-three/fiber Migration

### Overview

The migration to [`@react-three/fiber`](https://docs.pmndrs.github.io/react-three-fiber) provides:

- **Declarative React Integration** - Three.js objects as JSX components
- **Built-in Disposal Management** - Automatic cleanup via React lifecycle
- **Optimized Rendering** - Synchronized with React's render cycle
- **Modern Patterns** - Hooks-based API for Three.js

### New Components

#### StoneSlabMesh
```typescript
import { StoneSlabMesh } from '@/components/three';

<StoneSlabMesh
  dims={{ length: 200, width: 150, height: 3 }}
  material={selectedMaterial}
  finish={selectedFinish}
  profile={selectedProfile}
  processedEdges={{ front: true, back: false, left: true, right: false }}
  okapnikEdges={null}
/>
```

#### StudioLighting
```typescript
import { StudioLighting } from '@/components/three';

<StudioLighting /> // Complete studio lighting setup
```

#### DimensionLabels
```typescript
import { DimensionLabels } from '@/components/three';

<DimensionLabels
  dims={{ length: 200, width: 150, height: 3 }}
  visible={showDimensions}
/>
```

#### SceneEnvironment
```typescript
import { SceneEnvironment } from '@/components/three';

<SceneEnvironment /> // Environment map + ground plane
```

### VisualizationCanvasR3F (New Component)

The new [`VisualizationCanvasR3F`](src/components/VisualizationCanvasR3F.tsx:1) component provides the full visualization using R3F:

```typescript
import VisualizationCanvasR3F from '@/components/VisualizationCanvasR3F';

<VisualizationCanvasR3F
  dims={{ length: 200, width: 150, height: 3 }}
  material={material}
  finish={finish}
  profile={profile}
  processedEdges={processedEdges}
  okapnikEdges={okapnikEdges}
  showDimensions={true}
/>
```

### Benefits

1. **React-First** - Native React patterns (hooks, props, context)
2. **Automatic Disposal** - R3F handles Three.js object cleanup
3. **Performance** - Optimized render loop integration
4. **Ecosystem** - Access to @react-three/drei utilities
5. **Maintainability** - Declarative code is easier to understand

---

## 4. Backwards Compatibility

The original [`VisualizationCanvas`](src/components/VisualizationCanvas.tsx:1) component has been refactored to use the new architecture while maintaining the same API:

```typescript
// Both APIs remain available and functional

// Original API (now uses ResourceManager + WorkerPool internally)
import VisualizationCanvas from '@/components/VisualizationCanvas';

// New R3F-based API
import VisualizationCanvasR3F from '@/components/VisualizationCanvasR3F';
```

### Migration Path

1. **Phase 1** (Current): Both components available, original uses new internals
2. **Phase 2** (Future): Gradually migrate usages to R3F version
3. **Phase 3** (Future): Deprecate original, R3F becomes default

---

## 5. Performance Comparison

### Before

| Metric | Value |
|--------|-------|
| Worker Creation | Per-geometry (high overhead) |
| Texture Loading | No caching (duplicate loads) |
| Memory Management | Manual (error-prone) |
| Cache Limits | None (potential memory leaks) |
| Concurrent Jobs | Sequential only |

### After

| Metric | Value |
|--------|-------|
| Worker Creation | 2 persistent workers (no overhead) |
| Texture Loading | LRU cache with reference counting |
| Memory Management | Automatic via ResourceManager |
| Cache Limits | Configurable (default: 20 textures, 30 materials) |
| Concurrent Jobs | Parallel with load balancing |

---

## 6. Usage Examples

### Basic Usage (Original API)

```typescript
import VisualizationCanvas from '@/components/VisualizationCanvas';

function MyPage() {
  const canvasRef = useRef<CanvasHandle>(null);
  
  return (
    <VisualizationCanvas
      ref={canvasRef}
      dims={{ length: 200, width: 150, height: 3 }}
      material={material}
      finish={finish}
      profile={profile}
      processedEdges={{ front: true, back: true, left: true, right: true }}
      okapnikEdges={{ front: false, back: false, left: false, right: false }}
      showDimensions={true}
    />
  );
}
```

### R3F Usage (Recommended for New Code)

```typescript
import { Canvas } from '@react-three/fiber';
import { StoneSlabMesh, StudioLighting, DimensionLabels, SceneEnvironment } from '@/components/three';

function MyScene() {
  return (
    <Canvas shadows camera={{ position: [4, 3, 4] }}>
      <SceneEnvironment />
      <StudioLighting />
      <StoneSlabMesh
        dims={{ length: 200, width: 150, height: 3 }}
        material={material}
        finish={finish}
        profile={profile}
        processedEdges={processedEdges}
        okapnikEdges={okapnikEdges}
      />
      <DimensionLabels dims={dims} visible={showDimensions} />
      <OrbitControls />
    </Canvas>
  );
}
```

### Direct ResourceManager Usage

```typescript
import { resourceManager } from '@/lib/ResourceManager';

// Load texture with caching
const texture = await resourceManager.loadTexture('/textures/marble.jpg', {
  colorSpace: THREE.SRGBColorSpace,
  wrapS: THREE.RepeatWrapping,
  wrapT: THREE.RepeatWrapping,
  repeat: [4, 4],
});

// Get stats
const stats = resourceManager.getStats();
console.log(`Cached textures: ${stats.textures}`);

// Dispose all resources (e.g., on app unmount)
resourceManager.disposeAll();
```

### Direct WorkerPool Usage

```typescript
import { WorkerPool } from '@/lib/WorkerPool';

const pool = new WorkerPool({
  poolSize: 3,
  workerUrl: new URL('@/workers/myWorker.ts', import.meta.url),
  maxQueueSize: 50,
  debug: true,
});

const result = await pool.execute(inputData);
const stats = pool.getStats();

// Cleanup when done
pool.terminate();
```

---

## 7. Configuration

### ResourceManager Configuration

```typescript
ResourceManager.resetInstance();
const manager = ResourceManager.getInstance({
  maxTextureCacheSize: 20,
  maxMaterialCacheSize: 30,
  maxGeometryCacheSize: 50,
  debug: process.env.NODE_ENV === 'development',
});
```

### WorkerPool Configuration

```typescript
const pool = new WorkerPool({
  poolSize: 2,           // 2-4 recommended
  workerUrl: workerUrl,
  maxQueueSize: 100,     // Max pending jobs
  idleTimeout: 30000,    // Worker health check interval
  debug: false,
});
```

---

## 8. File Structure

```
src/
├── lib/
│   ├── ResourceManager.ts    # Centralized resource lifecycle
│   └── WorkerPool.ts         # Persistent worker pool
├── components/
│   ├── VisualizationCanvas.tsx      # Original (refactored)
│   ├── VisualizationCanvasR3F.tsx   # New R3F version
│   └── three/
