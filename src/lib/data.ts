import type { Material, SurfaceFinish, EdgeProfile } from '@/types';

export const initialMaterials: Material[] = [
  {
    id: 1,
    name: 'Visočan',
    density: 2.6,
    cost_sqm: 190,
    texture: 'https://placehold.co/1024x1024/EAE8E1/BDBAAB.png',
  },
  {
    id: 2,
    name: 'Mironja',
    density: 2.65,
    cost_sqm: 170,
    texture: 'https://placehold.co/1024x1024/DED9C4/A49E82.png',
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
    name: 'Sivac',
    density: 2.67,
    cost_sqm: 210,
    texture: 'https://placehold.co/1024x1024/C5C6C7/8E8F90.png',
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
  { id: 11, name: 'Smuš C5 (5mm 45°)', cost_m: 10 },
  { id: 12, name: 'Smuš C10 (10mm 45°)', cost_m: 12 },
  { id: 20, name: 'Polu-zaobljena R1.5cm (za visinu 3cm)', cost_m: 15 },
  { id: 21, name: 'Polu-zaobljena R2.0cm (za visinu 4cm)', cost_m: 18 },
  { id: 30, name: 'Puno-zaobljena R1.5cm (za visinu 3cm)', cost_m: 20 },
];
