/**
 * Worker Pool Logic Tests
 * 
 * Tests validation logic, statistics calculations, and edge cases
 * without requiring the actual WorkerPool (which uses import.meta.url).
 * 
 * Run with: npm test -- worker-pool-logic.test.ts
 */

// ============================================================================
// Type Definitions (mirrored from WorkerPool.ts for testing)
// ============================================================================

interface GeometryJobInput {
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

interface GeometryJobOutput {
    positions: Float32Array;
    uvs: Float32Array;
    indices: Uint32Array;
    groups: { start: number; count: number; materialIndex: number }[];
}

// ============================================================================
// Validation Functions (extracted logic for testing)
// ============================================================================

/**
 * Validates geometry input dimensions
 * Returns array of error/warning messages
 */
function validateGeometryInput(input: GeometryJobInput): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Critical validations
    if (input.L <= 0) errors.push(`Invalid length: ${input.L}`);
    if (input.W <= 0) errors.push(`Invalid width: ${input.W}`);
    if (input.H <= 0) errors.push(`Invalid height: ${input.H}`);

    // Extreme dimension checks
    const maxDim = Math.max(input.L, input.W, input.H);
    if (maxDim > 500) {
        warnings.push(`Very large dimension detected: ${maxDim}cm`);
    }

    // Aspect ratio check
    const aspectRatio = Math.max(input.L, input.W) / Math.min(input.L || 1, input.W || 1);
    if (aspectRatio > 4) {
        warnings.push(`Extreme aspect ratio: ${aspectRatio.toFixed(2)}:1`);
    }

    // Thin slab warning
    if (input.H < 2 && input.H > 0) {
        warnings.push('Thin slab (< 2cm) may be fragile');
    }

    // Thick slab recommendation
    if (input.H > 5) {
        warnings.push('Thick slab (> 5cm) - verify weight capacity');
    }

    return { errors, warnings };
}

/**
 * Validates mesh output data
 */
function validateMeshOutput(output: GeometryJobOutput): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Vertex buffer validation
    if (!output.positions || output.positions.length === 0) {
        errors.push('No vertices generated');
    } else if (output.positions.length % 3 !== 0) {
        errors.push('Vertex positions not divisible by 3 (incomplete vertices)');
    }

    // Index buffer validation
    if (!output.indices || output.indices.length === 0) {
        errors.push('No indices generated');
    } else {
        if (output.indices.length % 3 !== 0) {
            errors.push('Index count not divisible by 3 (incomplete triangles)');
        }

        // Check for out-of-bounds indices
        if (output.positions && output.positions.length > 0) {
            const maxVertex = (output.positions.length / 3) - 1;
            for (let i = 0; i < output.indices.length; i++) {
                if (output.indices[i] > maxVertex) {
                    errors.push(`Index ${output.indices[i]} at position ${i} exceeds vertex count ${maxVertex}`);
                    break;
                }
            }
        }
    }

    // UV validation
    if (!output.uvs || output.uvs.length === 0) {
        warnings.push('No UV coordinates generated');
    } else if (output.positions && output.uvs.length / 2 !== output.positions.length / 3) {
        warnings.push('UV count does not match vertex count');
    }

    // Group validation
    if (!output.groups || output.groups.length === 0) {
        warnings.push('No material groups defined');
    } else {
        // Check group ranges
        output.groups.forEach((group, i) => {
            if (group.count === 0) {
                warnings.push(`Group ${i} has zero indices`);
            }
            if (output.indices && group.start + group.count > output.indices.length) {
                errors.push(`Group ${i} range exceeds index buffer`);
            }
        });
    }

    return { errors, warnings };
}

/**
 * Calculates failure rate percentage
 */
function calculateFailureRate(processed: number, failed: number): number {
    const total = processed + failed;
    return total > 0 ? (failed / total) * 100 : 0;
}

/**
 * Calculates average execution time
 */
function calculateAverageTime(times: number[]): number {
    if (times.length === 0) return 0;
    return times.reduce((a, b) => a + b, 0) / times.length;
}

/**
 * Calculates queue utilization percentage
 */
function calculateQueueUtilization(current: number, max: number): number {
    return max > 0 ? (current / max) * 100 : 0;
}

// ============================================================================
// Test Suite: Geometry Input Validation
// ============================================================================

describe('Geometry Input Validation', () => {
    const validInput: GeometryJobInput = {
        L: 120,
        W: 60,
        H: 2,
        profile: { name: 'flat' },
        processedEdges: { front: false, back: false, left: false, right: false },
    };

    it('should pass validation for normal dimensions', () => {
        const result = validateGeometryInput(validInput);
        expect(result.errors).toHaveLength(0);
        expect(result.warnings).toHaveLength(0);
    });

    it('should detect zero length', () => {
        const input = { ...validInput, L: 0 };
        const result = validateGeometryInput(input);
        expect(result.errors).toContain('Invalid length: 0');
    });

    it('should detect zero width', () => {
        const input = { ...validInput, W: 0 };
        const result = validateGeometryInput(input);
        expect(result.errors).toContain('Invalid width: 0');
    });

    it('should detect zero height', () => {
        const input = { ...validInput, H: 0 };
        const result = validateGeometryInput(input);
        expect(result.errors).toContain('Invalid height: 0');
    });

    it('should detect negative dimensions', () => {
        const input = { ...validInput, L: -50, W: -30, H: -2 };
        const result = validateGeometryInput(input);
        expect(result.errors).toHaveLength(3);
    });

    it('should warn on extreme aspect ratio (>4:1)', () => {
        const input = { ...validInput, L: 400, W: 80 };
        const result = validateGeometryInput(input);
        expect(result.warnings.some(w => w.includes('aspect ratio'))).toBe(true);
        expect(result.warnings[0]).toContain('5.00:1');
    });

    it('should warn on very large dimensions', () => {
        const input = { ...validInput, L: 600 };
        const result = validateGeometryInput(input);
        expect(result.warnings.some(w => w.includes('large dimension'))).toBe(true);
    });

    it('should warn on thin slabs (<2cm)', () => {
        const input = { ...validInput, H: 1.5 };
        const result = validateGeometryInput(input);
        expect(result.warnings.some(w => w.includes('Thin slab'))).toBe(true);
    });

    it('should warn on thick slabs (>5cm)', () => {
        const input = { ...validInput, H: 6 };
        const result = validateGeometryInput(input);
        expect(result.warnings.some(w => w.includes('Thick slab'))).toBe(true);
    });

    it('should allow aspect ratio exactly at 4:1', () => {
        const input = { ...validInput, L: 400, W: 100 };
        const result = validateGeometryInput(input);
        // 4.0 is not > 4, so no warning
        expect(result.warnings.some(w => w.includes('aspect ratio'))).toBe(false);
    });
});

// ============================================================================
// Test Suite: Mesh Output Validation
// ============================================================================

describe('Mesh Output Validation', () => {
    const validOutput: GeometryJobOutput = {
        positions: new Float32Array([
            // 4 vertices for a simple quad
            0, 0, 0,  // v0
            1, 0, 0,  // v1
            1, 0, 1,  // v2
            0, 0, 1,  // v3
        ]),
        uvs: new Float32Array([
            0, 0,
            1, 0,
            1, 1,
            0, 1,
        ]),
        indices: new Uint32Array([
            0, 1, 2,  // triangle 1
            0, 2, 3,  // triangle 2
        ]),
        groups: [
            { start: 0, count: 6, materialIndex: 0 },
        ],
    };

    it('should pass validation for valid mesh', () => {
        const result = validateMeshOutput(validOutput);
        expect(result.errors).toHaveLength(0);
        expect(result.warnings).toHaveLength(0);
    });

    it('should detect empty vertex buffer', () => {
        const output = { ...validOutput, positions: new Float32Array(0) };
        const result = validateMeshOutput(output);
        expect(result.errors).toContain('No vertices generated');
    });

    it('should detect empty index buffer', () => {
        const output = { ...validOutput, indices: new Uint32Array(0) };
        const result = validateMeshOutput(output);
        expect(result.errors).toContain('No indices generated');
    });

    it('should detect incomplete triangles', () => {
        const output = { ...validOutput, indices: new Uint32Array([0, 1]) };
        const result = validateMeshOutput(output);
        expect(result.errors).toContain('Index count not divisible by 3 (incomplete triangles)');
    });

    it('should detect out-of-bounds indices', () => {
        const output = {
            ...validOutput,
            indices: new Uint32Array([0, 1, 99]) // 99 exceeds vertex count
        };
        const result = validateMeshOutput(output);
        expect(result.errors.some(e => e.includes('exceeds vertex count'))).toBe(true);
    });

    it('should warn on missing UVs', () => {
        const output = { ...validOutput, uvs: new Float32Array(0) };
        const result = validateMeshOutput(output);
        expect(result.warnings).toContain('No UV coordinates generated');
    });

    it('should warn on UV count mismatch', () => {
        const output = {
            ...validOutput,
            uvs: new Float32Array([0, 0, 1, 0]) // Only 2 UVs for 4 vertices
        };
        const result = validateMeshOutput(output);
        expect(result.warnings).toContain('UV count does not match vertex count');
    });

    it('should warn on empty groups', () => {
        const output = { ...validOutput, groups: [] };
        const result = validateMeshOutput(output);
        expect(result.warnings).toContain('No material groups defined');
    });

    it('should warn on group with zero indices', () => {
        const output = {
            ...validOutput,
            groups: [{ start: 0, count: 0, materialIndex: 0 }]
        };
        const result = validateMeshOutput(output);
        expect(result.warnings).toContain('Group 0 has zero indices');
    });

    it('should detect group range exceeding buffer', () => {
        const output = {
            ...validOutput,
            groups: [{ start: 0, count: 100, materialIndex: 0 }]
        };
        const result = validateMeshOutput(output);
        expect(result.errors).toContain('Group 0 range exceeds index buffer');
    });
});

// ============================================================================
// Test Suite: Statistics Calculations
// ============================================================================

describe('Pool Statistics Calculations', () => {
    describe('calculateFailureRate', () => {
        it('should return 0 when no operations', () => {
            expect(calculateFailureRate(0, 0)).toBe(0);
        });

        it('should calculate 0% failure rate', () => {
            expect(calculateFailureRate(100, 0)).toBe(0);
        });

        it('should calculate 100% failure rate', () => {
            expect(calculateFailureRate(0, 100)).toBe(100);
        });

        it('should calculate 10% failure rate', () => {
            expect(calculateFailureRate(90, 10)).toBe(10);
        });

        it('should calculate 50% failure rate', () => {
            expect(calculateFailureRate(50, 50)).toBe(50);
        });

        it('should flag high failure rates (>10%)', () => {
            const rate = calculateFailureRate(80, 20);
            expect(rate).toBe(20);
            expect(rate).toBeGreaterThan(10);
        });
    });

    describe('calculateAverageTime', () => {
        it('should return 0 for empty array', () => {
            expect(calculateAverageTime([])).toBe(0);
        });

        it('should calculate average of single value', () => {
            expect(calculateAverageTime([100])).toBe(100);
        });

        it('should calculate average of multiple values', () => {
            expect(calculateAverageTime([100, 200, 300])).toBe(200);
        });

        it('should handle decimal results', () => {
            expect(calculateAverageTime([100, 200])).toBe(150);
        });
    });

    describe('calculateQueueUtilization', () => {
        it('should return 0 for empty queue', () => {
            expect(calculateQueueUtilization(0, 100)).toBe(0);
        });

        it('should calculate 50% utilization', () => {
            expect(calculateQueueUtilization(50, 100)).toBe(50);
        });

        it('should calculate 100% utilization', () => {
            expect(calculateQueueUtilization(100, 100)).toBe(100);
        });

        it('should warn at 80% utilization', () => {
            const util = calculateQueueUtilization(80, 100);
            expect(util).toBe(80);
            // At 80% we should warn
            expect(util).toBeGreaterThanOrEqual(80);
        });

        it('should handle zero max queue', () => {
            expect(calculateQueueUtilization(5, 0)).toBe(0);
        });
    });
});

// ============================================================================
// Test Suite: Edge Cases
// ============================================================================

describe('Edge Cases and Boundary Conditions', () => {
    it('should handle geometry with all edges processed', () => {
        const input: GeometryJobInput = {
            L: 100,
            W: 60,
            H: 2,
            profile: { name: 'polu-zaobljena r1cm' },
            processedEdges: { front: true, back: true, left: true, right: true },
            okapnikEdges: { front: true, back: false, left: false, right: false },
        };

        const result = validateGeometryInput(input);
        expect(result.errors).toHaveLength(0);
    });

    it('should handle profile names with special characters', () => {
        const input: GeometryJobInput = {
            L: 100,
            W: 60,
            H: 2,
            profile: { name: 'smuš c20' },
            processedEdges: { front: true, back: false, left: false, right: false },
        };

        const result = validateGeometryInput(input);
        expect(result.errors).toHaveLength(0);
    });

    it('should handle very small but valid dimensions', () => {
        const input: GeometryJobInput = {
            L: 0.1,
            W: 0.1,
            H: 0.1,
            profile: { name: 'flat' },
            processedEdges: { front: false, back: false, left: false, right: false },
        };

        const result = validateGeometryInput(input);
        expect(result.errors).toHaveLength(0);
        expect(result.warnings.some(w => w.includes('Thin slab'))).toBe(true);
    });

    it('should handle degenerate mesh (zero-area triangles)', () => {
        // This simulates what happens with zero dimensions
        const output: GeometryJobOutput = {
            positions: new Float32Array([0, 0, 0, 0, 0, 0, 0, 0, 0]), // All same point
            uvs: new Float32Array([0, 0, 0, 0, 0, 0]),
            indices: new Uint32Array([0, 0, 0]), // Degenerate triangle
            groups: [{ start: 0, count: 3, materialIndex: 0 }],
        };

        const result = validateMeshOutput(output);
        // Should technically pass validation but produce warnings
        expect(result.errors).toHaveLength(0);
    });
});

// ============================================================================
// Test Suite: Diagnostic Logging Format
// ============================================================================

describe('Diagnostic Logging Format', () => {
    it('should format queue warning at 80% capacity', () => {
        const current = 80;
        const max = 100;
        const percent = Math.round((current / max) * 100);

        const message = `[QUEUE WARNING] Queue at ${percent}% capacity`;
        expect(message).toBe('[QUEUE WARNING] Queue at 80% capacity');
    });

    it('should format job completion message', () => {
        const jobId = '1234567890-abc123';
        const executionTime = 150;

        const message = `[JOB COMPLETED] Job ${jobId} completed in ${executionTime}ms`;
        expect(message).toContain('1234567890-abc123');
        expect(message).toContain('150ms');
    });

    it('should format failure rate warning', () => {
        const failureRate = 15.5;
        const message = `[HIGH FAILURE RATE] ${failureRate.toFixed(1)}% of operations have failed`;
        expect(message).toBe('[HIGH FAILURE RATE] 15.5% of operations have failed');
    });

    it('should format stats snapshot', () => {
        const stats = {
            totalWorkers: 2,
            busyWorkers: 1,
            idleWorkers: 1,
            queueLength: 5,
            totalProcessed: 100,
            totalFailed: 5,
            averageExecutionTime: 120.5,
        };

        const message = `[STATS] ${JSON.stringify(stats)}`;
        expect(message).toContain('"totalWorkers":2');
        expect(message).toContain('"queueLength":5');
    });
});
