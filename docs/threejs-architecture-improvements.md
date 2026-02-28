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
