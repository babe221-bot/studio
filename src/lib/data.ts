import type { Material, SurfaceFinish, EdgeProfile } from '@/types';

export const initialMaterials: Material[] = [
  {
    id: 1,
    name: 'Plano',
    density: 2.7,
    cost_sqm: 220,
    texture: 'https://placehold.co/1024x1024/F5F5DC/A39E8B.png',
  },
  {
    id: 2,
    name: 'Kirmenjak',
    density: 2.65,
    cost_sqm: 180,
    texture: 'https://placehold.co/1024x1024/EAE8E1/BDBAAB.png',
  },
  {
    id: 3,
    name: 'Visočan',
    density: 2.6,
    cost_sqm: 190,
    texture: 'https://placehold.co/1024x1024/F0EFEA/C1BEB7.png',
  },
  {
    id: 4,
    name: 'Sivac',
    density: 2.67,
    cost_sqm: 210,
    texture: 'https://placehold.co/1024x1024/C5C6C7/8E8F90.png',
  },
  {
    id: 5,
    name: 'Kanfanar',
    density: 2.63,
    cost_sqm: 160,
    texture: 'https://placehold.co/1024x1024/DED9C4/A49E82.png',
  },
  {
    id: 6,
    name: 'Avorio',
    density: 2.68,
    cost_sqm: 280,
    texture: 'https://placehold.co/1024x1024/FDF5E6/B0A492.png',
  },
  {
    id: 7,
    name: 'Pulenat',
    density: 2.64,
    cost_sqm: 200,
    texture: 'https://placehold.co/1024x1024/DCDCDC/A9A9A9.png',
  },
  {
    id: 8,
    name: 'Lahor',
    density: 2.58,
    cost_sqm: 140,
    texture: 'https://placehold.co/1024x1024/FAF0E6/C3B091.png',
  },
  {
    id: 9,
    name: 'Mironja',
    density: 2.8,
    cost_sqm: 250,
    texture: 'https://placehold.co/1024x1024/D2B48C/8C7853.png',
  },
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
  { id: 10, name: 'Smuš C0.5 (0.5mm 45°)', cost_m: 5 },
  { id: 11, name: 'Smuš C1 (1mm 45°)', cost_m: 7 },
  { id: 12, name: 'Smuš C2 (2mm 45°)', cost_m: 8 },
  { id: 13, name: 'Smuš C5 (5mm 45°)', cost_m: 10 },
  { id: 20, name: 'Polu-zaobljena R1cm', cost_m: 12 },
  { id: 21, name: 'Polu-zaobljena R1.5cm', cost_m: 15 },
  { id: 22, name: 'Polu-zaobljena R2cm', cost_m: 18 },
  { id: 30, name: 'Puno-zaobljena R1.5cm', cost_m: 20 },
  { id: 31, name: 'Puno-zaobljena R2cm', cost_m: 25 },
];
