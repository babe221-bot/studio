"use client";

import { useMemo } from 'react';
import type { Material, SurfaceFinish, EdgeProfile, ProcessedEdges, ConstructionElement } from '@/types';

interface CalculationParams {
    length: number;
    width: number;
    height: number;
    selectedMaterial?: Material;
    selectedFinish?: SurfaceFinish;
    selectedProfile?: EdgeProfile;
    processedEdges: ProcessedEdges;
    okapnikEdges: ProcessedEdges;
    selectedElement?: ConstructionElement;
    quantity: number;
    bunjaEdgeStyle: 'oštre' | 'lomljene';
}

export interface CalculationsResult {
    surfaceArea: number;
    weight: number;
    materialCost: number;
    processingCost: number;
    okapnikCost: number;
    totalCost: number;
}

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
    bunjaEdgeStyle
}: CalculationParams): CalculationsResult {
    return useMemo(() => {
        if (!selectedMaterial || !selectedFinish || !selectedProfile || !height) {
            return { surfaceArea: 0, weight: 0, materialCost: 0, processingCost: 0, okapnikCost: 0, totalCost: 0 };
        }

        const length_m = length / 100;
        const width_m = width / 100;
        const height_m = height / 100;
        const OKAPNIK_COST_PER_M = 5;
        const BUNJA_BROKEN_EDGE_UPCHARGE_SQM = 25;

        let totalCost = 0;
        let surfaceArea = 0;
        let weight = 0;
        let materialCost = 0;
        let processingCost = 0;
        let okapnikCost = 0;

        // --- Cost calculation per piece ---
        const surfaceArea_m2_piece = length_m * width_m;
        const weight_kg_piece = (length * width * height * selectedMaterial.density) / 1000;
        const materialCost_piece = surfaceArea_m2_piece * selectedMaterial.cost_sqm;

        let processed_perimeter_m = 0;
        if (processedEdges.front) processed_perimeter_m += length_m;
        if (processedEdges.back) processed_perimeter_m += length_m;
        if (processedEdges.left) processed_perimeter_m += width_m;
        if (processedEdges.right) processed_perimeter_m += width_m;
        const edgeProcessingCost_piece = processed_perimeter_m * selectedProfile.cost_m;

        let okapnik_perimeter_m = 0;
        if (okapnikEdges.front) okapnik_perimeter_m += length_m;
        if (okapnikEdges.back) okapnik_perimeter_m += length_m;
        if (okapnikEdges.left) okapnik_perimeter_m += width_m;
        if (okapnikEdges.right) okapnik_perimeter_m += width_m;
        const okapnikCost_piece = okapnik_perimeter_m * OKAPNIK_COST_PER_M;

        const surfaceProcessingCost_piece = surfaceArea_m2_piece * selectedFinish.cost_sqm;
        const processingCost_piece = surfaceProcessingCost_piece + edgeProcessingCost_piece;
        const totalCost_piece = materialCost_piece + processingCost_piece + okapnikCost_piece;

        switch (selectedElement?.orderUnit) {
            case 'piece':
                surfaceArea = surfaceArea_m2_piece * quantity;
                weight = weight_kg_piece * quantity;
                materialCost = materialCost_piece * quantity;
                processingCost = processingCost_piece * quantity;
                okapnikCost = okapnikCost_piece * quantity;
                totalCost = totalCost_piece * quantity;
                break;

            case 'sqm':
                surfaceArea = quantity;
                materialCost = selectedMaterial.cost_sqm * quantity;
                processingCost = selectedFinish.cost_sqm * quantity;

                if (selectedElement.hasSpecialBunjaEdges) {
                    if (bunjaEdgeStyle === 'lomljene') {
                        processingCost += BUNJA_BROKEN_EDGE_UPCHARGE_SQM * quantity;
                    }
                    weight = quantity * height_m * selectedMaterial.density * 1000;
                } else {
                    weight = quantity * height_m * selectedMaterial.density * 1000;
                }

                totalCost = materialCost + processingCost;
                break;

            case 'lm':
                const materialCost_lm = width_m * selectedMaterial.cost_sqm;
                const finishCost_lm = width_m * selectedFinish.cost_sqm;
                const profileCost_lm = selectedProfile.cost_m;

                materialCost = materialCost_lm * quantity;
                processingCost = (finishCost_lm + profileCost_lm) * quantity;
                totalCost = materialCost + processingCost;
                weight = width_m * height_m * selectedMaterial.density * 1000 * quantity;
                surfaceArea = width_m * quantity;
                break;
        }

        return { surfaceArea, weight, materialCost, processingCost, okapnikCost, totalCost };
    }, [length, width, height, selectedMaterial, selectedFinish, selectedProfile, processedEdges, okapnikEdges, selectedElement, quantity, bunjaEdgeStyle]);
}
