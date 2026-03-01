# Debugging & Testing Plan

## Executive Summary

This plan outlines a systematic approach to debugging and testing for the Studio CAD application. The focus is on identifying critical failure points, implementing diagnostic logging, and establishing validation checkpoints before applying fixes.

---

## 1. Problem Source Analysis

### 1.1 Five Potential Problem Sources (Initial Assessment)

| # | Source | Risk Level | Description |
|---|--------|------------|-------------|
| 1 | **Web Worker Pool** | HIGH | Worker lifecycle, job queue management, message passing failures |
| 2 | **CAD Geometry Processing** | HIGH | Three.js mesh generation, dimension edge cases, validation logic |
| 3 | **API Integration Layer** | MEDIUM | CORS issues, serialization mismatches, endpoint failures |
| 4 | **State Management (Lab Component)** | MEDIUM | Form state sync, price calculation cascades, validation timing |
| 5 | **Supabase/Data Layer** | MEDIUM | Connection drops, query timeouts, RLS policy conflicts |
| 6 | **Authentication Flow** | LOW | Guest session expiry, token refresh issues |
| 7 | **PDF Generation** | LOW | Memory issues with complex geometries, font loading |

### 1.2 Primary Suspects (Top 2)

Based on code complexity and failure impact:

#### **Source A: Web Worker Pool ([`src/lib/WorkerPool.ts`](src/lib/WorkerPool.ts:1))**
- **Why**: Manages concurrent geometry processing with complex async patterns
- **Risk Factors**:
  - Worker termination without cleanup
  - Job queue overflow (maxQueueSize: 100)
  - Message deserialization errors
  - Cross-origin worker loading issues
  - Timeout handling for stuck jobs

#### **Source B: CAD Geometry Processing ([`src/workers/geometryWorker.ts`](src/workers/geometryWorker.ts:1))**
- **Why**: Handles 3D mesh generation with mathematical edge cases
- **Risk Factors**:
  - Zero/negative dimension handling
  - Extreme aspect ratios (> 4:1)
  - Memory pressure from complex geometries
  - Three.js buffer allocation failures
  - Precision errors in calculations

---

## 2. Diagnostic Logging Plan

### 2.1 Worker Pool Logging ([`src/lib/WorkerPool.ts`](src/lib/WorkerPool.ts:1))

Add debug logging at these critical points:

```typescript
// Location: WorkerPool.ts - add to constructor and key methods

// 1. Worker creation/termination
console.debug(`[WorkerPool] Worker ${id} created/terminated`);

// 2. Job submission
console.debug(`[WorkerPool] Job ${jobId} submitted, queue length: ${queueLength}`);

// 3. Job execution start/complete
console.debug(`[WorkerPool] Job ${jobId} started on worker ${workerId}`);
console.debug(`[WorkerPool] Job ${jobId} completed in ${duration}ms`);

// 4. Error conditions
console.error(`[WorkerPool] Worker ${id} crashed:`, error);
console.error(`[WorkerPool] Job ${jobId} failed:`, error);

// 5. Statistics snapshot
console.debug(`[WorkerPool] Stats:`, this.getStats());
```

### 2.2 Geometry Worker Logging ([`src/workers/geometryWorker.ts`](src/workers/geometryWorker.ts:1))

```typescript
// Add at message handler entry point
console.debug('[GeometryWorker] Received message:', message.type);

// Add before mesh generation
console.debug('[GeometryWorker] Generating mesh with dimensions:', dimensions);

// Add validation checkpoints
console.debug('[GeometryWorker] Validation passed:', validationResult);
console.warn('[GeometryWorker] Validation warnings:', warnings);

// Add error handling
console.error('[GeometryWorker] Processing error:', error);
```

### 2.3 API Endpoint Logging ([`backend/app/api/cad.py`](backend/app/api/cad.py:1))

```python
# Add to analyze_geometry endpoint
logger.info(f"[CAD API] analyze_geometry called with dimensions: {dimensions}")
logger.debug(f"[CAD API] Validation result: {validation}")
logger.warning(f"[CAD API] Warnings generated: {warnings}")
```

---

## 3. Validation Checkpoints

### 3.1 Pre-Execution Checks

| Checkpoint | Location | Validation |
|------------|----------|------------|
| Worker Health | WorkerPool constructor | All workers initialized successfully |
| Job Parameters | WorkerPool.execute() | Input validation before queueing |
| Geometry Input | geometryWorker | Dimension bounds checking |
| API Request | FastAPI endpoints | Pydantic schema validation |

### 3.2 Runtime Monitoring

```typescript
// Add to WorkerPool.getStats() usage
const stats = workerPool.getStats();
if (stats.queueLength > 80) {
  console.warn('[WorkerPool] Queue approaching limit:', stats.queueLength);
}
if (stats.totalFailed / stats.totalProcessed > 0.1) {
  console.error('[WorkerPool] Failure rate > 10%');
}
```

### 3.3 Post-Execution Validation

```typescript
// Verify mesh generation result
if (!mesh || !mesh.vertices || mesh.vertices.length === 0) {
  throw new Error('Invalid mesh generated');
}

// Verify calculation accuracy
const expectedArea = dimensions.length * dimensions.width;
const variance = Math.abs(result.area - expectedArea) / expectedArea;
if (variance > 0.01) {
  console.warn(`[Geometry] Area calculation variance: ${variance * 100}%`);
}
```

---

## 4. Testing Strategy

### 4.1 Unit Tests (Jest)

Current: [`src/tests/*.test.ts`](src/tests/warehouseService.test.ts:1)

**Missing Coverage Areas**:
- WorkerPool job queue management
- Worker error recovery
- Geometry calculation edge cases
- ResourceManager cleanup

### 4.2 Integration Tests

**New: Create `src/tests/integration/worker-integration.test.ts`**

Test scenarios:
- Submit 100 concurrent geometry jobs
- Worker crash recovery
- Queue overflow handling
- Cancel in-flight jobs

### 4.3 E2E Tests (Playwright)

Current: [`tests/e2e/*.spec.ts`](tests/e2e/lab.spec.ts:1)

**Missing Scenarios**:
- Extreme dimension input (350cm+ lengths)
- Rapid dimension changes (debouncing)
- 3D canvas interactions
- PDF export workflow

### 4.4 Python Backend Tests

Current: [`backend/tests/`](backend/tests/test_api_endpoints.py:1)

**Recommended Additions**:
- Load testing for analyze_geometry endpoint
- Concurrent request handling
- Database connection pool exhaustion

---

## 5. Reproduction Scenarios

### Scenario A: Worker Pool Exhaustion

**Steps**:
1. Open application
2. Rapidly change dimensions 50+ times
3. Monitor WorkerPool stats

**Expected Log Output**:
```
[WorkerPool] Queue length: 52
[WorkerPool] Warning: Queue at 52% capacity
[WorkerPool] Worker 2 crashed: DataCloneError
[WorkerPool] Auto-recovering worker 2
```

### Scenario B: Geometry Edge Case

**Steps**:
1. Set dimensions: length=0, width=100, height=2
2. Observe mesh generation

**Expected Behavior**:
- Validation catches zero dimension
- Warning displayed to user
- No crash

### Scenario C: API Timeout

**Steps**:
1. Throttle network to 3G
2. Request layout optimization with 20+ items
3. Observe timeout handling

**Expected Behavior**:
- Request times out after 30s
- User sees error message
- Retry mechanism offered

---

## 6. Debugging Workflow

### Phase 1: Reproduction (User Action Required)
- [ ] Run the application with `npm run dev`
- [ ] Open browser DevTools, enable "Verbose" logging
- [ ] Execute reproduction scenario
- [ ] Capture console output and network logs
- [ ] Document exact error messages and stack traces

### Phase 2: Diagnosis
- [ ] Review logs against checkpoints in Section 3
- [ ] Identify which validation point failed
- [ ] Confirm hypothesis from Section 1.2
- [ ] Document root cause

### Phase 3: Validation (Before Fix)
**User must confirm diagnosis before proceeding**
- [ ] Does the log output match expected failure mode?
- [ ] Can the issue be reproduced consistently?
- [ ] Is the root cause identified correctly?

### Phase 4: Fix Implementation
- [ ] Apply targeted fix
- [ ] Add regression test
- [ ] Verify fix with reproduction scenario

---

## 7. Tools & Commands

### Running Tests

```bash
# Frontend unit tests
npm test

# E2E tests
npx playwright test

# Backend tests
cd backend && pytest tests/ -v

# With coverage
npm test -- --coverage
pytest tests/ --cov=app --cov-report=html
```

### Debug Commands

```bash
# Start with debug logging
DEBUG=* npm run dev

# Python debug mode
cd backend && uvicorn app.main:app --reload --log-level debug
```

---

## 8. Success Criteria

Before marking debugging complete, verify:

1. **All reproduction scenarios pass** without errors
2. **WorkerPool stats** show <5% failure rate
3. **API response times** <500ms for analyze_geometry
4. **No console errors** during normal operation
5. **All existing tests** continue to pass

---

## Next Steps

1. **User Action**: Confirm this diagnosis approach is acceptable
2. **Add Logging**: Implement debug logging from Section 2
3. **Run Scenarios**: Execute reproduction scenarios from Section 5
4. **Review Results**: Analyze logs to confirm problem sources
5. **Proceed with Fixes**: Only after diagnosis confirmation

---

*Document Version: 1.0*
*Created: 2026-03-01*
*Review Required: Before implementing any fixes*
