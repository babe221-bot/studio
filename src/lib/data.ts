import type { Material, SurfaceFinish, EdgeProfile } from '@/types';

export const initialMaterials: Material[] = [
  {
    id: 1,
    name: 'Kirmenjak',
    density: 2.65,
    cost_sqm: 190,
    texture: 'https://placehold.co/1024x1024/FFFACD/FFD700.png',
  },
  {
    id: 2,
    name: 'Kanfanar',
    density: 2.63,
    cost_sqm: 175,
    texture: 'https://placehold.co/1024x1024/DCDCDC/778899.png',
  },
    {
    id: 3,
    name: 'Plano',
    density: 2.70,
    cost_sqm: 250,
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
    cost_sqm: 220,
    texture: 'https://placehold.co/1024x1024/E8E4D9/C0B8A8.png',
  },
  {
    id: 6,
    name: 'Lahor',
    density: 2.58,
    cost_sqm: 160,
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
  { id: 1, name: 'C0.5 (0.5mm obaranje 45°)', cost_m: 5 },
  { id: 2, name: 'C1 (1mm obaranje 45°)', cost_m: 7 },
  { id: 3, name: 'C2 (2mm obaranje 45°)', cost_m: 8 },
  { id: 4, name: 'C5 (5mm obaranje 45°)', cost_m: 10 },
  { id: 5, name: 'R1 (Polu C profil)', cost_m: 8 },
  { id: 6, name: 'R2 (Polu C profil)', cost_m: 10 },
  { id: 7, name: 'R3 (Polu C profil)', cost_m: 12 },
  { id: 8, name: 'R5 (Puno C profil)', cost_m: 15 },
  { id: 9, name: 'R10 (Puno C profil)', cost_m: 20 },
];
