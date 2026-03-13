'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  initialMaterials,
  initialSurfaceFinishes,
  initialEdgeProfiles,
} from '@/lib/data';
import type { Material, SurfaceFinish, EdgeProfile } from '@/types';

export function useLabData() {
  const [materials, setMaterials] = useState<Material[]>(initialMaterials);
  const [finishes, setFinishes] = useState<SurfaceFinish[]>(
    initialSurfaceFinishes
  );
  const [profiles, setProfiles] = useState<EdgeProfile[]>(initialEdgeProfiles);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch Materials
      const { data: mats, error: mError } = await supabase
        .from('materials')
        .select('*')
        .eq('is_active', true);

      if (mError) {
        console.warn(
          'Failed to fetch materials from Supabase, using initial data:',
          mError
        );
      } else if (mats && mats.length > 0) {
        setMaterials(
          mats.map((m) => ({
            ...m,
            cost_sqm: m.base_price_sqm || m.cost_sqm,
            texture: m.texture || '',
            color: m.base_color || m.color,
            roughness: m.pbr_properties?.roughness ?? 0.15,
            metallic: m.pbr_properties?.metallic ?? 0,
            normalStrength: m.pbr_properties?.normalStrength ?? 1,
            displacementScale: m.pbr_properties?.displacementScale ?? 0.001,
            clearcoat: m.pbr_properties?.clearcoat ?? 0.2,
            ambientOcclusion: m.pbr_properties?.ambientOcclusion ?? 0.5,
          }))
        );
      }

      // 2. Fetch Finishes
      const { data: fins, error: fError } = await supabase
        .from('surface_finishes')
        .select('*');

      if (!fError && fins && fins.length > 0) {
        setFinishes(fins);
      }

      // 3. Fetch Profiles
      const { data: profs, error: pError } = await supabase
        .from('edge_profiles')
        .select('*');

      if (!pError && profs && profs.length > 0) {
        setProfiles(profs);
      }
    } catch (err) {
      console.error('Data sync failed:', err);
      // Fallback to initial data already set
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    materials,
    setMaterials,
    finishes,
    setFinishes,
    profiles,
    setProfiles,
    isLoading,
    error,
    refetch: fetchData,
  };
}
