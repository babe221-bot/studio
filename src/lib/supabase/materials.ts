// Mock database functions for material operations
// In a real app, these would interact with Supabase

import type { Material } from '@/types/materials';

// Mock database
let materialsDB: Material[] = [
  {
    id: 1,
    name: 'white_marble',
    display_name: 'White Marble',
    density: 2.7,
    cost_sqm: 120,
    texture: '/textures/white_marble.jpg',
    color: '#FFFFFF',
    // PBR Properties
    roughness: 0.3,
    metallic: 0.0,
    normalStrength: 0.1,
    displacementScale: 0.01,
    clearcoat: 0.0,
    ambientOcclusion: 0.5,
    // Additional properties
    category_id: 'marble',
    subcategory: 'white',
    supplier: 'StoneCo',
    supplierSku: 'WM-001',
    origin: 'Italy',
    availability: 'In Stock',
    leadTimeDays: 7,
    tags: ['luxury', 'interior'],
    isFeatured: true,
  },
  {
    id: 2,
    name: 'black_granite',
    display_name: 'Black Granite',
    density: 2.8,
    cost_sqm: 150,
    texture: '/textures/black_granite.jpg',
    color: '#000000',
    // PBR Properties
    roughness: 0.2,
    metallic: 0.0,
    normalStrength: 0.2,
    displacementScale: 0.02,
    clearcoat: 0.0,
    ambientOcclusion: 0.3,
    // Additional properties
    category_id: 'granite',
    subcategory: 'black',
    supplier: 'RockSolid Inc.',
    supplierSku: 'BG-001',
    origin: 'India',
    availability: 'In Stock',
    leadTimeDays: 10,
    tags: ['durable', 'exterior'],
    isFeatured: true,
  },
];

export async function getMaterials(): Promise<Material[]> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300));
  return materialsDB;
}

export async function getMaterialById(id: number): Promise<Material | null> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  const material = materialsDB.find((m) => m.id === id);
  return material ?? null;
}

export async function updateMaterial(
  id: number,
  updates: Partial<Material>
): Promise<Material> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  const index = materialsDB.findIndex((m) => m.id === id);
  if (index === -1) {
    throw new Error('Material not found');
  }
  materialsDB[index] = { ...materialsDB[index], ...updates };
  return materialsDB[index];
}

// Mock texture storage
let texturesDB: Record<string, string> = {};

export async function uploadMaterialTexture(
  materialId: number,
  type: string,
  file: File
): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  // In a real app, this would upload to Supabase Storage
  const url = `/textures/material-${materialId}-${type}-${Date.now()}.${file.name.split('.').pop()}`;
  texturesDB[`${materialId}-${type}`] = url;
  return url;
}

export async function getMaterialTextures(
  materialId: number
): Promise<Record<string, string>> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(texturesDB)) {
    if (key.startsWith(`${materialId}-`)) {
      const type = key.split('-')[1];
      result[type] = value;
    }
  }
  return result;
}
