import re

with open('src/lib/WorkerPool.ts', 'r') as f:
    content = f.read()

# 1. createWorker log
content = content.replace(
    "const worker = new Worker(this.config.workerUrl, { type: 'module' });",
    "console.debug(`[WorkerPool] Worker ${id} created`);\n            const worker = new Worker(this.config.workerUrl, { type: 'module' });"
)

# 1. terminateWorker log
content = content.replace(
    "state.worker.terminate();",
    "state.worker.terminate();\n            console.debug(`[WorkerPool] Worker ${state.id} terminated`);"
)

# 2. Job submission
content = content.replace(
    "this.log(`[JOB QUEUED] Job ${job.id} queued, queue length: ${this.jobQueue.length}`);",
    "console.debug(`[WorkerPool] Job ${job.id} submitted, queue length: ${this.jobQueue.length}`);\n            this.log(`[JOB QUEUED] Job ${job.id} queued, queue length: ${this.jobQueue.length}`);"
)

# 3. execution start/complete
content = content.replace(
    "state.currentJob = job.id;",
    "state.currentJob = job.id;\n            console.debug(`[WorkerPool] Job ${job.id} started on worker ${state.id}`);"
)
content = content.replace(
    "this.stats.executionTimes.push(duration);",
    "this.stats.executionTimes.push(duration);\n            console.debug(`[WorkerPool] Job ${job.id} completed in ${duration}ms`);"
)

# 4. Error conditions
content = content.replace(
    "this.log(`[WORKER ERROR] Worker ${state.id} error:`, error);",
    "console.error(`[WorkerPool] Worker ${state.id} crashed:`, error);\n        this.log(`[WORKER ERROR] Worker ${state.id} error:`, error);"
)
content = content.replace(
    "this.log(`[JOB FAILED] Job ${job.id} failed:`, jobError);",
    "console.error(`[WorkerPool] Job ${job.id} failed:`, jobError);\n                this.log(`[JOB FAILED] Job ${job.id} failed:`, jobError);"
)
content = content.replace(
    "this.log(`[WORKER TIMEOUT] Job ${job.id} timed out after ${job.timeout}ms on worker ${state.id}`);",
    "console.error(`[WorkerPool] Job ${job.id} failed:`, new Error(`Timeout after ${job.timeout}ms`));\n                this.log(`[WORKER TIMEOUT] Job ${job.id} timed out after ${job.timeout}ms on worker ${state.id}`);"
)

# 5. Statistics snapshot
content = content.replace(
    "this.log('[STATS]', JSON.stringify(stats));",
    "console.debug(`[WorkerPool] Stats:`, stats);\n            this.log('[STATS]', JSON.stringify(stats));"
)

with open('src/lib/WorkerPool.ts', 'w') as f:
    f.write(content)
