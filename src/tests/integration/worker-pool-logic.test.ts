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
