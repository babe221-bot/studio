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
  { id: 1, name: 'Ravni rez (pilan)', cost_m: 2 },
  { id: 10, name: 'Smuš C2 (2mm 45°)', cost_m: 8 },
  { id: 11, name: 'Smuš C3 (3mm 45°)', cost_m: 9 },
  { id: 12, name: 'Smuš C5 (5mm 45°)', cost_m: 10 },
  { id: 13, name: 'Smuš C10 (10mm 45°)', cost_m: 12 },
  { id: 20, name: 'Polu-zaobljena R15mm (za visinu 3cm)', cost_m: 15 },
  { id: 21, name: 'Polu-zaobljena R20mm (za visinu 4cm)', cost_m: 18 },
  { id: 30, name: 'Puno-zaobljena R15mm (za visinu 3cm)', cost_m: 25 },
  { id: 31, name: 'Puno-zaobljena R20mm (za visinu 4cm)', cost_m: 30 },
];
