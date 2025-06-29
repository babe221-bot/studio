import type { Material, SurfaceFinish, EdgeProfile } from '@/types';

export const initialMaterials: Material[] = [
  {
    id: 1,
    name: 'Kirmenjak',
    density: 2.65,
    cost_sqm: 180,
    texture: 'https://placehold.co/1024x1024/FFFACD/FFD700.png',
  },
  {
    id: 2,
    name: 'Kanfanar',
    density: 2.63,
    cost_sqm: 160,
    texture: 'https://placehold.co/1024x1024/DCDCDC/778899.png',
  },
  {
    id: 3,
    name: 'Plano',
    density: 2.70,
    cost_sqm: 220,
    texture: 'https://placehold.co/1024x1024/F5F5DC/A39E8B.png',
  },
  {
    id: 4,
    name: 'Avorio',
    density: 2.68,
    cost_sqm: 280,
    texture: 'https://placehold.co/1024x1024/FDF5E6/CD853F.png',
  },
  {
    id: 5,
    name: 'Pulenat',
    density: 2.64,
    cost_sqm: 200,
    texture: 'https://placehold.co/1024x1024/E8E4D9/C0B8A8.png',
  },
  {
    id: 6,
    name: 'Lahor',
    density: 2.58,
    cost_sqm: 140,
    texture: 'https://placehold.co/1024x1024/D8CFC5/B1A395.png',
  }
];

export const initialSurfaceFinishes: SurfaceFinish[] = [
  { id: 1, name: 'Poliranje', cost_sqm: 15 },
  { id: 2, name: 'Martelina fina', cost_sqm: 20 },
  { id: 3, name: 'Bućarda fina', cost_sqm: 18 },
  { id: 4, name: 'Bućarda gruba', cost_sqm: 12 },
  { id: 5, name: 'Štokovanje', cost_sqm: 8 },
  { id: 6, name: 'Plamena obrada', cost_sqm: 12 },
  { id: 7, name: 'Pjeskarenje', cost_sqm: 10 },
];

export const initialEdgeProfiles: EdgeProfile[] = [
  { id: 1, name: 'Ravni rez (pilan)', cost_m: 2 },
  { id: 10, name: 'C0.5 (0.5mm 45°)', cost_m: 5 },
  { id: 11, name: 'C1 (1mm 45°)', cost_m: 7 },
  { id: 12, name: 'C2 (2mm 45°)', cost_m: 8 },
  { id: 13, name: 'C5 (5mm 45°)', cost_m: 10 },
  { id: 20, name: 'Polu C R1 (radijus 1mm)', cost_m: 8 },
  { id: 21, name: 'Polu C R2 (radijus 2mm)', cost_m: 10 },
  { id: 22, name: 'Polu C R3 (radijus 3mm)', cost_m: 12 },
  { id: 30, name: 'Puno C R5 (radijus 5mm)', cost_m: 15 },
  { id: 31, name: 'Puno C R10 (radijus 10mm)', cost_m: 20 },
];
