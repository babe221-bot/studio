import type { Material, SurfaceFinish, EdgeProfile } from '@/types';

export const initialMaterials: Material[] = [
  {
    id: 1,
    name: 'Brački kamen (Veselje)',
    density: 2.65,
    cost_sqm: 250,
    texture: 'https://placehold.co/1024x1024/f5f5dc/a39e8b.png',
  },
  {
    id: 2,
    name: 'Seget (Svijetli)',
    density: 2.7,
    cost_sqm: 160,
    texture: 'https://placehold.co/1024x1024/fdf5e6/cd853f.png',
  },
  {
    id: 3,
    name: 'Istarski Žuti (Giallo d\'Istria)',
    density: 2.6,
    cost_sqm: 190,
    texture: 'https://placehold.co/1024x1024/fffacd/ffd700.png',
  },
  {
    id: 4,
    name: 'Kanfanar (Gris-blu)',
    density: 2.72,
    cost_sqm: 175,
    texture: 'https://placehold.co/1024x1024/dcdcdc/778899.png',
  },
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
  { id: 3, name: 'Oborena ivica 2mm (faza)', cost_m: 20 },
  { id: 4, name: 'Zaobljena R5 (četvrt-krug)', cost_m: 30 },
  { id: 5, name: 'Polu-zaobljena (polu-C)', cost_m: 45 },
  { id: 6, name: 'Puno zaobljena (C-profil)', cost_m: 60 },
];
