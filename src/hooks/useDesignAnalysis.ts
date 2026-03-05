import { useState, useEffect, useCallback } from 'react';

export interface DesignWarning {
    severity: 'info' | 'warning' | 'critical';
    code: string;
    message: string;
    suggestion: string;
}

export function useDesignAnalysis(
    length: number,
    width: number,
    height: number,
    selectedMaterial: any,
    selectedElement: any
) {
    const [warnings, setWarnings] = useState<DesignWarning[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const analyzeDesign = useCallback(async () => {
        if (!selectedMaterial || !selectedElement || !length || !width || !height) {
            setWarnings([]);
            return;
        }

        setIsAnalyzing(true);
        const PYTHON_API_URL = process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000';
        
        try {
            const res = await fetch(`${PYTHON_API_URL}/api/ai/analyze-design`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    length,
                    width,
                    height,
                    material_density: selectedMaterial.density,
                    material_name: selectedMaterial.name,
                    order_unit: selectedElement.orderUnit
                })
            });

            if (res.ok) {
                const data = await res.json();
                setWarnings(data);
            } else {
                setWarnings([]);
            }
        } catch (e) {
            console.error("Analysis failed", e);
            setWarnings([]);
        } finally {
            setIsAnalyzing(false);
        }
    }, [length, width, height, selectedMaterial, selectedElement]);

    useEffect(() => {
        // Debounce analysis
        const timer = setTimeout(() => {
            analyzeDesign();
        }, 500);
        return () => clearTimeout(timer);
    }, [analyzeDesign]);

    return { warnings, isAnalyzing };
}
