import { calculateOrderCosts, CalculationParams } from '../lib/calculations';
import {
  Material,
  SurfaceFinish,
  EdgeProfile,
  ProcessedEdges,
  ConstructionElement,
} from '../types';

describe('calculateOrderCosts', () => {
  const mockMaterial: Material = {
    id: 1,
    name: 'Granite',
    density: 2.7,
    cost_sqm: 100,
    texture: '',
    color: '#000000',
  };

  const mockFinish: SurfaceFinish = {
    id: 1,
    name: 'Polished',
    cost_sqm: 20,
  };

  const mockProfile: EdgeProfile = {
    id: 1,
    name: 'Straight',
    cost_m: 10,
  };

  const mockProcessedEdges: ProcessedEdges = {
    front: true,
    back: false,
    left: false,
    right: false,
  };

  const mockOkapnikEdges: ProcessedEdges = {
    front: false,
    back: false,
    left: false,
    right: false,
  };

  const defaultParams: CalculationParams = {
    length: 100,
    width: 50,
    height: 3,
    selectedMaterial: mockMaterial,
    selectedFinish: mockFinish,
    selectedProfile: mockProfile,
    processedEdges: mockProcessedEdges,
    okapnikEdges: mockOkapnikEdges,
    selectedElement: {
      id: 'slab',
      name: 'Slab',
      orderUnit: 'piece',
      defaultLength: 100,
      defaultWidth: 50,
      defaultHeight: 3,
    },
    quantity: 1,
    bunjaEdgeStyle: 'oštre',
  };

  it('should return all zeros if material is missing', () => {
    const result = calculateOrderCosts({
      ...defaultParams,
      selectedMaterial: undefined,
    });
    expect(result).toEqual({
      surfaceArea: 0,
      weight: 0,
      materialCost: 0,
      processingCost: 0,
      okapnikCost: 0,
      totalCost: 0,
    });
  });

  it('should calculate correct costs for a piece unit', () => {
    // surfaceArea = 1.0 * 0.5 = 0.5 sqm
    // materialCost = 0.5 * 100 = 50
    // edgeProcessing = 1.0 * 10 = 10
    // surfaceProcessing = 0.5 * 20 = 10
    // processingCost = 10 + 10 = 20
    // totalCost = 50 + 20 = 70
    // weight = (100 * 50 * 3 * 2.7) / 1000 = 40.5 kg
    const result = calculateOrderCosts(defaultParams);
    expect(result.surfaceArea).toBe(0.5);
    expect(result.materialCost).toBe(50);
    expect(result.processingCost).toBe(20);
    expect(result.totalCost).toBe(70);
    expect(result.weight).toBe(40.5);
  });

  it('should calculate correct costs for sqm unit', () => {
    const params: CalculationParams = {
      ...defaultParams,
      selectedElement: { ...defaultParams.selectedElement!, orderUnit: 'sqm' },
      quantity: 2,
    };
    // materialCost = 100 * 2 = 200
    // processingCost = 20 * 2 = 40
    // totalCost = 240
    // weight = 2 * (3/100) * 2.7 * 1000 = 162 kg
    const result = calculateOrderCosts(params);
    expect(result.materialCost).toBe(200);
    expect(result.processingCost).toBe(40);
    expect(result.totalCost).toBe(240);
    expect(result.weight).toBe(162);
  });

  it('should calculate correct costs for lm unit', () => {
    const params: CalculationParams = {
      ...defaultParams,
      selectedElement: { ...defaultParams.selectedElement!, orderUnit: 'lm' },
      quantity: 5,
    };
    // materialCost_lm = 0.5 * 100 = 50
    // finishCost_lm = 0.5 * 20 = 10
    // profileCost_lm = 10
    // materialCost = 50 * 5 = 250
    // processingCost = (10 + 10) * 5 = 100
    // weight = 0.5 * 0.03 * 2.7 * 1000 * 5 = 202.5
    const result = calculateOrderCosts(params);
    expect(result.materialCost).toBe(250);
    expect(result.processingCost).toBe(100);
    expect(result.totalCost).toBe(350);
    expect(result.weight).toBe(202.5);
  });

  it('should include okapnik costs correctly', () => {
    const params: CalculationParams = {
      ...defaultParams,
      okapnikEdges: { ...mockOkapnikEdges, front: true },
    };
    // okapnikCost = 1.0 * 5 = 5
    // totalCost = 70 + 5 = 75
    const result = calculateOrderCosts(params);
    expect(result.okapnikCost).toBe(5);
    expect(result.totalCost).toBe(75);
  });

  it('should apply bunja broken edge upcharge', () => {
    const params: CalculationParams = {
      ...defaultParams,
      selectedElement: {
        ...defaultParams.selectedElement!,
        orderUnit: 'sqm',
        hasSpecialBunjaEdges: true,
      },
      bunjaEdgeStyle: 'lomljene',
      quantity: 1,
    };
    // materialCost = 100 * 1 = 100
    // processingCost = 20 * 1 + 25 * 1 = 45
    const result = calculateOrderCosts(params);
    expect(result.processingCost).toBe(45);
  });
});
