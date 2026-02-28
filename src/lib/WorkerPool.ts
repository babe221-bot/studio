/**
 * WorkerPool - Persistent Web Worker Pool for Geometry Generation
 * 
 * Features:
 * - Maintains 2-4 dedicated Web Workers (configurable)
 * - Job queue system with load balancing
 * - Handles concurrent mesh processing requests
 * - No repeated worker creation/destruction overhead
 * - Promise-based API for async job execution
 * - Automatic worker health monitoring and recovery
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface WorkerPoolConfig {
    /** Number of workers to maintain (default: 2, max: 4 recommended) */
    poolSize: number;
    /** Worker script URL or path */
    workerUrl: string | URL;
    /** Maximum queue size before rejecting jobs (default: 100) */
    maxQueueSize?: number;
    /** Enable debug logging */
    debug?: boolean;
    /** Worker idle timeout in ms (default: 30000) */
    idleTimeout?: number;
}

export interface JobConfig {
    /** Job priority (lower = higher priority) */
    priority?: number;
    /** Job timeout in ms (default: 30000) */
    timeout?: number;
    /** Abort signal for cancellation */
    signal?: AbortSignal;
}

interface QueuedJob<TInput, TOutput> {
    id: string;
    input: TInput;
    resolve: (value: TOutput) => void;
    reject: (reason: Error) => void;
    priority: number;
    timeout: number;
    startTime: number;
    signal?: AbortSignal;
    abortListener?: () => void;
}

interface WorkerState {
    worker: Worker;
    id: number;
    busy: boolean;
    currentJob: string | null;
    lastActivity: number;
    messageHandler: (e: MessageEvent) => void;
    errorHandler: (e: ErrorEvent) => void;
}

export interface PoolStats {
    /** Total number of workers */
    totalWorkers: number;
    /** Number of busy workers */
    busyWorkers: number;
    /** Number of idle workers */
    idleWorkers: number;
    /** Number of jobs in queue */
    queueLength: number;
    /** Total jobs processed */
    totalProcessed: number;
    /** Total jobs that failed */
    totalFailed: number;
    /** Average job execution time in ms */
    averageExecutionTime: number;
}

// ============================================================================
// Utility Functions
// ============================================================================

function generateJobId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// Worker Pool Implementation
// ============================================================================

export class WorkerPool<TInput = unknown, TOutput = unknown> {
    private config: Required<WorkerPoolConfig>;
    private workers: WorkerState[] = [];
    private jobQueue: QueuedJob<TInput, TOutput>[] = [];
    private isTerminated = false;

    // Statistics
    private stats = {
        totalProcessed: 0,
        totalFailed: 0,
        executionTimes: [] as number[],
    };

    // Cleanup interval
    private cleanupInterval: ReturnType<typeof setInterval> | null = null;

    constructor(config: WorkerPoolConfig) {
        this.config = {
            poolSize: Math.min(Math.max(config.poolSize, 1), 4),
            workerUrl: config.workerUrl,
            maxQueueSize: config.maxQueueSize ?? 100,
            debug: config.debug ?? false,
            idleTimeout: config.idleTimeout ?? 30000,
        };

        this.log(`Initializing WorkerPool with ${this.config.poolSize} workers`);
        this.initializeWorkers();
        this.startCleanupInterval();
    }

    // ============================================================================
    // Initialization
    // ============================================================================

    private initializeWorkers(): void {
        for (let i = 0; i < this.config.poolSize; i++) {
            this.createWorker(i);
        }
    }

    private createWorker(id: number): WorkerState {
        try {
            const worker = new Worker(this.config.workerUrl, { type: 'module' });

            const state: WorkerState = {
                worker,
                id,
                busy: false,
                currentJob: null,
                lastActivity: Date.now(),
                messageHandler: () => { },
                errorHandler: () => { },
            };

            // Set up error handling
            state.errorHandler = (e: ErrorEvent) => {
                this.log(`Worker ${id} error:`, e.message);
                this.handleWorkerError(state, e);
            };

            worker.addEventListener('error', state.errorHandler);

            this.workers.push(state);
            this.processQueue();

            return state;
        } catch (error) {
            this.log(`Failed to create worker ${id}:`, error);
            throw error;
        }
    }

    private startCleanupInterval(): void {
        // Periodic cleanup of stuck jobs and health check
        this.cleanupInterval = setInterval(() => {
            this.cleanupStuckJobs();
            this.checkWorkerHealth();
        }, 5000);
    }

    // ============================================================================
    // Public API
    // ============================================================================

    /**
     * Execute a job on a worker
     */
    execute(input: TInput, config: JobConfig = {}): Promise<TOutput> {
        if (this.isTerminated) {
            return Promise.reject(new Error('WorkerPool has been terminated'));
        }

        if (this.jobQueue.length >= this.config.maxQueueSize) {
            return Promise.reject(new Error('Job queue is full'));
        }

        return new Promise((resolve, reject) => {
            const job: QueuedJob<TInput, TOutput> = {
                id: generateJobId(),
                input,
                resolve,
                reject,
                priority: config.priority ?? 0,
                timeout: config.timeout ?? 30000,
                startTime: Date.now(),
                signal: config.signal,
            };

            // Handle abort signal
            if (config.signal) {
                if (config.signal.aborted) {
                    reject(new Error('Job was aborted before execution'));
                    return;
                }

                job.abortListener = () => {
                    this.cancelJob(job.id);
                    reject(new Error('Job was aborted'));
                };
                config.signal.addEventListener('abort', job.abortListener);
            }

            // Insert job into queue based on priority
            this.insertJobByPriority(job);
            this.processQueue();
        });
    }

    /**
     * Execute multiple jobs in parallel (up to pool capacity)
     */
    executeBatch(inputs: TInput[], config: JobConfig = {}): Promise<TOutput[]> {
        return Promise.all(
            inputs.map(input => this.execute(input, config))
        );
    }

    /**
     * Get current pool statistics
     */
    getStats(): PoolStats {
        const busyWorkers = this.workers.filter(w => w.busy).length;
        const executionTimes = this.stats.executionTimes;
        const avgTime = executionTimes.length > 0
            ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length
            : 0;

        return {
            totalWorkers: this.workers.length,
            busyWorkers,
            idleWorkers: this.workers.length - busyWorkers,
            queueLength: this.jobQueue.length,
            totalProcessed: this.stats.totalProcessed,
            totalFailed: this.stats.totalFailed,
            averageExecutionTime: avgTime,
        };
    }

    /**
     * Cancel a pending job by ID
     */
    cancelJob(jobId: string): boolean {
        const index = this.jobQueue.findIndex(j => j.id === jobId);
        if (index !== -1) {
            const job = this.jobQueue[index];
            this.jobQueue.splice(index, 1);

            if (job.abortListener && job.signal) {
                job.signal.removeEventListener('abort', job.abortListener);
            }

            job.reject(new Error('Job was cancelled'));
            this.log(`Cancelled job ${jobId}`);
            return true;
        }
        return false;
    }

    /**
     * Clear all pending jobs
     */
    clearQueue(): number {
        const count = this.jobQueue.length;

        // Reject all pending jobs
        for (const job of this.jobQueue) {
            if (job.abortListener && job.signal) {
                job.signal.removeEventListener('abort', job.abortListener);
            }
            job.reject(new Error('Queue was cleared'));
        }

        this.jobQueue = [];
        this.log(`Cleared ${count} jobs from queue`);
        return count;
    }

    /**
     * Terminate all workers and clean up
     */
    terminate(): void {
        this.log('Terminating WorkerPool');
        this.isTerminated = true;

        // Stop cleanup interval
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }

        // Clear queue
        this.clearQueue();

        // Terminate all workers
        for (const state of this.workers) {
            this.terminateWorker(state);
        }
        this.workers = [];
    }

    // ============================================================================
    // Private Methods
    // ============================================================================

    private insertJobByPriority(job: QueuedJob<TInput, TOutput>): void {
        // Insert in priority order (lower priority number = higher priority)
        const index = this.jobQueue.findIndex(j => j.priority > job.priority);
        if (index === -1) {
            this.jobQueue.push(job);
        } else {
            this.jobQueue.splice(index, 0, job);
        }
    }

    private processQueue(): void {
        if (this.isTerminated || this.jobQueue.length === 0) {
            return;
        }

        // Find an available worker
        const availableWorker = this.workers.find(w => !w.busy);
        if (!availableWorker) {
            // All workers are busy, will retry when a worker becomes available
            return;
        }

        // Get the next job
        const job = this.jobQueue.shift();
        if (!job) return;

        this.executeJob(availableWorker, job);
    }

    private executeJob(state: WorkerState, job: QueuedJob<TInput, TOutput>): void {
        state.busy = true;
        state.currentJob = job.id;
        state.lastActivity = Date.now();

        const timeoutId = setTimeout(() => {
            this.handleJobTimeout(state, job);
        }, job.timeout);

        // Set up message handler for this job
        state.messageHandler = (e: MessageEvent) => {
            clearTimeout(timeoutId);

            // Clean up abort listener
            if (job.abortListener && job.signal) {
                job.signal.removeEventListener('abort', job.abortListener);
            }

            const executionTime = Date.now() - state.lastActivity;
            this.stats.executionTimes.push(executionTime);

            // Keep only last 100 execution times for average calculation
            if (this.stats.executionTimes.length > 100) {
                this.stats.executionTimes.shift();
            }

            state.busy = false;
            state.currentJob = null;
            state.lastActivity = Date.now();

            this.stats.totalProcessed++;

            this.log(`Job ${job.id} completed in ${executionTime}ms`);

            job.resolve(e.data as TOutput);

            // Process next job
            this.processQueue();
        };

        state.worker.addEventListener('message', state.messageHandler, { once: true });

        this.log(`Executing job ${job.id} on worker ${state.id}`);

        try {
            state.worker.postMessage(job.input);
        } catch (error) {
            clearTimeout(timeoutId);
            this.handleWorkerError(state, error as ErrorEvent);
        }
    }

    private handleJobTimeout(state: WorkerState, job: QueuedJob<TInput, TOutput>): void {
        this.log(`Job ${job.id} timed out on worker ${state.id}`);

        // Remove message handler
        state.worker.removeEventListener('message', state.messageHandler);

        // Clean up abort listener
        if (job.abortListener && job.signal) {
            job.signal.removeEventListener('abort', job.abortListener);
        }

        state.busy = false;
        state.currentJob = null;
        state.lastActivity = Date.now();

        this.stats.totalFailed++;

        job.reject(new Error(`Job timed out after ${job.timeout}ms`));

        // Recreate the worker as it may be stuck
        this.recreateWorker(state);

        // Process next job
        this.processQueue();
    }

    private handleWorkerError(state: WorkerState, error: ErrorEvent | Error): void {
        this.log(`Worker ${state.id} error:`, error);

        if (state.currentJob) {
            // Find and reject the current job
            // Note: In a real scenario, we might want to retry the job
            this.stats.totalFailed++;
        }

        state.busy = false;
        state.currentJob = null;

        // Recreate the worker
        this.recreateWorker(state);

        // Process next job
        this.processQueue();
    }

    private recreateWorker(oldState: WorkerState): void {
        this.log(`Recreating worker ${oldState.id}`);

        // Terminate old worker
        this.terminateWorker(oldState);

        // Remove from workers array
        const index = this.workers.indexOf(oldState);
        if (index !== -1) {
            this.workers.splice(index, 1);
        }

        // Create new worker with same ID
        this.createWorker(oldState.id);
    }

    private terminateWorker(state: WorkerState): void {
        try {
            state.worker.removeEventListener('error', state.errorHandler);
            state.worker.terminate();
            this.log(`Worker ${state.id} terminated`);
        } catch (error) {
            this.log(`Error terminating worker ${state.id}:`, error);
        }
    }

    private cleanupStuckJobs(): void {
        const now = Date.now();
        const stuckThreshold = 60000; // 60 seconds

        for (const state of this.workers) {
            if (state.busy && now - state.lastActivity > stuckThreshold) {
                this.log(`Worker ${state.id} appears stuck, recreating`);
                this.recreateWorker(state);
            }
        }
    }

    private checkWorkerHealth(): void {
        // Ensure we have the correct number of workers
        const targetCount = this.config.poolSize;
        const currentCount = this.workers.length;

        if (currentCount < targetCount) {
            this.log(`Worker count mismatch: ${currentCount}/${targetCount}, creating missing workers`);
            for (let i = currentCount; i < targetCount; i++) {
                this.createWorker(i);
            }
        }
    }

    private log(...args: unknown[]): void {
        if (this.config.debug) {
            console.log('[WorkerPool]', ...args);
        }
    }
}

// ============================================================================
// Geometry Worker Pool (Specific Implementation)
// ============================================================================

export interface GeometryJobInput {
    L: number;
    W: number;
    H: number;
    profile: {
        name: string;
    };
    processedEdges: {
        front: boolean;
        back: boolean;
        left: boolean;
        right: boolean;
    };
    okapnikEdges?: {
        front: boolean;
        back: boolean;
        left: boolean;
        right: boolean;
    } | null;
}

export interface GeometryJobOutput {
    positions: Float32Array;
    uvs: Float32Array;
    indices: Uint32Array;
    groups: { start: number; count: number; materialIndex: number }[];
}

// Singleton instance for geometry worker pool
let geometryWorkerPool: WorkerPool<GeometryJobInput, GeometryJobOutput> | null = null;

export function getGeometryWorkerPool(): WorkerPool<GeometryJobInput, GeometryJobOutput> {
    if (!geometryWorkerPool) {
        geometryWorkerPool = new WorkerPool<GeometryJobInput, GeometryJobOutput>({
            poolSize: 2, // Maintain 2 workers for geometry generation
            workerUrl: new URL('@/workers/geometryWorker.ts', import.meta.url),
            maxQueueSize: 10,
            debug: process.env.NODE_ENV === 'development',
            idleTimeout: 30000,
        });
    }
    return geometryWorkerPool;
}

export function terminateGeometryWorkerPool(): void {
    if (geometryWorkerPool) {
        geometryWorkerPool.terminate();
        geometryWorkerPool = null;
    }
}

// ============================================================================
// React Hook for Worker Pool
// ============================================================================

import { useEffect, useRef, useCallback } from 'react';

export function useGeometryWorkerPool() {
    const poolRef = useRef(getGeometryWorkerPool());
    const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

    const executeJob = useCallback(async (
        input: GeometryJobInput,
        jobId?: string
    ): Promise<GeometryJobOutput> => {
        const id = jobId || generateJobId();

        // Cancel any existing job with the same ID
        const existingController = abortControllersRef.current.get(id);
        if (existingController) {
            existingController.abort();
        }

        // Create new abort controller
        const controller = new AbortController();
        abortControllersRef.current.set(id, controller);

        try {
            const result = await poolRef.current.execute(input, {
                signal: controller.signal,
                timeout: 30000,
            });
            abortControllersRef.current.delete(id);
            return result;
        } catch (error) {
            abortControllersRef.current.delete(id);
            throw error;
        }
    }, []);

    const cancelJob = useCallback((jobId: string): boolean => {
        const controller = abortControllersRef.current.get(jobId);
        if (controller) {
            controller.abort();
            abortControllersRef.current.delete(jobId);
            return true;
        }
        return poolRef.current.cancelJob(jobId);
    }, []);

    useEffect(() => {
        return () => {
            // Cancel all pending jobs on unmount
            for (const [id, controller] of abortControllersRef.current) {
                controller.abort();
                poolRef.current.cancelJob(id);
            }
            abortControllersRef.current.clear();
        };
    }, []);

    return {
        executeJob,
        cancelJob,
        getStats: () => poolRef.current.getStats(),
    };
}

export default WorkerPool;
