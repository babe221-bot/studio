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
  planSnapshotUrl?: string;
  orderUnit: 'piece' | 'sqm' | 'lm';
  quantity: number;
  bunjaEdgeStyle?: 'oštre' | 'lomljene';
}

export interface ProjectVersion {
  id: string;
  name: string;
  timestamp: number;
  items: OrderItem[];
  notes?: string;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  items: OrderItem[];
  description?: string;
  createdAt: number;
}

export type ModalType = 'material' | 'finish' | 'profile' | null;

export interface ConstructionElement {
  id: string;
  name: string;
  defaultLength: number;
  defaultWidth: number;
  defaultHeight: number;
  orderUnit: 'piece' | 'sqm' | 'lm';
  hasSpecialBunjaEdges?: boolean;
}

export type EditableItem = Material | SurfaceFinish | EdgeProfile;

export const TechnicalDrawingInputSchema = z.object({
  length: z.number().describe('The length of the slab in cm.'),
  width: z.number().describe('The width of the slab in cm.'),
  profileName: z.string().describe('The name of the edge profile.'),
  surfaceFinishName: z.string().describe('The name of the surface finish.'),
  processedEdges: z.array(z.string()).describe('A list of edges to be processed (e.g., "Prednja", "Lijeva").'),
  okapnikEdges: z.array(z.string()).describe('A list of edges with a drip edge (okapnik).'),
  bunjaEdgeStyle: z.optional(z.enum(['oštre', 'lomljene'])).describe('The edge style for Bunja stone, if applicable.'),
  isBunja: z.boolean().describe('A flag indicating if the item is Bunja stone, requiring a different drawing style.'),
});
export type TechnicalDrawingInput = z.infer<typeof TechnicalDrawingInputSchema>;

export const TechnicalDrawingOutputSchema = z.object({
  imageDataUri: z.string().describe("The generated technical drawing as a data URI. Expected format: 'data:image/png;base64,<encoded_data>'."),
  imageUrl: z.string().describe("The public URL of the generated drawing stored in Supabase Storage."),
});
export type TechnicalDrawingOutput = z.infer<typeof TechnicalDrawingOutputSchema>;

// ── AI Chat Types ─────────────────────────────────────────────────────────────

/**
 * Request payload for the AI chat endpoint.
 */
export interface AIChatRequest {
  messages: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  cadContext?: string;
}

/**
 * Response from the AI chat endpoint (streaming).
 */
export interface AIChatResponse {
  stream: ReadableStream<Uint8Array>;
}

/**
 * Request payload for CAD-specific AI operations via Python backend.
 */
export interface CADAIRequest {
  operation: 'analyze_geometry' | 'suggest_dimensions' | 'check_constraints' | 'optimize_layout';
  payload: {
    dimensions?: { length: number; width: number; height: number };
    material?: string;
    constraints?: Array<{ type: string; value: number | string }>;
    existingItems?: Array<{
      dims: { length: number; width: number; height: number };
      position?: { x: number; y: number };
    }>;
  };
}

/**
 * Response from CAD-specific AI operations.
 */
export interface CADAIResponse {
  success: boolean;
  result?: {
    suggestions?: Array<{ description: string; confidence: number }>;
    issues?: Array<{ severity: 'warning' | 'error'; message: string }>;
    optimizedLayout?: Array<{
      itemId: string;
      position: { x: number; y: number };
      rotation: number;
    }>;
  };
  error?: string;
}
