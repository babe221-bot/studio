import { useOrderCalculations } from '@/hooks/useOrderCalculations';
import { renderHook } from '@testing-library/react';
import type {
  Material,
  SurfaceFinish,
  EdgeProfile,
  ProcessedEdges,
  ConstructionElement,
} from '@/types';

// Test data factories
const createMaterial = (overrides: Partial<Material> = {}): Material => ({
  id: 1,
  name: 'Test Marble',
  color: '#CCCCCC',
  cost_sqm: 150,
  density: 2.7,
  texture: '',
  ...overrides,
});

const createFinish = (
  overrides: Partial<SurfaceFinish> = {}
): SurfaceFinish => ({
  id: 1,
  name: 'Polirano',
  cost_sqm: 30,
  ...overrides,
});

const createProfile = (overrides: Partial<EdgeProfile> = {}): EdgeProfile => ({
  id: 1,
  name: 'Faza 2mm',
  cost_m: 15,
  ...overrides,
});

const createElement = (
  overrides: Partial<ConstructionElement> = {}
): ConstructionElement => ({
  id: 'countertop',
  name: 'Kuhinjska ploča',
  orderUnit: 'piece',
  defaultLength: 100,
  defaultWidth: 60,
  defaultHeight: 3,
  hasSpecialBunjaEdges: false,
  ...overrides,
});

const defaultProcessedEdges: ProcessedEdges = {
  front: false,
  back: false,
  left: false,
  right: false,
};

const allEdgesProcessed: ProcessedEdges = {
  front: true,
  back: true,
  left: true,
  right: true,
};

describe('useOrderCalculations', () => {
  describe('Missing required params', () => {
    it('should return zeros when no material selected', () => {
      const { result } = renderHook(() =>
        useOrderCalculations({
          length: 100,
          width: 60,
          height: 3,
          selectedMaterial: undefined,
          selectedFinish: createFinish(),
          selectedProfile: createProfile(),
          processedEdges: defaultProcessedEdges,
          okapnikEdges: defaultProcessedEdges,
          selectedElement: createElement(),
          quantity: 1,
          bunjaEdgeStyle: 'oštre',
        })
      );

      expect(result.current).toEqual({
        surfaceArea: 0,
        weight: 0,
        materialCost: 0,
        processingCost: 0,
        okapnikCost: 0,
        totalCost: 0,
      });
    });

    it('should return zeros when no finish selected', () => {
      const { result } = renderHook(() =>
        useOrderCalculations({
          length: 100,
          width: 60,
          height: 3,
          selectedMaterial: createMaterial(),
          selectedFinish: undefined,
          selectedProfile: createProfile(),
          processedEdges: defaultProcessedEdges,
          okapnikEdges: defaultProcessedEdges,
          selectedElement: createElement(),
          quantity: 1,
          bunjaEdgeStyle: 'oštre',
        })
      );

      expect(result.current.totalCost).toBe(0);
    });

    it('should return zeros when height is 0', () => {
      const { result } = renderHook(() =>
        useOrderCalculations({
          length: 100,
          width: 60,
          height: 0,
          selectedMaterial: createMaterial(),
          selectedFinish: createFinish(),
          selectedProfile: createProfile(),
          processedEdges: defaultProcessedEdges,
          okapnikEdges: defaultProcessedEdges,
          selectedElement: createElement(),
          quantity: 1,
          bunjaEdgeStyle: 'oštre',
        })
      );

      expect(result.current.totalCost).toBe(0);
    });
  });

  describe('Order unit: piece', () => {
    const element = createElement({ orderUnit: 'piece' });

    it('should calculate basic costs correctly', () => {
      const material = createMaterial({ cost_sqm: 100, density: 2.5 });
      const finish = createFinish({ cost_sqm: 20 });
      const profile = createProfile({ cost_m: 10 });

      const { result } = renderHook(() =>
        useOrderCalculations({
          length: 100, // cm
          width: 60, // cm
          height: 3, // cm
          selectedMaterial: material,
          selectedFinish: finish,
          selectedProfile: profile,
          processedEdges: defaultProcessedEdges,
          okapnikEdges: defaultProcessedEdges,
          selectedElement: element,
          quantity: 1,
          bunjaEdgeStyle: 'oštre',
        })
      );

      // length_m = 1, width_m = 0.6
      // surfaceArea = 1 * 0.6 = 0.6 m²
      expect(result.current.surfaceArea).toBeCloseTo(0.6, 2);

      // weight = 100 * 60 * 3 * 2.5 / 1000 = 45 kg
      expect(result.current.weight).toBeCloseTo(45, 0);

      // materialCost = 0.6 * 100 = 60
      expect(result.current.materialCost).toBeCloseTo(60, 2);

      // processingCost = surfaceArea * finishCost = 0.6 * 20 = 12
      expect(result.current.processingCost).toBeCloseTo(12, 2);

      // totalCost = 60 + 12 = 72
      expect(result.current.totalCost).toBeCloseTo(72, 2);
    });

    it('should multiply costs by quantity', () => {
      const material = createMaterial({ cost_sqm: 100 });
      const finish = createFinish({ cost_sqm: 20 });
      const profile = createProfile({ cost_m: 10 });

      const { result } = renderHook(() =>
        useOrderCalculations({
          length: 100,
          width: 60,
          height: 3,
          selectedMaterial: material,
          selectedFinish: finish,
          selectedProfile: profile,
          processedEdges: defaultProcessedEdges,
          okapnikEdges: defaultProcessedEdges,
          selectedElement: element,
          quantity: 5,
          bunjaEdgeStyle: 'oštre',
        })
      );

      expect(result.current.surfaceArea).toBeCloseTo(3.0, 2); // 0.6 * 5
      expect(result.current.totalCost).toBeCloseTo(360, 2); // 72 * 5
    });

    it('should add edge processing costs', () => {
      const material = createMaterial({ cost_sqm: 100 });
      const finish = createFinish({ cost_sqm: 20 });
      const profile = createProfile({ cost_m: 10 });

      const { result } = renderHook(() =>
        useOrderCalculations({
          length: 100,
          width: 60,
          height: 3,
          selectedMaterial: material,
          selectedFinish: finish,
          selectedProfile: profile,
          processedEdges: {
            front: true,
            back: false,
            left: false,
            right: false,
          },
          okapnikEdges: defaultProcessedEdges,
          selectedElement: element,
          quantity: 1,
          bunjaEdgeStyle: 'oštre',
        })
      );

      // Edge cost = 1m (front) * 10 = 10
      // Base: materialCost(60) + finishCost(12) = 72
      // With edge: 72 + 10 = 82
      expect(result.current.totalCost).toBeCloseTo(82, 2);
    });

    it('should add okapnik costs', () => {
      const material = createMaterial({ cost_sqm: 100 });
      const finish = createFinish({ cost_sqm: 20 });
      const profile = createProfile({ cost_m: 10 });

      const { result } = renderHook(() =>
        useOrderCalculations({
          length: 100,
          width: 60,
          height: 3,
          selectedMaterial: material,
          selectedFinish: finish,
          selectedProfile: profile,
          processedEdges: defaultProcessedEdges,
          okapnikEdges: { front: true, back: false, left: false, right: false },
          selectedElement: element,
          quantity: 1,
          bunjaEdgeStyle: 'oštre',
        })
      );

      // Okapnik cost = 1m * 5 = 5
      expect(result.current.okapnikCost).toBeCloseTo(5, 2);
      // Base: 72 + 5 = 77
      expect(result.current.totalCost).toBeCloseTo(77, 2);
    });
  });

  describe('Order unit: sqm', () => {
    const element = createElement({
      orderUnit: 'sqm',
      hasSpecialBunjaEdges: true,
    });

    it('should calculate costs based on quantity as sqm', () => {
      const material = createMaterial({ cost_sqm: 200 });
      const finish = createFinish({ cost_sqm: 50 });
      const profile = createProfile({ cost_m: 15 });

      const { result } = renderHook(() =>
        useOrderCalculations({
          length: 100,
          width: 60,
          height: 3,
          selectedMaterial: material,
          selectedFinish: finish,
          selectedProfile: profile,
          processedEdges: defaultProcessedEdges,
          okapnikEdges: defaultProcessedEdges,
          selectedElement: element,
          quantity: 2.5,
          bunjaEdgeStyle: 'oštre',
        })
      );

      // surfaceArea = quantity = 2.5
      expect(result.current.surfaceArea).toBe(2.5);

      // materialCost = 200 * 2.5 = 500
      expect(result.current.materialCost).toBeCloseTo(500, 2);

      // processingCost = 50 * 2.5 = 125
      expect(result.current.processingCost).toBeCloseTo(125, 2);

      // totalCost = 500 + 125 = 625
      expect(result.current.totalCost).toBeCloseTo(625, 2);
    });

    it('should add bunja broken edge upcharge for lomljene style', () => {
      const material = createMaterial({ cost_sqm: 200 });
      const finish = createFinish({ cost_sqm: 50 });
      const profile = createProfile({ cost_m: 15 });

      const { result } = renderHook(() =>
        useOrderCalculations({
          length: 100,
          width: 60,
          height: 3,
          selectedMaterial: material,
          selectedFinish: finish,
          selectedProfile: profile,
          processedEdges: defaultProcessedEdges,
          okapnikEdges: defaultProcessedEdges,
          selectedElement: element,
          quantity: 2.5,
          bunjaEdgeStyle: 'lomljene', // This should add the upcharge
        })
      );

      // bunja upcharge = 25 * 2.5 = 62.5
      // processingCost = 125 + 62.5 = 187.5
      expect(result.current.processingCost).toBeCloseTo(187.5, 2);
      expect(result.current.totalCost).toBeCloseTo(687.5, 2);
    });

    it('should NOT add bunja upcharge for oštre style', () => {
      const material = createMaterial({ cost_sqm: 200 });
      const finish = createFinish({ cost_sqm: 50 });
      const profile = createProfile({ cost_m: 15 });

      const { result } = renderHook(() =>
        useOrderCalculations({
          length: 100,
          width: 60,
          height: 3,
          selectedMaterial: material,
          selectedFinish: finish,
          selectedProfile: profile,
          processedEdges: defaultProcessedEdges,
          okapnikEdges: defaultProcessedEdges,
          selectedElement: element,
          quantity: 2.5,
          bunjaEdgeStyle: 'oštre', // No upcharge
        })
      );

      expect(result.current.processingCost).toBeCloseTo(125, 2);
    });
  });

  describe('Order unit: lm (linear meter)', () => {
    const element = createElement({ orderUnit: 'lm' });

    it('should calculate costs based on linear meters', () => {
      const material = createMaterial({ cost_sqm: 200 });
      const finish = createFinish({ cost_sqm: 50 });
      const profile = createProfile({ cost_m: 15 });

      const { result } = renderHook(() =>
        useOrderCalculations({
          length: 100,
          width: 60,
          height: 3,
          selectedMaterial: material,
          selectedFinish: finish,
          selectedProfile: profile,
          processedEdges: defaultProcessedEdges,
          okapnikEdges: defaultProcessedEdges,
          selectedElement: element,
          quantity: 3, // 3 linear meters
          bunjaEdgeStyle: 'oštre',
        })
      );

      // width_m = 0.6
      // materialCost = 0.6 * 200 * 3 = 360
      expect(result.current.materialCost).toBeCloseTo(360, 2);

      // processingCost = (finishCost + profileCost) * quantity
      // = (0.6 * 50 + 15) * 3 = (30 + 15) * 3 = 135
      expect(result.current.processingCost).toBeCloseTo(135, 2);

      // totalCost = 360 + 135 = 495
      expect(result.current.totalCost).toBeCloseTo(495, 2);

      // surfaceArea = width_m * quantity = 0.6 * 3 = 1.8
      expect(result.current.surfaceArea).toBeCloseTo(1.8, 2);
    });
  });

  describe('Edge cases', () => {
    it('should handle all edges processed', () => {
      const material = createMaterial({ cost_sqm: 100 });
      const finish = createFinish({ cost_sqm: 20 });
      const profile = createProfile({ cost_m: 10 });

      const { result } = renderHook(() =>
        useOrderCalculations({
          length: 100,
          width: 60,
          height: 3,
          selectedMaterial: material,
          selectedFinish: finish,
          selectedProfile: profile,
          processedEdges: allEdgesProcessed,
          okapnikEdges: allEdgesProcessed,
          selectedElement: createElement({ orderUnit: 'piece' }),
          quantity: 1,
          bunjaEdgeStyle: 'oštre',
        })
      );

      // Total perimeter = 2 * (1 + 0.6) = 3.2m
      // Edge cost = 3.2 * 10 = 32
      // Okapnik cost = 3.2 * 5 = 16
      // Base = material(60) + finish(12) = 72
      // Total = 72 + 32 + 16 = 120
      expect(result.current.totalCost).toBeCloseTo(120, 2);
    });

    it('should handle very small dimensions', () => {
      const material = createMaterial({ cost_sqm: 100 });
      const finish = createFinish({ cost_sqm: 20 });
      const profile = createProfile({ cost_m: 10 });

      const { result } = renderHook(() =>
        useOrderCalculations({
          length: 10, // 10cm = 0.1m
          width: 5, // 5cm = 0.05m
          height: 1, // 1cm
          selectedMaterial: material,
          selectedFinish: finish,
          selectedProfile: profile,
          processedEdges: defaultProcessedEdges,
          okapnikEdges: defaultProcessedEdges,
          selectedElement: createElement({ orderUnit: 'piece' }),
          quantity: 1,
          bunjaEdgeStyle: 'oštre',
        })
      );

      // surfaceArea = 0.1 * 0.005 = 0.005 m²
      expect(result.current.surfaceArea).toBeCloseTo(0.005, 3);
      // materialCost = 0.005 * 100 = 0.5
      expect(result.current.materialCost).toBeCloseTo(0.5, 2);
    });

    it('should handle very large dimensions', () => {
      const material = createMaterial({ cost_sqm: 100 });
      const finish = createFinish({ cost_sqm: 20 });
      const profile = createProfile({ cost_m: 10 });

      const { result } = renderHook(() =>
        useOrderCalculations({
          length: 500, // 5m
          width: 200, // 2m
          height: 5, // 5cm
          selectedMaterial: material,
          selectedFinish: finish,
          selectedProfile: profile,
          processedEdges: defaultProcessedEdges,
          okapnikEdges: defaultProcessedEdges,
          selectedElement: createElement({ orderUnit: 'piece' }),
          quantity: 10,
          bunjaEdgeStyle: 'oštre',
        })
      );

      // surfaceArea = 5 * 2 = 10 m² per piece
      // with quantity 10 = 100 m²
      expect(result.current.surfaceArea).toBe(100);

      // materialCost = 10 * 100 * 10 = 10000
      expect(result.current.materialCost).toBeCloseTo(10000, 2);
    });
  });
});
