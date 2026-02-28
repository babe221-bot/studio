
'use client';

// Re-export from pdf-enhanced for backwards compatibility
export { generateEnhancedPdf, generateAndDownloadPdf } from './pdf-enhanced';

// Keep old type exports for compatibility
import type { OrderItem } from '@/types';

export type EdgeNameMap = {
  [key: string]: string;
};

// Legacy compatibility export
export const generateAndDownloadPdfLegacy = (orderItems: OrderItem[], edgeNames: EdgeNameMap) => {
  const images3D = orderItems.map(() => null);
  const { generateEnhancedPdf } = require('./pdf-enhanced');
  return generateEnhancedPdf(orderItems, edgeNames, images3D);
};
