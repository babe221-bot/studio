"use client";

import { useState, useCallback } from 'react';
import type { ConstructionElement, Material, SurfaceFinish, EdgeProfile, ProcessedEdges } from '@/types';
import { initialMaterials, initialSurfaceFinishes, initialEdgeProfiles } from '@/lib/data';
import { constructionElements } from '@/lib/constructionElements';

export function useElementConfiguration() {
    const [selectedElement, setSelectedElement] = useState<ConstructionElement | undefined>(constructionElements[0]);
    const [length, setLength] = useState(constructionElements[0].defaultLength);
    const [width, setWidth] = useState(constructionElements[0].defaultWidth);
    const [height, setHeight] = useState(constructionElements[0].defaultHeight);
    const [quantity, setQuantity] = useState(1);
    const [specimenId, setSpecimenId] = useState(`${constructionElements[0].name} 01`);

    const [selectedMaterialId, setSelectedMaterialId] = useState<string | undefined>(initialMaterials[0]?.id.toString());
    const [selectedFinishId, setSelectedFinishId] = useState<string | undefined>(initialSurfaceFinishes[0]?.id.toString());
    const [selectedProfileId, setSelectedProfileId] = useState<string | undefined>(initialEdgeProfiles[0]?.id.toString());

    const [processedEdges, setProcessedEdges] = useState<ProcessedEdges>({
        front: true,
        back: false,
        left: false,
        right: false,
    });

    const [okapnikEdges, setOkapnikEdges] = useState<ProcessedEdges>({
        front: false,
        back: false,
        left: false,
        right: false,
    });

    const [bunjaEdgeStyle, setBunjaEdgeStyle] = useState<'oštre' | 'lomljene'>('lomljene');

    const handleElementTypeChange = useCallback((elementId: string) => {
        const element = constructionElements.find(e => e.id === elementId);
        if (element) {
            setSelectedElement(element);
            setLength(element.defaultLength);
            setWidth(element.defaultWidth);
            setHeight(element.defaultHeight);
            setSpecimenId(`${element.name} 01`);
            setQuantity(1);

            if (element.orderUnit === 'sqm' || element.orderUnit === 'lm') {
                setProcessedEdges({ front: false, back: false, left: false, right: false });
            } else {
                setProcessedEdges({ front: true, back: false, left: false, right: false });
            }

            setOkapnikEdges({ front: false, back: false, left: false, right: false });
        }
    }, []);

    const updateProcessedEdge = useCallback((edge: keyof ProcessedEdges, checked: boolean) => {
        setProcessedEdges(prev => {
            const next = { ...prev, [edge]: checked };
            // If processed edge is unchecked, okapnik must also be unchecked
            if (!checked) {
                setOkapnikEdges(oPrev => ({ ...oPrev, [edge]: false }));
            }
            return next;
        });
    }, []);

    const updateOkapnikEdge = useCallback((edge: keyof ProcessedEdges, checked: boolean) => {
        setOkapnikEdges(prev => ({ ...prev, [edge]: checked }));
    }, [processedEdges]);

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
        setSelectedMaterialId,
        selectedFinishId,
        setSelectedFinishId,
        selectedProfileId,
        setSelectedProfileId,
        processedEdges,
        updateProcessedEdge,
        okapnikEdges,
        updateOkapnikEdge,
        bunjaEdgeStyle,
        setBunjaEdgeStyle,
        handleElementTypeChange
    };
}
