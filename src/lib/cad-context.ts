/**
 * @fileOverview Utility functions for injecting CAD context into AI prompts.
 * Used by the chat API to provide the AI assistant with current project state.
 */

import type { OrderItem, Material, SurfaceFinish, EdgeProfile } from '@/types';

/**
 * Context about the current CAD project state that can be injected into AI prompts.
 */
export interface CADContextData {
    currentItems?: OrderItem[];
    selectedMaterial?: Material | null;
    selectedFinish?: SurfaceFinish | null;
    selectedProfile?: EdgeProfile | null;
    activeDimensions?: {
        length: number;
        width: number;
        height: number;
    } | null;
}

/**
 * Format a single order item for AI context.
 */
function formatOrderItem(item: OrderItem, index: number): string {
    const dims = `${item.dims.length}×${item.dims.width}×${item.dims.height} cm`;
    const material = item.material?.name || 'Nepoznat materijal';
    const finish = item.finish?.name || 'Bez obrade';
    const profile = item.profile?.name || 'Bez profila';
    const quantity = item.quantity || 1;
    const unit = item.orderUnit === 'sqm' ? 'm²' : item.orderUnit === 'lm' ? 'fm' : 'kom';

    return `  ${index + 1}. ${dims}, ${material}, ${finish}, ${profile} (${quantity} ${unit})`;
}

/**
 * Format processed edges for display.
 */
function formatProcessedEdges(edges: { front: boolean; back: boolean; left: boolean; right: boolean }): string {
    const activeEdges: string[] = [];
    if (edges.front) activeEdges.push('prednja');
    if (edges.back) activeEdges.push('zadnja');
    if (edges.left) activeEdges.push('lijeva');
    if (edges.right) activeEdges.push('desna');
    return activeEdges.length > 0 ? activeEdges.join(', ') : 'bez obrade';
}

/**
 * Build a context string for the AI assistant based on current CAD state.
 * Returns a formatted string that can be injected into the system prompt.
 */
export function buildCADContext(data: CADContextData): string {
    const parts: string[] = [];

    // Current dimensions being configured
    if (data.activeDimensions) {
        const { length, width, height } = data.activeDimensions;
        parts.push(`Aktivne dimenzije: ${length}×${width}×${height} cm`);
    }

    // Selected material
    if (data.selectedMaterial) {
        parts.push(`Odabrani materijal: ${data.selectedMaterial.name} (gustoća: ${data.selectedMaterial.density} kg/m³, cijena: ${data.selectedMaterial.cost_sqm} €/m²)`);
    }

    // Selected finish
    if (data.selectedFinish) {
        parts.push(`Odabrana površinska obrada: ${data.selectedFinish.name} (${data.selectedFinish.cost_sqm} €/m²)`);
    }

    // Selected edge profile
    if (data.selectedProfile) {
        parts.push(`Odabrani rubni profil: ${data.selectedProfile.name} (${data.selectedProfile.cost_m} €/fm)`);
    }

    // Order items in the project
    if (data.currentItems && data.currentItems.length > 0) {
        parts.push(`Stavke u projektu (${data.currentItems.length}):`);
        data.currentItems.forEach((item, index) => {
            parts.push(formatOrderItem(item, index));

            // Add edge processing details if available
            if (item.processedEdges) {
                const processedStr = formatProcessedEdges(item.processedEdges);
                if (processedStr !== 'bez obrade') {
                    parts.push(`    Obrada rubova: ${processedStr}`);
                }
            }

            if (item.okapnikEdges) {
                const okapnikStr = formatProcessedEdges(item.okapnikEdges);
                if (okapnikStr !== 'bez obrade') {
                    parts.push(`    Okapnik: ${okapnikStr}`);
                }
            }
        });
    }

    return parts.length > 0 ? parts.join('\n') : '';
}

/**
 * Calculate total project metrics for context.
 */
export function calculateProjectMetrics(items: OrderItem[]): {
    totalArea: number;
    totalPerimeter: number;
    itemCount: number;
    estimatedCost: number;
} {
    let totalArea = 0;
    let totalPerimeter = 0;
    let estimatedCost = 0;

    for (const item of items) {
        const area = (item.dims.length * item.dims.width) / 10000; // cm² to m²
        const perimeter = (2 * (item.dims.length + item.dims.width)) / 100; // cm to m

        totalArea += area * item.quantity;
        totalPerimeter += perimeter * item.quantity;
        estimatedCost += item.totalCost || 0;
    }

    return {
        totalArea: Math.round(totalArea * 100) / 100,
        totalPerimeter: Math.round(totalPerimeter * 100) / 100,
        itemCount: items.length,
        estimatedCost: Math.round(estimatedCost * 100) / 100,
    };
}

/**
 * Generate a summary of the current project for AI context.
 */
export function generateProjectSummary(items: OrderItem[]): string {
    if (items.length === 0) {
        return 'Projekt je prazan - nema dodanih stavki.';
    }

    const metrics = calculateProjectMetrics(items);

    return `Ukupno ${metrics.itemCount} stavki, ${metrics.totalArea} m² površine, ${metrics.totalPerimeter} fm rubova, procijenjena cijena: ${metrics.estimatedCost} €`;
}
