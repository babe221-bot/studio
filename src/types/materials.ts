// Re-export Material and related types from index.ts to avoid duplication
export type {
  Material,
  SurfaceFinish,
  EdgeProfile,
  ProcessedEdges,
  OrderItem,
  ProjectVersion,
  ProjectTemplate,
  ModalType,
  ConstructionElement,
  EditableItem,
} from './index';

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
  operation:
    | 'analyze_geometry'
    | 'suggest_dimensions'
    | 'check_constraints'
    | 'optimize_layout';
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

// ── Collaboration Types ───────────────────────────────────────────────────
export interface UserPresence {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  cursorPosition?: { x: number; y: number };
  selectedField?: string;
  lastActive: number;
}

export interface DeltaUpdate {
  configId: string;
  timestamp: number;
  clientId: string;
  changes: Record<string, unknown>;
}

export type CollaborationPermission = 'view' | 'edit' | 'admin';

export interface Collaborator {
  config_id: string;
  user_id: string;
  permission: CollaborationPermission;
  created_at: string;
}

export interface ConfigLock {
  config_id: string;
  field: string;
  client_id: string;
  acquired_at: string;
}

// ── User Settings Types ───────────────────────────────────────────────────────
export interface EmailPreferences {
  welcome: boolean;
  order_confirmation: boolean;
  receipt: boolean;
  [key: string]: boolean;
}
