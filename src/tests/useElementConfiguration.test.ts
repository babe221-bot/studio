import { renderHook, act } from '@testing-library/react';
import { useElementConfiguration } from '@/hooks/useElementConfiguration';
import { initialMaterials, initialSurfaceFinishes, initialEdgeProfiles } from '@/lib/data';

describe('useElementConfiguration', () => {
    it('should initialize with default values', () => {
        const { result } = renderHook(() => 
            useElementConfiguration(initialMaterials, initialSurfaceFinishes, initialEdgeProfiles)
        );

        // Check if defaults are set correctly (after effects run)
        // Note: some initializations happen in useEffect
        expect(result.current.selectedElement).toBeDefined();
        expect(result.current.length).toBeGreaterThan(0);
        expect(result.current.width).toBeGreaterThan(0);
        expect(result.current.quantity).toBe(1);
    });

    it('should update dimensions correctly', () => {
        const { result } = renderHook(() => 
            useElementConfiguration(initialMaterials, initialSurfaceFinishes, initialEdgeProfiles)
        );

        act(() => {
            result.current.setLength(120);
            result.current.setWidth(80);
        });

        expect(result.current.length).toBe(120);
        expect(result.current.width).toBe(80);
    });

    it('should update processed edges', () => {
        const { result } = renderHook(() => 
            useElementConfiguration(initialMaterials, initialSurfaceFinishes, initialEdgeProfiles)
        );

        act(() => {
            result.current.updateProcessedEdge('left', true);
        });

        expect(result.current.processedEdges.left).toBe(true);
    });

    it('should auto-uncheck okapnik if processed edge is removed', () => {
        const { result } = renderHook(() => 
            useElementConfiguration(initialMaterials, initialSurfaceFinishes, initialEdgeProfiles)
        );

        // Enable both
        act(() => {
            result.current.updateProcessedEdge('front', true);
            result.current.updateOkapnikEdge('front', true);
        });

        expect(result.current.processedEdges.front).toBe(true);
        expect(result.current.okapnikEdges.front).toBe(true);

        // Remove processed edge
        act(() => {
            result.current.updateProcessedEdge('front', false);
        });

        expect(result.current.processedEdges.front).toBe(false);
        expect(result.current.okapnikEdges.front).toBe(false);
    });
});