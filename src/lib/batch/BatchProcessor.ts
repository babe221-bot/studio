import type { Material, SurfaceFinish, EdgeProfile, OrderItem } from '@/types';

export interface BatchItem {
  id: string;
  dims: {
    length: number;
    width: number;
    height: number;
  };
  quantity: number;
  validated: boolean;
  errors: string[];
  warnings: string[];
  totalCost?: number;
  area?: number;
}

export interface BatchConfig {
  material: Material | null;
  finish: SurfaceFinish | null;
  profile: EdgeProfile | null;
  processedEdges: {
    front: boolean;
    back: boolean;
    left: boolean;
    right: boolean;
  };
  items: BatchItem[];
}

export interface BatchValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface BatchPricingResult {
  subtotal: number;
  totalArea: number;
  totalPieces: number;
  items: Array<{
    id: string;
    dimensions: string;
    area: number;
    cost: number;
  }>;
}

// Dimension constraints for stone slabs
const DIMENSION_LIMITS = {
  minLength: 10,
  maxLength: 400,
  minWidth: 10,
  maxWidth: 280,
  minHeight: 1,
  maxHeight: 15,
};

const MAX_AREA = 12; // Maximum single slab area in m²
const MIN_AREA = 0.1; // Minimum single slab area in m²

/**
 * Batch Processor Service
 * Handles batch operations for multiple slab dimensions
 */
export const batchProcessor = {
  /**
   * Create a new batch configuration
   */
  createBatch(
    material: Material | null,
    finish: SurfaceFinish | null,
    profile: EdgeProfile | null,
    processedEdges: BatchConfig['processedEdges']
  ): BatchConfig {
    return {
      material,
      finish,
      profile,
      processedEdges,
      items: [],
    };
  },

  /**
   * Add dimensions to batch
   */
  addItems(
    config: BatchConfig,
    dimensions: Array<{
      length: number;
      width: number;
      height: number;
      quantity: number;
    }>
  ): BatchConfig {
    const newItems: BatchItem[] = dimensions.map((dim, index) => {
      const id = `batch-${Date.now()}-${index}`;
      const validation = this.validateDimensions(
        dim.length,
        dim.width,
        dim.height
      );

      return {
        id,
        dims: {
          length: dim.length,
          width: dim.width,
          height: dim.height,
        },
        quantity: dim.quantity,
        validated: validation.valid,
        errors: validation.errors,
        warnings: validation.warnings,
      };
    });

    return {
      ...config,
      items: [...config.items, ...newItems],
    };
  },

  /**
   * Remove item from batch
   */
  removeItem(config: BatchConfig, itemId: string): BatchConfig {
    return {
      ...config,
      items: config.items.filter((item) => item.id !== itemId),
    };
  },

  /**
   * Update item in batch
   */
  updateItem(
    config: BatchConfig,
    itemId: string,
    updates: Partial<BatchItem>
  ): BatchConfig {
    return {
      ...config,
      items: config.items.map((item) => {
        if (item.id === itemId) {
          const updated = { ...item, ...updates };
          if (updates.dims) {
            const validation = this.validateDimensions(
              updated.dims.length,
              updated.dims.width,
              updated.dims.height
            );
            updated.validated = validation.valid;
            updated.errors = validation.errors;
            updated.warnings = validation.warnings;
          }
          return updated;
        }
        return item;
      }),
    };
  },

  /**
   * Validate dimensions for a single slab
   */
  validateDimensions(
    length: number,
    width: number,
    height: number
  ): BatchValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Length validation
    if (length < DIMENSION_LIMITS.minLength) {
      errors.push(
        `Dužina ${length} cm je manja od minimuma ${DIMENSION_LIMITS.minLength} cm`
      );
    }
    if (length > DIMENSION_LIMITS.maxLength) {
      errors.push(
        `Dužina ${length} cm premašuje maksimum ${DIMENSION_LIMITS.maxLength} cm`
      );
    }

    // Width validation
    if (width < DIMENSION_LIMITS.minWidth) {
      errors.push(
        `Širina ${width} cm je manja od minimuma ${DIMENSION_LIMITS.minWidth} cm`
      );
    }
    if (width > DIMENSION_LIMITS.maxWidth) {
      errors.push(
        `Širina ${width} cm premašuje maksimum ${DIMENSION_LIMITS.maxWidth} cm`
      );
    }

    // Height validation
    if (height < DIMENSION_LIMITS.minHeight) {
      errors.push(
        `Visina ${height} cm je manja od minimuma ${DIMENSION_LIMITS.minHeight} cm`
      );
    }
    if (height > DIMENSION_LIMITS.maxHeight) {
      errors.push(
        `Visina ${height} cm premašuje maksimum ${DIMENSION_LIMITS.maxHeight} cm`
      );
    }

    // Area calculation (in m²)
    const area = (length / 100) * (width / 100);

    if (area > MAX_AREA) {
      errors.push(
        `Površina ${area.toFixed(2)} m² premašuje maksimum ${MAX_AREA} m²`
      );
    }
    if (area < MIN_AREA) {
      warnings.push(
        `Površina ${area.toFixed(2)} m² je manja od preporučenog minimuma ${MIN_AREA} m²`
      );
    }

    // Aspect ratio warnings
    const aspectRatio = length / width;
    if (aspectRatio > 4) {
      warnings.push(
        'Omjer dužine i širine je veći od 4:1 - moguć problem s transportom'
      );
    }
    if (aspectRatio < 0.25) {
      warnings.push(
        'Omjer dužine i širine je manji od 1:4 - moguć problem s transportom'
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  },

  /**
   * Calculate pricing for batch
   */
  calculatePricing(config: BatchConfig): BatchPricingResult {
    if (!config.material || !config.finish || !config.profile) {
      return {
        subtotal: 0,
        totalArea: 0,
        totalPieces: 0,
        items: [],
      };
    }

    let subtotal = 0;
    let totalArea = 0;
    let totalPieces = 0;

    const items = config.items.map((item) => {
      // Calculate area in m²
      const area = (item.dims.length / 100) * (item.dims.width / 100);

      // Calculate cost per item
      let cost = area * config.material!.cost_sqm;

      // Add finish cost
      cost += area * config.finish!.cost_sqm;

      // Add profile cost (per meter)
      const perimeter = (item.dims.length + item.dims.width) / 100;
      const processedEdgesCount = Object.values(config.processedEdges).filter(
        Boolean
      ).length;
      cost += perimeter * processedEdgesCount * config.profile!.cost_m;

      // Multiply by quantity
      cost *= item.quantity;

      subtotal += cost;
      totalArea += area * item.quantity;
      totalPieces += item.quantity;

      return {
        id: item.id,
        dimensions: `${item.dims.length}×${item.dims.width}×${item.dims.height} cm`,
        area: area * item.quantity,
        cost,
      };
    });

    return {
      subtotal,
      totalArea,
      totalPieces,
      items,
    };
  },

  /**
   * Validate entire batch
   */
  validateBatch(config: BatchConfig): BatchValidationResult {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];

    if (!config.material) {
      allErrors.push('Materijal nije odabran');
    }
    if (!config.finish) {
      allErrors.push('Obrada nije odabrana');
    }
    if (!config.profile) {
      allErrors.push('Profil nije odabran');
    }

    if (config.items.length === 0) {
      allErrors.push('Nema stavki u grupi');
    }

    // Check for invalid items
    const invalidItems = config.items.filter((item) => !item.validated);
    if (invalidItems.length > 0) {
      allErrors.push(`${invalidItems.length} stavki ima greške u validaciji`);
    }

    // Collect all warnings
    config.items.forEach((item, index) => {
      item.warnings.forEach((w) => {
        allWarnings.push(`Stavka ${index + 1}: ${w}`);
      });
    });

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
    };
  },

  /**
   * Convert batch to order items
   */
  toOrderItems(config: BatchConfig): OrderItem[] {
    if (!config.material || !config.finish || !config.profile) {
      return [];
    }

    return config.items.flatMap((item) => {
      const items: OrderItem[] = [];

      for (let i = 0; i < item.quantity; i++) {
        const area = (item.dims.length / 100) * (item.dims.width / 100);
        let cost = area * config.material!.cost_sqm;
        cost += area * config.finish!.cost_sqm;

        const perimeter = (item.dims.length + item.dims.width) / 100;
        const processedEdgesCount = Object.values(config.processedEdges).filter(
          Boolean
        ).length;
        cost += perimeter * processedEdgesCount * config.profile!.cost_m;

        items.push({
          orderId: 0,
          id: item.id,
          dims: item.dims,
          material: config.material!,
          finish: config.finish!,
          profile: config.profile!,
          processedEdges: config.processedEdges,
          okapnikEdges: {
            front: false,
            back: false,
            left: false,
            right: false,
          },
          totalCost: cost,
          orderUnit: 'piece',
          quantity: 1,
        });
      }

      return items;
    });
  },

  /**
   * Generate batch summary for export
   */
  generateSummary(config: BatchConfig): string {
    const pricing = this.calculatePricing(config);
    const validation = this.validateBatch(config);

    let summary = '=== BATCH PREGLED ===\n\n';

    summary += `Materijal: ${config.material?.name || 'Nije odabran'}\n`;
    summary += `Obrada: ${config.finish?.name || 'Nije odabran'}\n`;
    summary += `Profil: ${config.profile?.name || 'Nije odabran'}\n\n`;

    summary += `Ukupno stavki: ${config.items.length}\n`;
    summary += `Ukupno komada: ${pricing.totalPieces}\n`;
    summary += `Ukupna površina: ${pricing.totalArea.toFixed(2)} m²\n`;
    summary += `Ukupna cijena: ${pricing.subtotal.toFixed(2)} €\n\n`;

    if (validation.errors.length > 0) {
      summary += '=== GREŠKE ===\n';
      validation.errors.forEach((e) => (summary += `- ${e}\n`));
      summary += '\n';
    }

    if (validation.warnings.length > 0) {
      summary += '=== UPOZORENJA ===\n';
      validation.warnings.forEach((w) => (summary += `- ${w}\n`));
    }

    return summary;
  },
};
