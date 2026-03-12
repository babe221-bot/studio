import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useMaterialTextures(materialId: string | number) {
  const [textures, setTextures] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchTextures = useCallback(async () => {
    if (!materialId) return;
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: supabaseError } = await supabase
        .from('material_textures')
        .select('*')
        .eq('material_id', materialId);

      if (supabaseError) throw supabaseError;

      if (data) {
        const textureMap: Record<string, string> = {};
        data.forEach((tex) => {
          const {
            data: { publicUrl },
          } = supabase.storage
            .from('material-textures')
            .getPublicUrl(tex.storage_path);

          textureMap[tex.texture_type] = publicUrl;
        });
        setTextures(textureMap);
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [materialId]);

  useEffect(() => {
    fetchTextures();
  }, [fetchTextures]);

  const uploadTexture = useCallback(
    async (type: string, file: File) => {
      if (!materialId) return;
      setIsLoading(true);
      try {
        const fileExt = file.name.split('.').pop();
        const storagePath = `${materialId}/${type}_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('material-textures')
          .upload(storagePath, file);

        if (uploadError) throw uploadError;

        // Save to material_textures table
        const { error: dbError } = await supabase
          .from('material_textures')
          .upsert(
            {
              material_id: materialId,
              texture_type: type,
              storage_path: storagePath,
            },
            { onConflict: 'material_id,texture_type' }
          );

        if (dbError) throw dbError;

        await fetchTextures();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [materialId, fetchTextures]
  );

  return { textures, isLoading, error, uploadTexture };
}
