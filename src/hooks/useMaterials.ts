import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Material } from '@/types';
import { useMaterialTextures } from '@/hooks/useMaterialTextures';

interface UseMaterialsOptions {
  category?: string;
  featured?: boolean;
  limit?: number;
}

export function useMaterials(options: UseMaterialsOptions = {}) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMaterials = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase.from('materials').select('*').eq('is_active', true);

      if (options.category) {
        query = query.eq('category_id', options.category);
      }

      if (options.featured) {
        query = query.eq('is_featured', true);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error: supabaseError } = await query;

      if (supabaseError) throw supabaseError;

      // Transform the data to match our Material type if needed
      const transformedMaterials = (data || []).map((material) => ({
        id: material.id,
        name: material.name,
        display_name: material.display_name,
        density: material.density,
        cost_sqm: material.base_price_sqm || material.cost_sqm, // Map cost_sqm from base_price_sqm
        texture: material.texture || '', // We'll need to get this from material_textures
        color: material.base_color || material.color,
        // PBR properties
        roughness: material.pbr_properties?.roughness,
        metallic: material.pbr_properties?.metallic,
        normalStrength: material.pbr_properties?.normalStrength,
        displacementScale: material.pbr_properties?.displacementScale,
        clearcoat: material.pbr_properties?.clearcoat,
        ambientOcclusion: material.pbr_properties?.ambientOcclusion,
        // Additional properties
        category_id: material.category_id,
        subcategory: material.subcategory,
        supplier: material.supplier,
        supplierSku: material.supplierSku,
        origin: material.origin,
        availability: material.availability,
        leadTimeDays: material.leadTimeDays,
        tags: material.tags,
        isFeatured: material.isFeatured,
      }));

      setMaterials(transformedMaterials);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [options.category, options.featured, options.limit]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  return {
    materials,
    isLoading,
    error,
    refetch: fetchMaterials,
  };
}

export function useMaterial(materialId: string | number) {
  const [material, setMaterial] = useState<Material | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!materialId) return;

    const fetchMaterial = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: supabaseError } = await supabase
          .from('materials')
          .select('*')
          .eq('id', materialId)
          .single();

        if (supabaseError) throw supabaseError;

        if (data) {
          setMaterial({
            id: data.id,
            name: data.name,
            display_name: data.display_name,
            density: data.density,
            cost_sqm: data.base_price_sqm || data.cost_sqm,
            texture: data.texture || '',
            color: data.base_color || data.color,
            // PBR properties
            roughness: data.pbr_properties?.roughness,
            metallic: data.pbr_properties?.metallic,
            normalStrength: data.pbr_properties?.normalStrength,
            displacementScale: data.pbr_properties?.displacementScale,
            clearcoat: data.pbr_properties?.clearcoat,
            ambientOcclusion: data.pbr_properties?.ambientOcclusion,
            // Additional properties
            category_id: data.category_id,
            subcategory: data.subcategory,
            supplier: data.supplier,
            supplierSku: data.supplierSku,
            origin: data.origin,
            availability: data.availability,
            leadTimeDays: data.leadTimeDays,
            tags: data.tags,
            isFeatured: data.isFeatured,
          });
        }
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMaterial();
  }, [materialId]);

  return { material, isLoading, error };
}

export function useMaterials(options: UseMaterialsOptions = {}) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMaterials = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase.from('materials').select('*').eq('is_active', true);

      if (options.category) {
        query = query.eq('category_id', options.category);
      }

      if (options.featured) {
        query = query.eq('is_featured', true);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error: supabaseError } = await query;

      if (supabaseError) throw supabaseError;

      // Transform the data to match our Material type if needed
      const transformedMaterials = (data || []).map((material) => ({
        id: material.id,
        name: material.name,
        display_name: material.display_name,
        density: material.density,
        cost_sqm: material.base_price_sqm || material.cost_sqm, // Map cost_sqm from base_price_sqm
        texture: material.texture || '', // We'll need to get this from material_textures
        color: material.base_color || material.color,
        // PBR properties
        roughness: material.pbr_properties?.roughness,
        metallic: material.pbr_properties?.metallic,
        normalStrength: material.pbr_properties?.normalStrength,
        displacementScale: material.pbr_properties?.displacementScale,
        clearcoat: material.pbr_properties?.clearcoat,
        ambientOcclusion: material.pbr_properties?.ambientOcclusion,
        // Additional properties
        category_id: material.category_id,
        subcategory: material.subcategory,
        supplier: material.supplier,
        supplierSku: material.supplierSku,
        origin: material.origin,
        availability: material.availability,
        leadTimeDays: material.leadTimeDays,
        tags: material.tags,
        isFeatured: material.isFeatured,
      }));

      setMaterials(transformedMaterials);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [options.category, options.featured, options.limit]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  return {
    materials,
    isLoading,
    error,
    refetch: fetchMaterials,
  };
}

export function useMaterials(options: UseMaterialsOptions = {}) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMaterials = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase.from('materials').select('*').eq('is_active', true);

      if (options.category) {
        query = query.eq('category_id', options.category);
      }

      if (options.featured) {
        query = query.eq('is_featured', true);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error: supabaseError } = await query;

      if (supabaseError) throw supabaseError;

      // Transform the data to match our Material type if needed
      const transformedMaterials = (data || []).map((material) => ({
        id: material.id,
        name: material.name,
        display_name: material.display_name,
        density: material.density,
        cost_sqm: material.base_price_sqm || material.cost_sqm, // Map cost_sqm from base_price_sqm
        texture: material.texture || '', // We'll need to get this from material_textures
        color: material.base_color || material.color,
        // PBR properties
        roughness: material.pbr_properties?.roughness,
        metallic: material.pbr_properties?.metallic,
        normalStrength: material.pbr_properties?.normalStrength,
        displacementScale: material.pbr_properties?.displacementScale,
        clearcoat: material.pbr_properties?.clearcoat,
        ambientOcclusion: material.pbr_properties?.ambientOcclusion,
        // Additional properties
        category_id: material.category_id,
        subcategory: material.subcategory,
        supplier: material.supplier,
        supplierSku: material.supplier_sku,
        origin: material.origin,
        availability: material.availability,
        leadTimeDays: material.lead_time_days,
        tags: material.tags,
        isFeatured: material.is_featured,
      }));

      setMaterials(transformedMaterials);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [options.category, options.featured, options.limit]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  return {
    materials,
    isLoading,
    error,
    refetch: fetchMaterials,
  };
}

export function useMaterial(materialId: string | number) {
  const [material, setMaterial] = useState<Material | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!materialId) return;

    const fetchMaterial = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: supabaseError } = await supabase
          .from('materials')
          .select('*')
          .eq('id', materialId)
          .single();

        if (supabaseError) throw supabaseError;

        if (data) {
          setMaterial({
            id: data.id,
            name: data.name,
            display_name: data.display_name,
            density: data.density,
            cost_sqm: data.base_price_sqm || data.cost_sqm,
            texture: data.texture || '',
            color: data.base_color || data.color,
            // PBR properties
            roughness: data.pbr_properties?.roughness,
            metallic: data.pbr_properties?.metallic,
            normalStrength: data.pbr_properties?.normalStrength,
            displacementScale: data.pbr_properties?.displacementScale,
            clearcoat: data.pbr_properties?.clearcoat,
            ambientOcclusion: data.pbr_properties?.ambientOcclusion,
            // Additional properties
            category_id: data.category_id,
            subcategory: data.subcategory,
            supplier: data.supplier,
            supplierSku: data.supplier_sku,
            origin: data.origin,
            availability: data.availability,
            leadTimeDays: data.lead_time_days,
            tags: data.tags,
            isFeatured: data.is_featured,
          });
        }
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMaterial();
  }, [materialId]);

  return { material, isLoading, error };
}
