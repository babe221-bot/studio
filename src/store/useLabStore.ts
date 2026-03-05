import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ConstructionElement, ProcessedEdges } from '@/types';
import { constructionElements } from '@/lib/constructionElements';

interface LabState {
  selectedElement: ConstructionElement;
  length: number;
  width: number;
  height: number;
  quantity: number;
  specimenId: string;
  selectedMaterialId: string | undefined;
  selectedFinishId: string | undefined;
  selectedProfileId: string | undefined;
  processedEdges: ProcessedEdges;
  okapnikEdges: ProcessedEdges;
  bunjaEdgeStyle: 'oštre' | 'lomljene';
  grainOffset: { x: number; y: number };
  grainRotation: number;
  mirrorGrain: boolean;

  // Actions
  setSelectedElement: (element: ConstructionElement) => void;
  setDimensions: (dims: { length?: number; width?: number; height?: number }) => void;
  setQuantity: (qty: number) => void;
  setSpecimenId: (id: string) => void;
  setMaterialId: (id: string) => void;
  setFinishId: (id: string) => void;
  setProfileId: (id: string) => void;
  setProcessedEdge: (edge: keyof ProcessedEdges, value: boolean) => void;
  setOkapnikEdge: (edge: keyof ProcessedEdges, value: boolean) => void;
  setBunjaEdgeStyle: (style: 'oštre' | 'lomljene') => void;
  setGrainOffset: (offset: { x?: number; y?: number }) => void;
  setGrainRotation: (rotation: number) => void;
  setMirrorGrain: (mirror: boolean) => void;
  resetToDefaults: (elementId?: string) => void;
}

const DEFAULT_ELEMENT = constructionElements[0];

export const useLabStore = create<LabState>()(
  persist(
    (set, get) => ({
      selectedElement: DEFAULT_ELEMENT,
      length: DEFAULT_ELEMENT.defaultLength,
      width: DEFAULT_ELEMENT.defaultWidth,
      height: DEFAULT_ELEMENT.defaultHeight,
      quantity: 1,
      specimenId: `${DEFAULT_ELEMENT.name} 01`,
      selectedMaterialId: undefined,
      selectedFinishId: undefined,
      selectedProfileId: undefined,
      processedEdges: {
        front: true,
        back: false,
        left: false,
        right: false,
      },
      okapnikEdges: {
        front: false,
        back: false,
        left: false,
        right: false,
      },
      bunjaEdgeStyle: 'lomljene',
      grainOffset: { x: 0, y: 0 },
      grainRotation: 0,
      mirrorGrain: false,

      setSelectedElement: (element) => {
        set({
          selectedElement: element,
          length: element.defaultLength,
          width: element.defaultWidth,
          height: element.defaultHeight,
          specimenId: `${element.name} 01`,
          quantity: 1,
          processedEdges: (element.orderUnit === 'sqm' || element.orderUnit === 'lm')
            ? { front: false, back: false, left: false, right: false }
            : { front: true, back: false, left: false, right: false },
          okapnikEdges: { front: false, back: false, left: false, right: false },
          grainOffset: { x: 0, y: 0 },
          grainRotation: 0,
          mirrorGrain: false
        });
      },

      setDimensions: (dims) => set((state) => ({
        length: dims.length ?? state.length,
        width: dims.width ?? state.width,
        height: dims.height ?? state.height
      })),

      setQuantity: (quantity) => set({ quantity }),
      setSpecimenId: (specimenId) => set({ specimenId }),
      setMaterialId: (selectedMaterialId) => set({ selectedMaterialId }),
      setFinishId: (selectedFinishId) => set({ selectedFinishId }),
      setProfileId: (selectedProfileId) => set({ selectedProfileId }),

      setProcessedEdge: (edge, checked) => set((state) => {
        const next = { ...state.processedEdges, [edge]: checked };
        // If processed edge is unchecked, okapnik must also be unchecked
        let nextOkapnik = { ...state.okapnikEdges };
        if (!checked) {
          nextOkapnik[edge] = false;
        }
        return { processedEdges: next, okapnikEdges: nextOkapnik };
      }),

      setOkapnikEdge: (edge, checked) => set((state) => ({
        okapnikEdges: { ...state.okapnikEdges, [edge]: checked }
      })),

      setBunjaEdgeStyle: (bunjaEdgeStyle) => set({ bunjaEdgeStyle }),

      setGrainOffset: (offset) => set((state) => ({
        grainOffset: {
          x: offset.x ?? state.grainOffset.x,
          y: offset.y ?? state.grainOffset.y
        }
      })),

      setGrainRotation: (grainRotation) => set({ grainRotation }),

      setMirrorGrain: (mirrorGrain) => set({ mirrorGrain }),

      resetToDefaults: (elementId) => {
        const element = elementId 
          ? constructionElements.find(e => e.id === elementId) || DEFAULT_ELEMENT
          : DEFAULT_ELEMENT;
        
        get().setSelectedElement(element);
      }
    }),
    {
      name: 'lab-storage', // unique name for localStorage
      partialize: (state) => ({
        // Persist everything except possibly transient UI states if we had any
        selectedElement: state.selectedElement,
        length: state.length,
        width: state.width,
        height: state.height,
        quantity: state.quantity,
        specimenId: state.specimenId,
        selectedMaterialId: state.selectedMaterialId,
        selectedFinishId: state.selectedFinishId,
        selectedProfileId: state.selectedProfileId,
        processedEdges: state.processedEdges,
        okapnikEdges: state.okapnikEdges,
        bunjaEdgeStyle: state.bunjaEdgeStyle,
        grainOffset: state.grainOffset,
        grainRotation: state.grainRotation,
        mirrorGrain: state.mirrorGrain,
      }),
    }
  )
);
