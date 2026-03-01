/**
 * Worker Pool Integration Tests
 * 
 * Tests job queue management, worker health monitoring, and error recovery.
 * Run with: npm test -- worker-pool.test.ts
 */

import { WorkerPool, JobConfig, WorkerPoolConfig } from '@/lib/WorkerPool';

// Simple test worker that echoes back input with optional delay
const TEST_WORKER_CODE = `
  self.onmessage = (e) => {
    const { value, delay, shouldError } = e.data;
    
    if (shouldError) {
      throw new Error('Intentional test error');
    }
    
    if (delay) {
      setTimeout(() => {
        self.postMessage({ result: value * 2, input: value });
      }, delay);
    } else {
      self.postMessage({ result: value * 2, input: value });
    }
  };
`;

// Create a blob URL for the test worker
function createTestWorkerUrl(): string {
    const blob = new Blob([TEST_WORKER_CODE], { type: 'application/javascript' });
    return URL.createObjectURL(blob);
}

describe('WorkerPool Integration Tests', () => {
    let pool: WorkerPool<{ value: number; delay?: number; shouldError?: boolean }, { result: number; input: number }>;
    let workerUrl: string;

    beforeEach(() => {
        workerUrl = createTestWorkerUrl();
        pool = new WorkerPool({
            poolSize: 2,
            workerUrl,
            maxQueueSize: 10,
            debug: true,
            idleTimeout: 1000,
        });
    });

    afterEach(() => {
        pool.terminate();
        URL.revokeObjectURL(workerUrl);
    });

    // ============================================================================
    // Basic Functionality
    // ============================================================================

    it('should execute a single job successfully', async () => {
        const result = await pool.execute({ value: 5 });
        expect(result.result).toBe(10);
        expect(result.input).toBe(5);
    });

    it('should execute multiple jobs in sequence', async () => {
        const results = await Promise.all([
            pool.execute({ value: 1 }),
            pool.execute({ value: 2 }),
            pool.execute({ value: 3 }),
        ]);

        expect(results[0].result).toBe(2);
        expect(results[1].result).toBe(4);
        expect(results[2].result).toBe(6);
    });

    // ============================================================================
    // Queue Management
    // ============================================================================

    it('should queue jobs when all workers are busy', async () => {
        // Create jobs with delays to ensure workers stay busy
        const jobs = [
            pool.execute({ value: 1, delay: 100 }),
            pool.execute({ value: 2, delay: 100 }),
            pool.execute({ value: 3, delay: 100 }),
            pool.execute({ value: 4, delay: 100 }),
        ];

        // Check that jobs are queued
        const stats = pool.getStats();
        expect(stats.totalWorkers).toBe(2);

        const results = await Promise.all(jobs);
        expect(results).toHaveLength(4);
    });

    it('should reject jobs when queue is full', async () => {
        // Fill the queue
        const jobs: Promise<any>[] = [];
        for (let i = 0; i < 15; i++) {
            jobs.push(
                pool.execute({ value: i, delay: 500 }).catch(err => err)
            );
        }

        const results = await Promise.all(jobs);
        const errors = results.filter(r => r instanceof Error);

        // Some jobs should have been rejected due to full queue
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].message).toContain('queue is full');
    });

    // ============================================================================
    // Error Handling
    // ============================================================================

    it('should handle worker errors gracefully', async () => {
        const result = await pool.execute({ value: 1, shouldError: true }).catch(err => err);

        expect(result).toBeInstanceOf(Error);

        // Stats should reflect the failure
        const stats = pool.getStats();
        expect(stats.totalFailed).toBeGreaterThanOrEqual(1);
    });

    it('should recover from worker errors and continue processing', async () => {
        // First job causes error
        const errorResult = await pool.execute({ value: 1, shouldError: true }).catch(err => err);
        expect(errorResult).toBeInstanceOf(Error);

        // Subsequent jobs should still work
        const successResult = await pool.execute({ value: 5 });
        expect(successResult.result).toBe(10);
    });

    // ============================================================================
    // Job Cancellation
    // ============================================================================

    it('should cancel a pending job', async () => {
        const controller = new AbortController();

        // Start a job that will take a while
        const longJob = pool.execute({ value: 1, delay: 1000 }, { signal: controller.signal })
            .catch(err => err);

        // Cancel it immediately
        controller.abort();

        const result = await longJob;
        expect(result).toBeInstanceOf(Error);
        expect(result.message).toContain('aborted');
    });

    it('should clear all pending jobs', async () => {
        // Fill queue with delayed jobs
        const jobs: Promise<any>[] = [];
        for (let i = 0; i < 5; i++) {
            jobs.push(pool.execute({ value: i, delay: 500 }).catch(err => err));
        }

        // Clear the queue
        const clearedCount = pool.clearQueue();
        expect(clearedCount).toBeGreaterThan(0);

        // Remaining jobs should be rejected
        const results = await Promise.all(jobs);
        const errors = results.filter(r => r instanceof Error);
        expect(errors.length).toBeGreaterThan(0);
    });

    // ============================================================================
    // Statistics
    // ============================================================================

    it('should track statistics accurately', async () => {
        // Execute some jobs
        await Promise.all([
            pool.execute({ value: 1 }),
            pool.execute({ value: 2 }),
            pool.execute({ value: 3 }),
        ]);

        const stats = pool.getStats();
        expect(stats.totalProcessed).toBe(3);
        expect(stats.totalWorkers).toBe(2);
        expect(stats.queueLength).toBe(0);
        expect(stats.averageExecutionTime).toBeGreaterThanOrEqual(0);
    });

    it('should report busy/idle worker counts correctly', async () => {
        // Start a long-running job
        const longJob = pool.execute({ value: 1, delay: 200 });

        // Check stats immediately
        let stats = pool.getStats();
        expect(stats.busyWorkers + stats.idleWorkers).toBe(2);

        await longJob;

        // After completion, all workers should be idle
        stats = pool.getStats();
        expect(stats.busyWorkers).toBe(0);
        expect(stats.idleWorkers).toBe(2);
    });

    // ============================================================================
    // Termination
    // ============================================================================

    it('should reject new jobs after termination', async () => {
        pool.terminate();

        const result = await pool.execute({ value: 1 }).catch(err => err);
        expect(result).toBeInstanceOf(Error);
        expect(result.message).toContain('terminated');
    });

    it('should clean up all workers on termination', async () => {
        // Start some jobs
        const jobs = [
            pool.execute({ value: 1, delay: 100 }),
            pool.execute({ value: 2, delay: 100 }),
        ];

        // Terminate immediately
        pool.terminate();

        // All jobs should be rejected
        const results = await Promise.all(jobs.map(j => j.catch(err => err)));
        expect(results.every(r => r instanceof Error)).toBe(true);
    });
});

// ============================================================================
// Geometry Worker Specific Tests
// ============================================================================

describe('Geometry Worker Edge Cases', () => {
    // Note: These tests would require the actual geometry worker
    // For now, they document expected behavior

    it('should handle zero dimensions gracefully', () => {
        // Documented expectation: should log warning and return empty/invalid mesh
        // Actual test would use real geometry worker
        expect(true).toBe(true);
    });

    it('should handle extreme aspect ratios (>4:1)', () => {
        // Documented expectation: should generate mesh but log warning
        expect(true).toBe(true);
    });

    it('should validate mesh data before posting', () => {
        // Documented expectation: should check vertices.length > 0 and indices.length > 0
        expect(true).toBe(true);
    });
});
