import type { Material, SurfaceFinish, EdgeProfile } from '@/types';

export const initialMaterials: Material[] = [
  {
    id: 1,
    name: 'Brač - Veselje Unito',
    density: 2.65,
    cost_sqm: 250,
    texture: 'https://placehold.co/1024x1024/F5F5DC/A39E8B.png',
  },
  {
    id: 2,
    name: 'Seget - Svijetli',
    density: 2.7,
    cost_sqm: 160,
    texture: 'https://placehold.co/1024x1024/FDF5E6/CD853F.png',
  },
    {
    id: 3,
    name: 'Kanfanar - Sivo Plavi',
    density: 2.72,
    cost_sqm: 175,
    texture: 'https://placehold.co/1024x1024/DCDCDC/778899.png',
  },
  {
    id: 4,
    name: 'Kirmenjak - Istarski Žuti',
    density: 2.6,
    cost_sqm: 190,
    texture: 'https://placehold.co/1024x1024/FFFACD/FFD700.png',
  },
  {
    id: 5,
    name: 'Planit - Vapnenac',
    density: 2.68,
    cost_sqm: 155,
    texture: 'https://placehold.co/1024x1024/E8E4D9/C0B8A8.png',
  },
  {
    id: 6,
    name: 'Mironja - Crvenkasti',
    density: 2.66,
    cost_sqm: 210,
    texture: 'https://placehold.co/1024x1024/E9967A/8B4513.png',
  },
  {
    id: 7,
    name: 'Marčana - Bež',
    density: 2.62,
    cost_sqm: 180,
    texture: 'https://placehold.co/1024x1024/F5DEB3/D2B48C.png',
  },
  {
    id: 8,
    name: 'Hrvatski Travertin',
    density: 2.45,
    cost_sqm: 220,
    texture: 'https://placehold.co/1024x1024/D8CFC5/B1A395.png',
  }
];

export const initialSurfaceFinishes: SurfaceFinish[] = [
  { id: 1, name: 'Polirano', cost_sqm: 25 },
  { id: 2, name: 'Brušeno (mat)', cost_sqm: 15 },
  { id: 3, name: 'Štokovano', cost_sqm: 40 },
  { id: 4, name: 'Pjeskareno', cost_sqm: 35 },
  { id: 5, name: 'Paljeno', cost_sqm: 45 },
  { id: 6, name: 'Antikato (četkano)', cost_sqm: 30 },
];

export const initialEdgeProfiles: EdgeProfile[] = [
  { id: 1, name: 'Ravni rez (pilan)', cost_m: 5 },
  { id: 2, name: 'Polirana ravna ivica', cost_m: 15 },
  { id: 3, name: 'Faza 2mm', cost_m: 20 },
  { id: 8, name: 'Faza 5mm', cost_m: 22 },
  { id: 9, name: 'Faza 10mm', cost_m: 25 },
  { id: 4, name: 'Četvrt-krug R10mm', cost_m: 30 },
  { id: 10, name: 'Četvrt-krug R20mm', cost_m: 32 },
  { id: 11, name: 'Četvrt-krug R30mm', cost_m: 35 },
  { id: 5, name: 'Polu-zaobljena R15mm (za visinu 3cm)', cost_m: 45 },
  { id: 6, name: 'Puno zaobljena R15mm (za visinu 3cm)', cost_m: 60 },
];

export const OKAPNIK_COST_PER_M = 25;
