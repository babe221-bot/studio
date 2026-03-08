'use client';

import { useMemo } from 'react';
import {
  calculateOrderCosts,
  CalculationParams,
  CalculationsResult,
} from '@/lib/calculations';

export type { CalculationParams, CalculationsResult };

export function useOrderCalculations({
  length,
  width,
  height,
  selectedMaterial,
  selectedFinish,
  selectedProfile,
  processedEdges,
  okapnikEdges,
  selectedElement,
  quantity,
  bunjaEdgeStyle,
}: CalculationParams): CalculationsResult {
  return useMemo(
    () =>
      calculateOrderCosts({
        length,
        width,
        height,
        selectedMaterial,
        selectedFinish,
        selectedProfile,
        processedEdges,
        okapnikEdges,
        selectedElement,
        quantity,
        bunjaEdgeStyle,
      }),
    [
      length,
      width,
      height,
      selectedMaterial,
      selectedFinish,
      selectedProfile,
      processedEdges,
      okapnikEdges,
      selectedElement,
      quantity,
      bunjaEdgeStyle,
    ]
  );
}
