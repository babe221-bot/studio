"use client";

import { useEffect, useCallback } from 'react';
import type { Material, SurfaceFinish, EdgeProfile, ProcessedEdges } from '@/types';
import { constructionElements } from '@/lib/constructionElements';
import { useLabStore } from '@/store/useLabStore';

export function useElementConfiguration(
    materials: Material[],
    finishes: SurfaceFinish[],
    profiles: EdgeProfile[]
) {
    const {
        selectedElement,
        length,
        width,
        height,
        quantity,
        specimenId,
        selectedMaterialId,
        selectedFinishId,
        selectedProfileId,
        processedEdges,
        okapnikEdges,
        bunjaEdgeStyle,
        setSelectedElement,
        setDimensions,
        setQuantity,
        setSpecimenId,
        setMaterialId,
        setFinishId,
        setProfileId,
        setProcessedEdge,
        setOkapnikEdge,
        setBunjaEdgeStyle
    } = useLabStore();

    // Initialize defaults when data becomes available
    useEffect(() => {
        if (materials.length > 0 && !selectedMaterialId) {
            setMaterialId(materials[0].id.toString());
        }
    }, [materials, selectedMaterialId, setMaterialId]);

    useEffect(() => {
        if (finishes.length > 0 && !selectedFinishId) {
            setFinishId(finishes[0].id.toString());
        }
    }, [finishes, selectedFinishId, setFinishId]);

    useEffect(() => {
        if (profiles.length > 0 && !selectedProfileId) {
            setProfileId(profiles[0].id.toString());
        }
    }, [profiles, selectedProfileId, setProfileId]);

    const handleElementTypeChange = useCallback((elementId: string) => {
        const element = constructionElements.find(e => e.id === elementId);
        if (element) {
            setSelectedElement(element);
        }
    }, [setSelectedElement]);

    // Wrappers to match old signature where setters just took the value
    const setLength = useCallback((l: number | ((prev: number) => number)) => {
        const val = typeof l === 'function' ? l(length) : l;
        setDimensions({ length: val });
    }, [length, setDimensions]);

    const setWidth = useCallback((w: number | ((prev: number) => number)) => {
        const val = typeof w === 'function' ? w(width) : w;
        setDimensions({ width: val });
    }, [width, setDimensions]);

    const setHeight = useCallback((h: number | ((prev: number) => number)) => {
        const val = typeof h === 'function' ? h(height) : h;
        setDimensions({ height: val });
    }, [height, setDimensions]);

    return {
        selectedElement,
        length,
        setLength,
        width,
        setWidth,
        height,
        setHeight,
        quantity,
        setQuantity,
        specimenId,
        setSpecimenId,
        selectedMaterialId,
        setSelectedMaterialId: setMaterialId,
        selectedFinishId,
        setSelectedFinishId: setFinishId,
        selectedProfileId,
        setSelectedProfileId: setProfileId,
        processedEdges,
        updateProcessedEdge: setProcessedEdge,
        okapnikEdges,
        updateOkapnikEdge: setOkapnikEdge,
        bunjaEdgeStyle,
        setBunjaEdgeStyle,
        handleElementTypeChange
    };
}
