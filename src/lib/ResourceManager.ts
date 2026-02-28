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
