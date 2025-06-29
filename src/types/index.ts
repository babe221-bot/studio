export interface Material {
  id: number;
  name: string;
  density: number;
  cost_sqm: number;
  texture: string;
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
  okapnik: ProcessedEdges;
  totalCost: number;
  snapshotDataUri?: string;
}

export type ModalType = 'material' | 'finish' | 'profile' | null;

export type EditableItem = Material | SurfaceFinish | EdgeProfile;
