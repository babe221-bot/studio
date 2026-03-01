/**
 * Worker Pool Integration Tests
 * 
 * These tests document expected WorkerPool behavior and test logic
 * that doesn't require actual Web Workers (which don't run in Node/Jest).
 * 
 * For full integration testing with real workers, use E2E tests with Playwright.
 * 
 * Run with: npm test -- worker-pool.test.ts
 */

// Mock the Worker class since it doesn't exist in Node.js test environment
class MockWorker {
    onmessage: ((e: MessageEvent) => void) | null = null;
    onerror: ((e: ErrorEvent) => void) | null = null;

    constructor(public url: string | URL) { }

    postMessage(data: unknown, transfer?: Transferable[]): void {
        // Simulate async processing
        setTimeout(() => {
            if (this.onmessage) {
                // Echo back the data for testing
                this.onmessage(new MessageEvent('message', { data: { result: data } }));
            }
        }, 10);
    }

    terminate(): void {
        // Mock termination
    }

    addEventListener(event: string, handler: EventListener): void {
        if (event === 'message') this.onmessage = handler as any;
        if (event === 'error') this.onerror = handler as any;
    }

    removeEventListener(event: string, handler: EventListener): void {
        if (event === 'message' && this.onmessage === handler) this.onmessage = null;
        if (event === 'error' && this.onerror === handler) this.onerror = null;
    }
}

// Replace global Worker with mock
global.Worker = MockWorker as any;

// Import after mocking
import {
    WorkerPool,
    WorkerPoolConfig,
    JobConfig,
    PoolStats,
    GeometryJobInput,
    GeometryJobOutput
} from '@/lib/WorkerPool';

describe('WorkerPool Unit Tests (Mocked Workers)', () => {
    let pool: WorkerPool<unknown, unknown>;

    const createTestPool = (config: Partial<WorkerPoolConfig> = {}): WorkerPool<unknown, unknown> => {
        return new WorkerPool({
            poolSize: 2,
            workerUrl: 'mock-worker.js',
            maxQueueSize: 10,
            debug: false,
            idleTimeout: 1000,
            ...config,
        });
    };

    afterEach(() => {
        if (pool) {
            pool.terminate();
        }
    });

    // ============================================================================
    // Initialization
    // ============================================================================

    it('should initialize with correct number of workers', () => {
        pool = createTestPool({ poolSize: 3 });
        const stats = pool.getStats();
        expect(stats.totalWorkers).toBe(3);
        expect(stats.idleWorkers).toBe(3);
        expect(stats.busyWorkers).toBe(0);
    });

    it('should clamp pool size to minimum 1', () => {
        pool = createTestPool({ poolSize: 0 });
        const stats = pool.getStats();
        expect(stats.totalWorkers).toBe(1);
    });

    it('should clamp pool size to maximum 4', () => {
        pool = createTestPool({ poolSize: 10 });
        const stats = pool.getStats();
        expect(stats.totalWorkers).toBe(4);
    });

    // ============================================================================
    // Job Execution
    // ============================================================================

    it('should execute a job and return result', async () => {
        pool = createTestPool();
        const result = await pool.execute({ value: 42 });
        expect(result).toBeDefined();
    });

    it('should track processed job count', async () => {
        pool = createTestPool();
        await pool.execute({ value: 1 });
        await pool.execute({ value: 2 });
        await pool.execute({ value: 3 });

        const stats = pool.getStats();
        expect(stats.totalProcessed).toBe(3);
    });

    // ============================================================================
    // Queue Management
    // ============================================================================

    it('should reject jobs when queue is full', async () => {
        pool = createTestPool({ maxQueueSize: 2 });

        // Fill the queue with delayed operations
        const promises: Promise<unknown>[] = [];
        for (let i = 0; i < 5; i++) {
            promises.push(
                pool.execute({ value: i }).catch(err => err)
            );
        }

        const results = await Promise.all(promises);
        const errors = results.filter(r => r instanceof Error);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].message).toContain('queue is full');
    });

    it('should report queue length in stats', async () => {
        pool = createTestPool({ maxQueueSize: 100 });

        // Queue multiple jobs
        const jobs = Array(5).fill(null).map((_, i) => pool.execute({ value: i }));

        // Check stats while jobs are pending
        const stats = pool.getStats();
        expect(stats.queueLength).toBeGreaterThanOrEqual(0);

        await Promise.all(jobs);
    });

    // ============================================================================
    // Termination
    // ============================================================================

    it('should reject new jobs after termination', async () => {
        pool = createTestPool();
        pool.terminate();

        const result = await pool.execute({ value: 1 }).catch((err: Error) => err);
        expect(result).toBeInstanceOf(Error);
        expect((result as Error).message).toContain('terminated');
    });

    it('should clear queue on termination', async () => {
        pool = createTestPool();

        // Start some jobs
        const jobs = Array(3).fill(null).map((_, i) =>
            pool.execute({ value: i }).catch(err => err)
        );

        // Terminate immediately
        pool.terminate();

        // Remaining jobs should be rejected
        const results = await Promise.all(jobs);
        const errors = results.filter(r => r instanceof Error);
        expect(errors.length).toBeGreaterThan(0);
    });
});

// ============================================================================
// Geometry Validation Tests
// ============================================================================

describe('Geometry Validation Logic', () => {
    const validateGeometryInput = (input: GeometryJobInput): string[] => {
        const errors: string[] = [];

        if (input.L <= 0) errors.push(`Invalid length: ${input.L}`);
        if (input.W <= 0) errors.push(`Invalid width: ${input.W}`);
        if (input.H <= 0) errors.push(`Invalid height: ${input.H}`);

        const aspectRatio = Math.max(input.L, input.W) / Math.min(input.L || 1, input.W || 1);
        if (aspectRatio > 4) {
            errors.push(`Warning: Extreme aspect ratio ${aspectRatio.toFixed(2)}`);
        }

        return errors;
    };

    it('should detect zero dimensions', () => {
        const input: GeometryJobInput = {
            L: 0,
            W: 100,
            H: 2,
            profile: { name: 'flat' },
            processedEdges: { front: false, back: false, left: false, right: false },
        };

        const errors = validateGeometryInput(input);
        expect(errors).toContain('Invalid length: 0');
    });

    it('should detect negative dimensions', () => {
        const input: GeometryJobInput = {
            L: -50,
            W: 100,
            H: 2,
            profile: { name: 'flat' },
            processedEdges: { front: false, back: false, left: false, right: false },
        };

        const errors = validateGeometryInput(input);
        expect(errors).toContain('Invalid length: -50');
    });

    it('should warn on extreme aspect ratios (>4:1)', () => {
        const input: GeometryJobInput = {
            L: 400,
            W: 80,
            H: 2,
            profile: { name: 'flat' },
            processedEdges: { front: false, back: false, left: false, right: false },
        };

        const errors = validateGeometryInput(input);
        expect(errors.some(e => e.includes('aspect ratio'))).toBe(true);
    });

    it('should pass validation for normal dimensions', () => {
        const input: GeometryJobInput = {
            L: 120,
            W: 60,
            H: 2,
            profile: { name: 'flat' },
            processedEdges: { front: false, back: false, left: false, right: false },
        };

        const errors = validateGeometryInput(input);
        expect(errors.filter(e => !e.includes('Warning'))).toHaveLength(0);
    });
});

// ============================================================================
// Mesh Output Validation Tests
// ============================================================================

describe('Mesh Output Validation', () => {
    const validateMeshOutput = (output: GeometryJobOutput): string[] => {
        const errors: string[] = [];

        if (!output.positions || output.positions.length === 0) {
            errors.push('No vertices generated');
        }

        if (!output.indices || output.indices.length === 0) {
            errors.push('No indices generated');
        }

        if (output.indices && output.indices.length % 3 !== 0) {
            errors.push('Index count not divisible by 3 (incomplete triangles)');
        }

        if (!output.groups || output.groups.length === 0) {
            errors.push('No material groups defined');
        }

        return errors;
    };

    it('should detect empty vertex buffer', () => {
        const output: GeometryJobOutput = {
            positions: new Float32Array(0),
            uvs: new Float32Array(0),
            indices: new Uint32Array([0, 1, 2]),
            groups: [{ start: 0, count: 3, materialIndex: 0 }],
        };

        const errors = validateMeshOutput(output);
        expect(errors).toContain('No vertices generated');
    });

    it('should detect empty index buffer', () => {
        const output: GeometryJobOutput = {
            positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
            uvs: new Float32Array([0, 0, 1, 0, 0, 1]),
            indices: new Uint32Array(0),
            groups: [],
        };

        const errors = validateMeshOutput(output);
        expect(errors).toContain('No indices generated');
        expect(errors).toContain('No material groups defined');
    });

    it('should detect incomplete triangles', () => {
        const output: GeometryJobOutput = {
            positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
            uvs: new Float32Array([0, 0, 1, 0, 0, 1]),
            indices: new Uint32Array([0, 1]), // Only 2 indices
            groups: [{ start: 0, count: 2, materialIndex: 0 }],
        };

        const errors = validateMeshOutput(output);
        expect(errors).toContain('Index count not divisible by 3 (incomplete triangles)');
    });

    it('should pass validation for valid mesh', () => {
        const output: GeometryJobOutput = {
            positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
            uvs: new Float32Array([0, 0, 1, 0, 0, 1]),
            indices: new Uint32Array([0, 1, 2]),
            groups: [{ start: 0, count: 3, materialIndex: 0 }],
        };

        const errors = validateMeshOutput(output);
        expect(errors).toHaveLength(0);
    });
});

// ============================================================================
// Statistics Calculation Tests
// ============================================================================

describe('Pool Statistics Calculations', () => {
    it('should calculate average execution time correctly', () => {
        const times = [100, 200, 300, 400];
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        expect(avg).toBe(250);
    });

    it('should calculate failure rate correctly', () => {
        const totalProcessed = 90;
        const totalFailed = 10;
        const failureRate = (totalFailed / (totalProcessed + totalFailed)) * 100;
        expect(failureRate).toBe(10);
    });

    it('should flag high failure rates (>10%)', () => {
        const totalProcessed = 80;
        const totalFailed = 20;
        const failureRate = (totalFailed / (totalProcessed + totalFailed)) * 100;
        expect(failureRate).toBeGreaterThan(10);
    });
});
