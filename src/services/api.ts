import type { Material, SurfaceFinish, EdgeProfile } from '@/types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000';

/**
 * Fetch materials from the backend API
 */
export async function fetchMaterials(): Promise<Material[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/materials`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    // Transform API response to match our Material type
    return data.map((item: any) => ({
      id: parseInt(item.id),
      name: item.name,
      density: item.density || 0,
      cost_sqm: item.cost_sqm || 0,
      texture: item.texture || '',
      color: item.color || '#FFFFFF',
    }));
  } catch (error) {
    console.error('Failed to fetch materials:', error);
    // Return empty array to allow fallback to hardcoded data
    return [];
  }
}

/**
 * Fetch surface finishes from the backend API
 */
export async function fetchSurfaceFinishes(): Promise<SurfaceFinish[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/finishes`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    // Transform API response to match our SurfaceFinish type
    return data.map((item: any) => ({
      id: parseInt(item.id),
      name: item.name,
      cost_sqm: item.cost_sqm || 0,
    }));
  } catch (error) {
    console.error('Failed to fetch surface finishes:', error);
    // Return empty array to allow fallback to hardcoded data
    return [];
  }
}

/**
 * Fetch edge profiles from the backend API
 */
export async function fetchEdgeProfiles(): Promise<EdgeProfile[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/profiles`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    // Transform API response to match our EdgeProfile type
    return data.map((item: any) => ({
      id: parseInt(item.id),
      name: item.name,
      cost_m: item.cost_m || 0,
    }));
  } catch (error) {
    console.error('Failed to fetch edge profiles:', error);
    // Return empty array to allow fallback to hardcoded data
    return [];
  }
}
