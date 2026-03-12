import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/hooks/useUser';

export function useMaterialFavorites() {
  const { user } = useUser();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load favorites on mount
  useEffect(() => {
    if (!user) return;

    const loadFavorites = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: supabaseError } = await supabase
          .from('user_material_favorites')
          .select('material_id')
          .eq('user_id', user.id);

        if (supabaseError) throw supabaseError;

        if (data) {
          setFavoriteIds(new Set(data.map((f) => f.material_id.toString())));
        }
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFavorites();
  }, [user]);

  const toggleFavorite = useCallback(
    async (materialId: string | number) => {
      if (!user) return;

      const materialIdStr = materialId.toString();
      const isFavorite = favoriteIds.has(materialIdStr);

      try {
        if (isFavorite) {
          // Remove from favorites
          const { error: supabaseError } = await supabase
            .from('user_material_favorites')
            .delete()
            .match({ user_id: user.id, material_id: materialId });

          if (supabaseError) throw supabaseError;

          setFavoriteIds((prev) => {
            const next = new Set(prev);
            next.delete(materialIdStr);
            return next;
          });
        } else {
          // Add to favorites
          const { error: supabaseError } = await supabase
            .from('user_material_favorites')
            .insert({ user_id: user.id, material_id: materialId });

          if (supabaseError) throw supabaseError;

          setFavoriteIds((prev) => new Set(prev).add(materialIdStr));
        }
      } catch (err) {
        setError(err as Error);
        // Revert optimistically? In a real app we might want to handle this better
        throw err;
      }
    },
    [user, favoriteIds]
  );

  return {
    favoriteIds,
    toggleFavorite,
    isFavorite: (id: string | number) => favoriteIds.has(id.toString()),
    isLoading,
    error,
  };
}
