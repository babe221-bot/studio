
import { z } from 'zod';

export interface Material {
  id: number;
  name: string;
  density: number;
  cost_sqm: number;
  texture: string;
  color: string;
}

export interface SurfaceFinish {
  id: number;
  name: string;
  cost_sqm: number;
}

export interface EdgeProfile {
  id: number;
  name: string;
  cost_m: number;
}

export interface ProcessedEdges {
  front: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
}

export interface OrderItem {
  orderId: number;
  id: string;
  dims: {
    length: number;
    width: number;
    height: number;
  };
  material: Material;
  finish: SurfaceFinish;
  profile: EdgeProfile;
  processedEdges: ProcessedEdges;
  okapnikEdges: ProcessedEdges;
  totalCost: number;
  planSnapshotDataUri?: string;
  quantity_sqm?: number;
}

export type ModalType = 'material' | 'finish' | 'profile' | null;

export interface ConstructionElement {
  id: string;
  name: string;
  defaultLength: number;
  defaultWidth: number;
  defaultHeight: number;
  hasQuantityInput?: boolean;
}

export type EditableItem = Material | SurfaceFinish | EdgeProfile;

export const TechnicalDrawingInputSchema = z.object({
  length: z.number().describe('The length of the slab in cm.'),
  width: z.number().describe('The width of the slab in cm.'),
  profileName: z.string().describe('The name of the edge profile.'),
  surfaceFinishName: z.string().describe('The name of the surface finish.'),
  processedEdges: z.array(z.string()).describe('A list of edges to be processed (e.g., "Prednja", "Lijeva").'),
  okapnikEdges: z.array(z.string()).describe('A list of edges with a drip edge (okapnik).'),
});
export type TechnicalDrawingInput = z.infer<typeof TechnicalDrawingInputSchema>;

export const TechnicalDrawingOutputSchema = z.object({
    imageDataUri: z.string().describe("The generated technical drawing as a data URI. Expected format: 'data:image/png;base64,<encoded_data>'."),
});
export type TechnicalDrawingOutput = z.infer<typeof TechnicalDrawingOutputSchema>;
