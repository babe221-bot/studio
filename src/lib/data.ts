import type { Material, SurfaceFinish, EdgeProfile } from '@/types';

export const initialMaterials: Material[] = [
  {
    id: 1,
    name: 'Sivi Granit',
    density: 2.75,
    cost_sqm: 130,
    texture: 'https://placehold.co/1024x1024/a0a0a0/606060.png?text=Granit',
  },
  {
    id: 2,
    name: 'Crni Mramor',
    density: 2.71,
    cost_sqm: 180,
    texture: 'https://placehold.co/1024x1024/202020/f0f0f0.png?text=Mramor',
  },
];

export const initialSurfaceFinishes: SurfaceFinish[] = [
  { id: 1, name: 'Brušeno', cost_sqm: 0 },
  { id: 2, name: 'Polirano (Visoki sjaj)', cost_sqm: 25 },
  { id: 3, name: 'Paljeno', cost_sqm: 35 },
];

export const initialEdgeProfiles: EdgeProfile[] = [
  { id: 1, name: 'Ravna ivica', cost_m: 10 },
  { id: 2, name: 'Šamf (oborena ivica)', cost_m: 15 },
  { id: 3, name: 'Polu C', cost_m: 30 },
  { id: 4, name: 'Puno C', cost_m: 45 },
];
