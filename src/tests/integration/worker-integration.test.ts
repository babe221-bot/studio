import { WorkerPool, WorkerPoolConfig } from '../../lib/WorkerPool';

// Mock Worker class
class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  id: string;

  constructor(stringUrl: string | URL, options?: WorkerOptions) {
    this.id = Math.random().toString(36).substr(2, 9);
  }

  postMessage(data: any) {
    // Handle special "crash" message
    if (data.crash) {
      setTimeout(() => {
        if (this.onerror) {
          this.onerror(
            new ErrorEvent('error', {
              message: 'Worker crashed intentionally',
              error: new Error('Worker crashed intentionally'),
            })
          );
        }
      }, 10);
      return;
    }

    // Handle special "slow" message
    if (data.slow) {
      setTimeout(() => {
        if (this.onmessage) {
          this.onmessage({ data: { result: 'success' } } as MessageEvent);
        }
      }, 100); // Slower than default
      return;
    }

    // Simulate normal async processing
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage({
          data: { result: 'success', input: data },
        } as MessageEvent);
      }
    }, 10);
  }

  terminate() {
    // cleanup
  }

  addEventListener(type: string, listener: EventListener) {
    if (type === 'message') this.onmessage = listener as any;
    if (type === 'error') this.onerror = listener as any;
  }

  removeEventListener(type: string, listener: EventListener) {
    if (type === 'message' && this.onmessage === listener)
      this.onmessage = null;
    if (type === 'error' && this.onerror === listener) this.onerror = null;
  }
}

// Inject MockWorker into global scope
global.Worker = MockWorker as any;

describe('WorkerPool Integration', () => {
  let pool: WorkerPool<any, any>;

  afterEach(() => {
    if (pool) {
      // cleanup if needed
      // pool.terminate();
    }
    jest.clearAllMocks();
  });

  it('should handle 100 concurrent jobs', async () => {
    pool = new WorkerPool({
      poolSize: 4,
      workerUrl: 'mock-worker.js',
      maxQueueSize: 200,
      debug: true,
    });

    const jobCount = 100;
    const jobs = Array.from({ length: jobCount }, (_, i) => ({ id: i }));

    const results = await Promise.all(jobs.map((job) => pool.execute(job)));

    expect(results).toHaveLength(jobCount);
    const stats = pool.getStats();
    expect(stats.totalProcessed).toBe(jobCount);
    expect(stats.totalFailed).toBe(0);
  }, 10000); // Increase timeout

  it('should handle worker crash recovery', async () => {
    pool = new WorkerPool({
      poolSize: 1, // Single worker to force crash impact
      workerUrl: 'mock-worker.js',
      debug: true,
    });

    // Submit a job that crashes the worker
    try {
      await pool.execute({ crash: true });
    } catch (e) {
      // Expected failure
      expect(e).toBeDefined();
    }

    const stats = pool.getStats();
    expect(stats.totalFailed).toBe(1);

    // Submit a normal job to verify recovery
    const result = await pool.execute({ id: 'recovery-test' });
    expect(result).toBeDefined();
    expect(pool.getStats().totalProcessed).toBe(1);
  });

  it('should reject jobs when queue is full', async () => {
    pool = new WorkerPool({
      poolSize: 1,
      workerUrl: 'mock-worker.js',
      maxQueueSize: 5, // Small queue
      debug: false,
    });

    // Fill the queue with slow jobs
    // 1 active + 5 queued = 6 accepted. 7th should fail.
    const promises: Promise<any>[] = [];

    // We need to fill it fast enough before they complete
    for (let i = 0; i < 10; i++) {
      promises.push(pool.execute({ slow: true }));
    }

    const results = await Promise.allSettled(promises);

    const rejected = results.filter((r) => r.status === 'rejected');
    expect(rejected.length).toBeGreaterThan(0);

    const rejectionReason = (rejected[0] as PromiseRejectedResult).reason;
    expect(rejectionReason.message).toBe('Job queue is full');
  });

  it('should cancel in-flight jobs', async () => {
    pool = new WorkerPool({
      poolSize: 2,
      workerUrl: 'mock-worker.js',
    });

    const controller = new AbortController();

    const jobPromise = pool.execute(
      { slow: true },
      { signal: controller.signal }
    );

    // Abort immediately
    controller.abort();

    await expect(jobPromise).rejects.toThrow('Job was aborted');
  });
});
