/**
 * ResourceManager - Centralized Three.js resource lifecycle management
 * 
 * Features:
 * - Reference counting for shared textures and materials
 * - LRU (Least Recently Used) eviction policy for cache size limits
 * - Automatic disposal when reference count reaches zero
 * - Configurable cache size limits to prevent memory leaks
 * - Support for textures, materials, geometries, and other disposable resources
 */

import * as THREE from 'three';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ResourceCacheConfig {
    maxTextureCacheSize: number;
    maxMaterialCacheSize: number;
    maxGeometryCacheSize: number;
    debug?: boolean;
}

interface CacheEntry<T> {
    value: T;
    refCount: number;
    lastAccessed: number;
    key: string;
}

export type ResourceType = 'texture' | 'material' | 'geometry' | 'other';

interface ResourceStats {
    textures: number;
    materials: number;
    geometries: number;
    other: number;
    totalRefCount: number;
}

// ============================================================================
// LRU Cache Implementation with Reference Counting
// ============================================================================

class LRUResourceCache<T extends { dispose?: () => void }> {
    private cache: Map<string, CacheEntry<T>>;
    private maxSize: number;
    private debug: boolean;
    private type: ResourceType;

    constructor(type: ResourceType, maxSize: number, debug = false) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.debug = debug;
        this.type = type;
    }

    /**
     * Get a resource from the cache, updating its access time
     */
    get(key: string): T | undefined {
        const entry = this.cache.get(key);
        if (entry) {
            entry.lastAccessed = Date.now();
            if (this.debug) {
                console.log(`[ResourceManager] Cache hit: ${this.type}:${key} (refs: ${entry.refCount})`);
            }
            return entry.value;
        }
        return undefined;
    }

    /**
     * Add a resource to the cache with initial reference count
     */
    set(key: string, value: T, initialRefCount = 1): void {
        // If key exists, update reference count and access time
        const existing = this.cache.get(key);
        if (existing) {
            existing.refCount += initialRefCount;
            existing.lastAccessed = Date.now();
            if (this.debug) {
                console.log(`[ResourceManager] Incremented refs for ${this.type}:${key} (refs: ${existing.refCount})`);
            }
            return;
        }

        // Evict LRU entry if at capacity
        if (this.cache.size >= this.maxSize) {
            this.evictLRU();
        }

        this.cache.set(key, {
            value,
            refCount: initialRefCount,
            lastAccessed: Date.now(),
            key,
        });

        if (this.debug) {
            console.log(`[ResourceManager] Added to cache: ${this.type}:${key} (refs: ${initialRefCount})`);
        }
    }

    /**
     * Increment reference count for a resource
     */
    acquire(key: string): boolean {
        const entry = this.cache.get(key);
        if (entry) {
            entry.refCount++;
            entry.lastAccessed = Date.now();
            if (this.debug) {
                console.log(`[ResourceManager] Acquired ${this.type}:${key} (refs: ${entry.refCount})`);
            }
            return true;
        }
        return false;
    }

    /**
     * Decrement reference count and dispose if zero
     */
    release(key: string): boolean {
        const entry = this.cache.get(key);
        if (!entry) {
            if (this.debug) {
                console.warn(`[ResourceManager] Attempted to release unknown ${this.type}:${key}`);
            }
            return false;
        }

        entry.refCount--;

        if (this.debug) {
            console.log(`[ResourceManager] Released ${this.type}:${key} (refs: ${entry.refCount})`);
        }

        if (entry.refCount <= 0) {
            this.disposeEntry(entry);
            this.cache.delete(key);
            return true;
        }

        return false;
    }

    /**
     * Force dispose and remove a specific resource
     */
    dispose(key: string): boolean {
        const entry = this.cache.get(key);
        if (entry) {
            this.disposeEntry(entry);
            this.cache.delete(key);
            return true;
        }
        return false;
    }

    /**
     * Dispose all resources in the cache
     */
    disposeAll(): void {
        if (this.debug) {
            console.log(`[ResourceManager] Disposing all ${this.type} resources (${this.cache.size} items)`);
        }

        for (const entry of this.cache.values()) {
            this.disposeEntry(entry);
        }
        this.cache.clear();
    }

    /**
     * Get cache statistics
     */
    getStats(): { size: number; totalRefs: number } {
        let totalRefs = 0;
        for (const entry of this.cache.values()) {
            totalRefs += entry.refCount;
        }
        return { size: this.cache.size, totalRefs };
    }

    /**
     * Get all keys in the cache
     */
    keys(): string[] {
        return Array.from(this.cache.keys());
    }

    /**
     * Check if a key exists in the cache
     */
    has(key: string): boolean {
        return this.cache.has(key);
    }

    /**
     * Evict the least recently used entry
     */
    private evictLRU(): void {
        let oldestKey: string | null = null;
        let oldestTime = Infinity;
        let oldestEntry: CacheEntry<T> | null = null;

        for (const [key, entry] of this.cache.entries()) {
            // Only evict entries with refCount <= 1 (not actively used)
            if (entry.refCount <= 1 && entry.lastAccessed < oldestTime) {
                oldestTime = entry.lastAccessed;
                oldestKey = key;
                oldestEntry = entry;
            }
        }

        if (oldestKey && oldestEntry) {
            if (this.debug) {
                console.log(`[ResourceManager] LRU eviction: ${this.type}:${oldestKey}`);
            }
            this.disposeEntry(oldestEntry);
            this.cache.delete(oldestKey);
        }
    }

    /**
     * Dispose a single entry
     */
    private disposeEntry(entry: CacheEntry<T>): void {
        if (entry.value.dispose) {
            try {
                entry.value.dispose();
                if (this.debug) {
                    console.log(`[ResourceManager] Disposed ${this.type}:${entry.key}`);
                }
            } catch (err) {
                console.error(`[ResourceManager] Error disposing ${this.type}:${entry.key}`, err);
            }
        }
    }
}

// ============================================================================
// Centralized Resource Manager
// ============================================================================

export class ResourceManager {
    private static instance: ResourceManager | null = null;

    private textureCache: LRUResourceCache<THREE.Texture>;
    private materialCache: LRUResourceCache<THREE.Material>;
    private geometryCache: LRUResourceCache<THREE.BufferGeometry>;
    private otherCache: LRUResourceCache<{ dispose: () => void }>;

    private config: ResourceCacheConfig;
    private textureLoader: THREE.TextureLoader;

    // Track pending texture loads to prevent duplicate requests
    private pendingLoads: Map<string, Promise<THREE.Texture>>;

    private constructor(config: Partial<ResourceCacheConfig> = {}) {
        this.config = {
            maxTextureCacheSize: config.maxTextureCacheSize ?? 20,
            maxMaterialCacheSize: config.maxMaterialCacheSize ?? 30,
            maxGeometryCacheSize: config.maxGeometryCacheSize ?? 50,
            debug: config.debug ?? false,
        };

        this.textureCache = new LRUResourceCache('texture', this.config.maxTextureCacheSize, this.config.debug);
        this.materialCache = new LRUResourceCache('material', this.config.maxMaterialCacheSize, this.config.debug);
        this.geometryCache = new LRUResourceCache('geometry', this.config.maxGeometryCacheSize, this.config.debug);
        this.otherCache = new LRUResourceCache('other', 20, this.config.debug);

        this.textureLoader = new THREE.TextureLoader();
        this.pendingLoads = new Map();
    }

    /**
     * Get the singleton instance of ResourceManager
     */
    public static getInstance(config?: Partial<ResourceCacheConfig>): ResourceManager {
        if (!ResourceManager.instance) {
            ResourceManager.instance = new ResourceManager(config);
        }
        return ResourceManager.instance;
    }

    /**
     * Reset the singleton instance (useful for testing)
     */
    public static resetInstance(): void {
        if (ResourceManager.instance) {
            ResourceManager.instance.disposeAll();
            ResourceManager.instance = null;
        }
    }

    // ============================================================================
    // Texture Management
    // ============================================================================

    /**
     * Load a texture with caching and reference counting
     */
    async loadTexture(url: string, options?: {
        colorSpace?: THREE.ColorSpace;
        wrapS?: THREE.Wrapping;
        wrapT?: THREE.Wrapping;
        repeat?: [number, number];
        anisotropy?: number;
    }): Promise<THREE.Texture> {
        // Check cache first
        const cached = this.textureCache.get(url);
        if (cached) {
            this.textureCache.acquire(url);
            this.applyTextureOptions(cached, options);
            return cached;
        }

        // Check if there's already a pending load for this URL
        const pending = this.pendingLoads.get(url);
        if (pending) {
            const texture = await pending;
            this.textureCache.acquire(url);
            return texture;
        }

        // Create new load promise
        const loadPromise = new Promise<THREE.Texture>((resolve, reject) => {
            this.textureLoader.load(
                url,
                (texture) => {
                    this.applyTextureOptions(texture, options);
                    this.textureCache.set(url, texture, 1);
                    resolve(texture);
                },
                undefined,
                (error) => {
                    reject(error);
                }
            );
        });

        this.pendingLoads.set(url, loadPromise);

        try {
            const texture = await loadPromise;
            this.pendingLoads.delete(url);
            return texture;
        } catch (error) {
            this.pendingLoads.delete(url);
            throw error;
        }
    }

    /**
     * Get a cached texture without incrementing reference count
     */
    getTexture(url: string): THREE.Texture | undefined {
        return this.textureCache.get(url);
    }

    /**
     * Manually add a texture to the cache
     */
    addTexture(key: string, texture: THREE.Texture, initialRefCount = 1): void {
        this.textureCache.set(key, texture, initialRefCount);
    }

    /**
     * Acquire a reference to a cached texture
     */
    acquireTexture(key: string): boolean {
        return this.textureCache.acquire(key);
    }

    /**
     * Release a reference to a texture (disposes when refCount reaches 0)
     */
    releaseTexture(key: string): boolean {
        return this.textureCache.release(key);
    }

    /**
     * Force dispose a texture
     */
    disposeTexture(key: string): boolean {
        return this.textureCache.dispose(key);
    }

    // ============================================================================
    // Material Management
    // ============================================================================

    /**
     * Add a material to the cache
     */
    addMaterial(key: string, material: THREE.Material, initialRefCount = 1): void {
        this.materialCache.set(key, material, initialRefCount);
    }

    /**
     * Get a cached material
     */
    getMaterial(key: string): THREE.Material | undefined {
        return this.materialCache.get(key);
    }

    /**
     * Acquire a reference to a cached material
     */
    acquireMaterial(key: string): boolean {
        return this.materialCache.acquire(key);
    }

    /**
     * Release a reference to a material
     */
    releaseMaterial(key: string): boolean {
        return this.materialCache.release(key);
    }

    /**
     * Create or get a cached PBR material
     */
    getPBRMaterial(key: string, params: {
        color?: THREE.Color | string | number;
        roughness?: number;
        metalness?: number;
        clearcoat?: number;
        clearcoatRoughness?: number;
        sheen?: number;
        sheenRoughness?: number;
        map?: THREE.Texture | null;
        normalMap?: THREE.Texture | null;
        normalScale?: [number, number];
    }): THREE.MeshPhysicalMaterial {
        const cached = this.getMaterial(key);
        if (cached && cached instanceof THREE.MeshPhysicalMaterial) {
            this.acquireMaterial(key);
            return cached;
        }

        const material = new THREE.MeshPhysicalMaterial({
            side: THREE.DoubleSide,
            color: params.color ?? 0xffffff,
            roughness: params.roughness ?? 0.5,
            metalness: params.metalness ?? 0.0,
            clearcoat: params.clearcoat ?? 0.0,
            clearcoatRoughness: params.clearcoatRoughness ?? 0.0,
            sheen: params.sheen ?? 0.0,
            sheenRoughness: params.sheenRoughness ?? 0.5,
            map: params.map ?? null,
            normalMap: params.normalMap ?? null,
            normalScale: params.normalScale ? new THREE.Vector2(...params.normalScale) : new THREE.Vector2(1, 1),
        });

        this.addMaterial(key, material, 1);
        return material;
    }

    // ============================================================================
    // Geometry Management
    // ============================================================================

    /**
     * Add a geometry to the cache
     */
    addGeometry(key: string, geometry: THREE.BufferGeometry, initialRefCount = 1): void {
        this.geometryCache.set(key, geometry, initialRefCount);
    }

    /**
     * Get a cached geometry
     */
    getGeometry(key: string): THREE.BufferGeometry | undefined {
        return this.geometryCache.get(key);
    }

    /**
     * Acquire a reference to a cached geometry
     */
    acquireGeometry(key: string): boolean {
        return this.geometryCache.acquire(key);
    }

    /**
     * Release a reference to a geometry
     */
    releaseGeometry(key: string): boolean {
        return this.geometryCache.release(key);
    }

    // ============================================================================
    // Generic Resource Management
    // ============================================================================

    /**
     * Add any disposable resource to the cache
     */
    addResource(key: string, resource: { dispose: () => void }, type: ResourceType, initialRefCount = 1): void {
        switch (type) {
            case 'texture':
                if (resource instanceof THREE.Texture) {
                    this.textureCache.set(key, resource, initialRefCount);
                }
                break;
            case 'material':
                if (resource instanceof THREE.Material) {
                    this.materialCache.set(key, resource, initialRefCount);
                }
                break;
            case 'geometry':
                if (resource instanceof THREE.BufferGeometry) {
                    this.geometryCache.set(key, resource, initialRefCount);
                }
                break;
            case 'other':
                this.otherCache.set(key, resource, initialRefCount);
                break;
        }
    }

    /**
     * Release any resource by key and type
     */
    releaseResource(key: string, type: ResourceType): boolean {
        switch (type) {
            case 'texture':
                return this.releaseTexture(key);
            case 'material':
                return this.releaseMaterial(key);
            case 'geometry':
                return this.releaseGeometry(key);
            case 'other':
                return this.otherCache.release(key);
            default:
                return false;
        }
    }

    // ============================================================================
    // Statistics & Cleanup
    // ============================================================================

    /**
     * Get comprehensive statistics about all cached resources
     */
    getStats(): ResourceStats {
        const textureStats = this.textureCache.getStats();
        const materialStats = this.materialCache.getStats();
        const geometryStats = this.geometryCache.getStats();
        const otherStats = this.otherCache.getStats();

        return {
            textures: textureStats.size,
            materials: materialStats.size,
            geometries: geometryStats.size,
            other: otherStats.size,
            totalRefCount: textureStats.totalRefs + materialStats.totalRefs + geometryStats.totalRefs + otherStats.totalRefs,
        };
    }

    /**
     * Dispose all resources
     */
    disposeAll(): void {
        if (this.config.debug) {
            console.log('[ResourceManager] Disposing all resources');
        }

        this.textureCache.disposeAll();
        this.materialCache.disposeAll();
        this.geometryCache.disposeAll();
        this.otherCache.disposeAll();
        this.pendingLoads.clear();
    }

    /**
     * Dispose resources by type
     */
    disposeByType(type: ResourceType): void {
        switch (type) {
            case 'texture':
                this.textureCache.disposeAll();
                break;
            case 'material':
                this.materialCache.disposeAll();
                break;
            case 'geometry':
                this.geometryCache.disposeAll();
                break;
            case 'other':
                this.otherCache.disposeAll();
                break;
        }
    }

    // ============================================================================
    // Private Helpers
    // ============================================================================

    private applyTextureOptions(
        texture: THREE.Texture,
        options?: {
            colorSpace?: THREE.ColorSpace;
            wrapS?: THREE.Wrapping;
            wrapT?: THREE.Wrapping;
            repeat?: [number, number];
            anisotropy?: number;
        }
    ): void {
        if (!options) return;

        if (options.colorSpace) {
            texture.colorSpace = options.colorSpace;
        }
        if (options.wrapS !== undefined) {
            texture.wrapS = options.wrapS;
        }
        if (options.wrapT !== undefined) {
            texture.wrapT = options.wrapT;
        }
        if (options.repeat) {
            texture.repeat.set(options.repeat[0], options.repeat[1]);
        }
        if (options.anisotropy !== undefined) {
            texture.anisotropy = options.anisotropy;
        }
        texture.needsUpdate = true;
    }
}

// ============================================================================
// React Hook for Resource Management
// ============================================================================

import { useEffect, useRef } from 'react';

interface UseResourceOptions {
    autoRelease?: boolean;
}

/**
 * React hook for managing Three.js resources with automatic cleanup
 */
export function useResourceManager(config?: Partial<ResourceCacheConfig>) {
    const managerRef = useRef(ResourceManager.getInstance(config));

    useEffect(() => {
        return () => {
            // Optional: Could dispose all on unmount, but typically we want
            // to keep the cache for the application lifetime
        };
    }, []);

    return managerRef.current;
}

/**
 * Hook to track a resource reference that auto-releases on unmount
 */
export function useTrackedResource(
    key: string,
    type: ResourceType,
    options: UseResourceOptions = { autoRelease: true }
) {
    const manager = ResourceManager.getInstance();
    const releasedRef = useRef(false);

    useEffect(() => {
        releasedRef.current = false;

        return () => {
            if (options.autoRelease && !releasedRef.current) {
                manager.releaseResource(key, type);
                releasedRef.current = true;
            }
        };
    }, [key, type, options.autoRelease, manager]);

    return {
        release: () => {
            if (!releasedRef.current) {
                manager.releaseResource(key, type);
                releasedRef.current = true;
            }
        },
        acquire: () => {
            releasedRef.current = false;
            switch (type) {
                case 'texture':
                    return manager.acquireTexture(key);
                case 'material':
                    return manager.acquireMaterial(key);
                case 'geometry':
                    return manager.acquireGeometry(key);
                default:
                    return false;
            }
        },
    };
}

// Export singleton instance for direct use
export const resourceManager = ResourceManager.getInstance();

export default ResourceManager;
