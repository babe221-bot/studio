'use server';

import { createClient } from '@supabase/supabase-js';
import type { Material, SurfaceFinish, EdgeProfile } from '@/types';

// Use service-role key on the server side to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Fetches all stone materials from the `materials` Supabase table.
 */
export async function getMaterials(): Promise<Material[]> {
  const { data, error } = await supabase
    .from('materials')
    .select('id, name, density, cost_sqm, texture, color')
    .order('id');

  if (error) {
    console.error('ERROR fetching materials from Supabase:', error);
    throw new Error('Failed to fetch materials.');
  }

  return data as Material[];
}

/**
 * Fetches all surface finishes from the `surface_finishes` Supabase table.
 */
export async function getSurfaceFinishes(): Promise<SurfaceFinish[]> {
  const { data, error } = await supabase
    .from('surface_finishes')
    .select('id, name, cost_sqm')
    .order('id');

  if (error) {
    console.error('ERROR fetching surface_finishes from Supabase:', error);
    throw new Error('Failed to fetch surface finishes.');
  }

  return data as SurfaceFinish[];
}

/**
 * Fetches all edge profiles from the `edge_profiles` Supabase table.
 */
export async function getEdgeProfiles(): Promise<EdgeProfile[]> {
  const { data, error } = await supabase
    .from('edge_profiles')
    .select('id, name, cost_m')
    .order('id');

  if (error) {
    console.error('ERROR fetching edge_profiles from Supabase:', error);
    throw new Error('Failed to fetch edge profiles.');
  }

  return data as EdgeProfile[];
}

/**
 * @deprecated Use getMaterials() / getSurfaceFinishes() / getEdgeProfiles() instead.
 * Kept for backwards compatibility — fetches all materials.
 */
export async function getWarehouseData(): Promise<Material[]> {
  return getMaterials();
}
