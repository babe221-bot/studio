/**
 * PDF Generation Tests for Guest Users
 * 
 * Tests PDF generation functionality in the context of guest sessions,
 * including validation, error handling, and edge cases.
 * 
 * Run with: npm test -- pdf-generation-guest.test.ts
 */

import type { OrderItem, Material, SurfaceFinish, EdgeProfile, ProcessedEdges } from '@/types';

// ============================================================================
// Mock Data Factories
// ============================================================================

function createMockMaterial(overrides?: Partial<Material>): Material {
    return {
        id: 1,
        name: 'Plano',
        density: 2.7,
        cost_sqm: 220,
        texture: 'https://example.com/plano.png',
        color: '#EAE6D9',
        ...overrides,
    };
}

function createMockFinish(overrides?: Partial<SurfaceFinish>): SurfaceFinish {
    return {
        id: 1,
        name: 'Poliranje (Polished)',
        cost_sqm: 15,
        ...overrides,
    };
}

function createMockProfile(overrides?: Partial<EdgeProfile>): EdgeProfile {
    return {
        id: 1,
        name: 'Ravni rez',
        cost_m: 0,
        ...overrides,
    };
}

function createMockProcessedEdges(overrides?: Partial<ProcessedEdges>): ProcessedEdges {
    return {
        front: false,
        back: false,
        left: false,
        right: false,
        ...overrides,
    };
}

function createMockOrderItem(overrides?: Partial<OrderItem>): OrderItem {
    return {
        orderId: 1,
        id: 'ST-001',
        dims: {
            length: 120,
            width: 60,
            height: 2,
        },
        material: createMockMaterial(),
        finish: createMockFinish(),
        profile: createMockProfile(),
        processedEdges: createMockProcessedEdges(),
        okapnikEdges: createMockProcessedEdges(),
        totalCost: 150.0,
        orderUnit: 'piece',
        quantity: 1,
        ...overrides,
    };
}

// ============================================================================
// PDF Validation Functions (extracted from pdf-enhanced.ts for testing)
// ============================================================================

interface PdfValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Validates order items before PDF generation
 */
function validateOrderItems(items: OrderItem[]): PdfValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!items || items.length === 0) {
        errors.push('No order items provided');
        return { isValid: false, errors, warnings };
    }

    items.forEach((item, index) => {
        const itemPrefix = `Item ${index + 1} (${item.id || 'unknown'}):`;

        // Required fields validation
        if (!item.id) {
            errors.push(`${itemPrefix} Missing item ID`);
        }

        if (!item.material?.name) {
            errors.push(`${itemPrefix} Missing material name`);
        }

        if (!item.finish?.name) {
            errors.push(`${itemPrefix} Missing finish name`);
        }

        if (!item.profile?.name) {
            errors.push(`${itemPrefix} Missing profile name`);
        }

        // Dimension validation
        if (item.dims) {
            if (item.dims.length <= 0) {
                errors.push(`${itemPrefix} Invalid length: ${item.dims.length}`);
            }
            if (item.dims.width <= 0) {
                errors.push(`${itemPrefix} Invalid width: ${item.dims.width}`);
            }
            if (item.dims.height <= 0) {
                errors.push(`${itemPrefix} Invalid height: ${item.dims.height}`);
            }

            // Extreme dimension warnings
            if (item.dims.length > 500 || item.dims.width > 500) {
                warnings.push(`${itemPrefix} Very large dimensions may not fit on PDF page`);
            }

            // Aspect ratio warning
            const aspectRatio = Math.max(item.dims.length, item.dims.width) /
                Math.min(item.dims.length || 1, item.dims.width || 1);
            if (aspectRatio > 4) {
                warnings.push(`${itemPrefix} Extreme aspect ratio (${aspectRatio.toFixed(2)}:1) may affect drawing`);
            }
        } else {
            errors.push(`${itemPrefix} Missing dimensions`);
        }

        // Cost validation
        if (item.totalCost < 0) {
            errors.push(`${itemPrefix} Negative cost: ${item.totalCost}`);
        }
        if (item.totalCost === 0) {
            warnings.push(`${itemPrefix} Zero cost - verify pricing`);
        }

        // Quantity validation
        if (item.quantity <= 0) {
            errors.push(`${itemPrefix} Invalid quantity: ${item.quantity}`);
        }

        // Order unit validation
        const validUnits = ['piece', 'sqm', 'lm'];
        if (!validUnits.includes(item.orderUnit)) {
            errors.push(`${itemPrefix} Invalid order unit: ${item.orderUnit}`);
        }

        // Edge processing validation
        if (item.processedEdges) {
            const hasAnyEdge = Object.values(item.processedEdges).some(v => v);
            if (!hasAnyEdge) {
                warnings.push(`${itemPrefix} No edges processed`);
            }
        }
    });

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
    };
}

/**
 * Validates PDF generation options
 */
function validatePdfOptions(options: {
    companyName?: string;
    customerName?: string;
    orderNumber?: string;
    notes?: string;
}): PdfValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Company name validation
    if (options.companyName && options.companyName.length > 100) {
        warnings.push('Company name is very long and may be truncated in PDF');
    }

    // Customer name validation (guest user context)
    if (!options.customerName) {
        warnings.push('No customer name provided - PDF will show as anonymous/guest');
    }

    // Order number validation
    if (options.orderNumber) {
        if (options.orderNumber.length > 50) {
            warnings.push('Order number is very long');
        }
    } else {
        warnings.push('No order number provided - will use auto-generated number');
    }

    // Notes validation
    if (options.notes && options.notes.length > 2000) {
        warnings.push('Notes are very long and may span multiple pages');
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
    };
}

/**
 * Validates edge names mapping
 */
function validateEdgeNames(edgeNames: Record<string, string>): PdfValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const requiredEdges = ['front', 'back', 'left', 'right'];

    requiredEdges.forEach(edge => {
        if (!(edge in edgeNames)) {
            warnings.push(`Missing translation for edge: ${edge}`);
        }
    });

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
    };
}

/**
 * Calculates estimated PDF size based on content
 */
function estimatePdfSize(items: OrderItem[], options: { notes?: string }): {
    estimatedPages: number;
    estimatedSizeKB: number;
    warnings: string[];
} {
    const warnings: string[] = [];

    // Base size for header/footer
    let estimatedSizeKB = 50;

    // Each item adds approximately 100-200KB (depending on images)
    estimatedSizeKB += items.length * 150;

    // Notes add size
    if (options.notes) {
        estimatedSizeKB += options.notes.length / 100;
    }

    // Estimate pages (roughly 1-2 pages per item)
    const estimatedPages = Math.ceil(items.length * 1.5) + 1;

    // Warnings for large PDFs
    if (estimatedSizeKB > 1000) {
        warnings.push(`Estimated PDF size is ${(estimatedSizeKB / 1024).toFixed(1)}MB - may take longer to generate`);
    }
    if (estimatedPages > 10) {
        warnings.push(`Estimated ${estimatedPages} pages - consider splitting into multiple PDFs`);
    }

    return { estimatedPages, estimatedSizeKB, warnings };
}

// ============================================================================
// Guest User Context Helpers
// ============================================================================

/**
 * Checks if running in guest mode
 */
function isGuestUser(customerName?: string, userEmail?: string): boolean {
    if (!customerName && !userEmail) return true;
    if (userEmail?.includes('@guest.studio.local')) return true;
    if (customerName?.toLowerCase().includes('gost')) return true;
    return false;
}

/**
 * Generates appropriate filename for guest users
 */
function generatePdfFilename(orderNumber: string, isGuest: boolean): string {
    const date = new Date().toISOString().split('T')[0];
    const prefix = isGuest ? 'Ponuda' : 'Radni_Nalog';
    return `${prefix}_${orderNumber}_${date}.pdf`;
}

// ============================================================================
// Test Suite: Order Item Validation
// ============================================================================

describe('PDF Generation - Order Item Validation', () => {
    it('should validate a complete order item', () => {
        const items = [createMockOrderItem()];
        const result = validateOrderItems(items);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('should reject empty order items array', () => {
        const result = validateOrderItems([]);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('No order items provided');
    });

    it('should reject null/undefined order items', () => {
        const result = validateOrderItems(null as any);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('No order items provided');
    });

    it('should detect missing material name', () => {
        const items = [createMockOrderItem({ material: createMockMaterial({ name: '' }) })];
        const result = validateOrderItems(items);

        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('Missing material name'))).toBe(true);
    });

    it('should detect zero dimensions', () => {
        const items = [createMockOrderItem({
            dims: { length: 0, width: 60, height: 2 }
        })];
        const result = validateOrderItems(items);

        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('Invalid length'))).toBe(true);
    });

    it('should detect negative dimensions', () => {
        const items = [createMockOrderItem({
            dims: { length: -10, width: -5, height: -2 }
        })];
        const result = validateOrderItems(items);

        expect(result.errors).toHaveLength(3);
        expect(result.errors.every(e => e.includes('Invalid'))).toBe(true);
    });

    it('should warn on extreme aspect ratios', () => {
        const items = [createMockOrderItem({
            dims: { length: 400, width: 80, height: 2 }
        })];
        const result = validateOrderItems(items);

        expect(result.warnings.some(w => w.includes('Extreme aspect ratio'))).toBe(true);
    });

    it('should detect negative cost', () => {
        const items = [createMockOrderItem({ totalCost: -50 })];
        const result = validateOrderItems(items);

        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('Negative cost'))).toBe(true);
    });

    it('should warn on zero cost', () => {
        const items = [createMockOrderItem({ totalCost: 0 })];
        const result = validateOrderItems(items);

        expect(result.isValid).toBe(true);
        expect(result.warnings.some(w => w.includes('Zero cost'))).toBe(true);
    });

    it('should detect invalid quantity', () => {
        const items = [createMockOrderItem({ quantity: 0 })];
        const result = validateOrderItems(items);

        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('Invalid quantity'))).toBe(true);
    });

    it('should detect invalid order unit', () => {
        const items = [createMockOrderItem({ orderUnit: 'invalid' as any })];
        const result = validateOrderItems(items);

        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('Invalid order unit'))).toBe(true);
    });

    it('should validate multiple items', () => {
        const items = [
            createMockOrderItem({ id: 'ST-001' }),
            createMockOrderItem({ id: 'ST-002' }),
            createMockOrderItem({ id: 'ST-003' }),
        ];
        const result = validateOrderItems(items);

        expect(result.isValid).toBe(true);
    });

    it('should warn when no edges are processed', () => {
        const items = [createMockOrderItem({
            processedEdges: { front: false, back: false, left: false, right: false }
        })];
        const result = validateOrderItems(items);

        expect(result.warnings.some(w => w.includes('No edges processed'))).toBe(true);
    });
});

// ============================================================================
// Test Suite: PDF Options Validation
// ============================================================================

describe('PDF Generation - Options Validation', () => {
    it('should validate minimal options', () => {
        const result = validatePdfOptions({});

        expect(result.isValid).toBe(true);
    });

    it('should warn when no customer name (guest context)', () => {
        const result = validatePdfOptions({});

        expect(result.warnings).toContain('No customer name provided - PDF will show as anonymous/guest');
    });

    it('should accept valid options', () => {
        const result = validatePdfOptions({
            companyName: 'Test Company',
            customerName: 'John Doe',
            orderNumber: 'ORD-001',
            notes: 'Test notes',
        });

        expect(result.isValid).toBe(true);
        expect(result.warnings).toHaveLength(0);
    });

    it('should warn on very long company name', () => {
        const result = validatePdfOptions({
            companyName: 'A'.repeat(150),
        });

        expect(result.warnings.some(w => w.includes('Company name is very long'))).toBe(true);
    });

    it('should warn on very long order number', () => {
        const result = validatePdfOptions({
            orderNumber: 'ORD-' + '0'.repeat(100),
        });

        expect(result.warnings.some(w => w.includes('Order number is very long'))).toBe(true);
    });

    it('should warn on very long notes', () => {
        const result = validatePdfOptions({
            notes: 'A'.repeat(2500),
        });

        expect(result.warnings.some(w => w.includes('Notes are very long'))).toBe(true);
    });
});

// ============================================================================
// Test Suite: Edge Names Validation
// ============================================================================

describe('PDF Generation - Edge Names Validation', () => {
    it('should validate complete edge names', () => {
        const edgeNames = {
            front: 'Prednja',
            back: 'Zadnja',
            left: 'Lijeva',
            right: 'Desna',
        };
        const result = validateEdgeNames(edgeNames);

        expect(result.isValid).toBe(true);
        expect(result.warnings).toHaveLength(0);
    });

    it('should warn on missing edge translations', () => {
        const edgeNames = {
            front: 'Prednja',
        };
        const result = validateEdgeNames(edgeNames);

        expect(result.isValid).toBe(true);
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings.some(w => w.includes('back'))).toBe(true);
        expect(result.warnings.some(w => w.includes('left'))).toBe(true);
        expect(result.warnings.some(w => w.includes('right'))).toBe(true);
    });

    it('should handle empty edge names object', () => {
        const result = validateEdgeNames({});

        expect(result.isValid).toBe(true);
        expect(result.warnings).toHaveLength(4); // All 4 edges missing
    });
});

// ============================================================================
// Test Suite: PDF Size Estimation
// ============================================================================

describe('PDF Generation - Size Estimation', () => {
    it('should estimate size for single item', () => {
        const items = [createMockOrderItem()];
        const result = estimatePdfSize(items, {});

        expect(result.estimatedPages).toBeGreaterThanOrEqual(2);
        expect(result.estimatedSizeKB).toBeGreaterThan(100);
    });

    it('should estimate size for multiple items', () => {
        const items = Array(5).fill(null).map((_, i) =>
            createMockOrderItem({ id: `ST-00${i + 1}` })
        );
        const result = estimatePdfSize(items, {});

        expect(result.estimatedPages).toBeGreaterThan(5);
        expect(result.estimatedSizeKB).toBeGreaterThan(500);
    });

    it('should warn on large PDFs (>10 pages)', () => {
        const items = Array(10).fill(null).map((_, i) =>
            createMockOrderItem({ id: `ST-00${i + 1}` })
        );
        const result = estimatePdfSize(items, {});

        expect(result.warnings.some(w => w.includes('pages'))).toBe(true);
    });

    it('should include notes in size estimate', () => {
        const items = [createMockOrderItem()];
        const result = estimatePdfSize(items, { notes: 'A'.repeat(1000) });

        expect(result.estimatedSizeKB).toBeGreaterThan(150); // Base + notes
    });
});

// ============================================================================
// Test Suite: Guest User Context
// ============================================================================

describe('PDF Generation - Guest User Context', () => {
    it('should detect guest user by missing info', () => {
        expect(isGuestUser()).toBe(true);
        expect(isGuestUser(undefined, undefined)).toBe(true);
    });

    it('should detect guest user by email domain', () => {
        expect(isGuestUser('Test', 'guest_123@guest.studio.local')).toBe(true);
    });

    it('should detect guest user by name', () => {
        expect(isGuestUser('Gost', 'test@example.com')).toBe(true);
        expect(isGuestUser('GOST KORISNIK', 'test@example.com')).toBe(true);
    });

    it('should not detect registered user as guest', () => {
        expect(isGuestUser('John Doe', 'john@example.com')).toBe(false);
        expect(isGuestUser('Company Ltd', 'info@company.com')).toBe(false);
    });

    it('should generate guest PDF filename', () => {
        const filename = generatePdfFilename('PON-001', true);

        expect(filename).toContain('Ponuda_');
        expect(filename).toContain('PON-001');
        expect(filename.slice(-4)).toBe('.pdf');
    });

    it('should generate registered user PDF filename', () => {
        const filename = generatePdfFilename('RN-001', false);

        expect(filename).toContain('Radni_Nalog_');
        expect(filename).toContain('RN-001');
        expect(filename.slice(-4)).toBe('.pdf');
    });
});

// ============================================================================
// Test Suite: Complete Guest Workflow
// ============================================================================

describe('PDF Generation - Complete Guest Workflow', () => {
    it('should validate complete guest order', () => {
        const items = [
            createMockOrderItem({
                id: 'PON-001-A',
                material: createMockMaterial({ name: 'Kirmenjak' }),
                finish: createMockFinish({ name: 'Brušenje' }),
                totalCost: 250.5,
                quantity: 2,
            }),
            createMockOrderItem({
                id: 'PON-001-B',
                dims: { length: 80, width: 40, height: 3 },
                processedEdges: { front: true, back: true, left: false, right: false },
                totalCost: 180.0,
                quantity: 1,
            }),
        ];

        const options = {
            companyName: 'Moja Firma d.o.o.',
            customerName: 'Gost',
            orderNumber: 'PON-2024-001',
            notes: 'Hitna narudžba',
        };

        const itemsResult = validateOrderItems(items);
        const optionsResult = validatePdfOptions(options);
        const sizeEstimate = estimatePdfSize(items, options);
        const isGuest = isGuestUser(options.customerName);
        const filename = generatePdfFilename(options.orderNumber, isGuest);

        // Assertions
        expect(itemsResult.isValid).toBe(true);
        expect(optionsResult.isValid).toBe(true);
        expect(isGuest).toBe(true);
        expect(filename).toContain('Ponuda_');
        expect(sizeEstimate.estimatedPages).toBeGreaterThan(2);
    });

    it('should handle guest with empty order gracefully', () => {
        const items: OrderItem[] = [];
        const result = validateOrderItems(items);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('No order items provided');
    });

    it('should validate guest order with all edge processing', () => {
        const items = [createMockOrderItem({
            processedEdges: { front: true, back: true, left: true, right: true },
            okapnikEdges: { front: true, back: false, left: false, right: false },
            bunjaEdgeStyle: 'lomljene',
        })];

        const result = validateOrderItems(items);

        expect(result.isValid).toBe(true);
        expect(result.warnings).not.toContain('No edges processed');
    });

    it('should validate guest order with sqm unit', () => {
        const items = [createMockOrderItem({
            orderUnit: 'sqm',
            quantity: 5.5,
        })];

        const result = validateOrderItems(items);

        expect(result.isValid).toBe(true);
    });

    it('should validate guest order with lm unit', () => {
        const items = [createMockOrderItem({
            orderUnit: 'lm',
            quantity: 12.3,
        })];

        const result = validateOrderItems(items);

        expect(result.isValid).toBe(true);
    });
});

// ============================================================================
// Test Suite: Error Handling
// ============================================================================

describe('PDF Generation - Error Handling', () => {
    it('should handle missing material object', () => {
        const items = [createMockOrderItem({ material: undefined as any })];
        const result = validateOrderItems(items);

        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('material'))).toBe(true);
    });

    it('should handle null dimensions', () => {
        const items = [createMockOrderItem({ dims: null as any })];
        const result = validateOrderItems(items);

        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('dimensions'))).toBe(true);
    });

    it('should handle invalid profile name formats', () => {
        const items = [createMockOrderItem({
            profile: createMockProfile({ name: 'smuš c20' }),
        })];
        const result = validateOrderItems(items);

        expect(result.isValid).toBe(true);
    });

    it('should handle very large order quantities', () => {
        const items = [createMockOrderItem({ quantity: 10000 })];
        const result = validateOrderItems(items);

        expect(result.isValid).toBe(true); // Large quantities are still valid
    });
});

// ============================================================================
// Test Suite: Edge Cases
// ============================================================================

describe('PDF Generation - Edge Cases', () => {
    it('should handle item with no okapnik', () => {
        const items = [createMockOrderItem({
            okapnikEdges: { front: false, back: false, left: false, right: false },
        })];
        const result = validateOrderItems(items);

        expect(result.isValid).toBe(true);
    });

    it('should handle item with all okapnik edges', () => {
        const items = [createMockOrderItem({
            okapnikEdges: { front: true, back: true, left: true, right: true },
        })];
        const result = validateOrderItems(items);

        expect(result.isValid).toBe(true);
    });

    it('should handle special characters in names', () => {
        const items = [createMockOrderItem({
            material: createMockMaterial({ name: 'Smuš C20 Profil' }),
            finish: createMockFinish({ name: 'Polu-zaobljena R1.5' }),
            profile: createMockProfile({ name: 'Puno-zaobljena' }),
        })];
        const result = validateOrderItems(items);

        expect(result.isValid).toBe(true);
    });

    it('should handle unicode characters', () => {
        const items = [createMockOrderItem({
            material: createMockMaterial({ name: 'Plano Šareni' }),
            id: 'ST-001-čćž',
        })];
        const result = validateOrderItems(items);

        expect(result.isValid).toBe(true);
    });

    it('should handle very small dimensions', () => {
        const items = [createMockOrderItem({
            dims: { length: 0.1, width: 0.1, height: 0.1 },
        })];
        const result = validateOrderItems(items);

        expect(result.isValid).toBe(true);
    });

    it('should handle exactly 4:1 aspect ratio', () => {
        const items = [createMockOrderItem({
            dims: { length: 400, width: 100, height: 2 },
        })];
        const result = validateOrderItems(items);

        // 4.0 is not > 4, so no warning
        expect(result.warnings.some(w => w.includes('aspect ratio'))).toBe(false);
    });
});
