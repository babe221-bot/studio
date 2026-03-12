import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useMaterialTextures(materialId: string | number) {
  const [textures, setTextures] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!materialId) return;

    const fetchTextures = async () => {
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
            // Get public URL for the storage path
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
    };

    fetchTextures();
  }, [materialId]);

  return { textures, isLoading, error };
}
