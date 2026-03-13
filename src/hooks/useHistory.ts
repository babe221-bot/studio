'use client';

import { useSupabasePersistence } from './useSupabasePersistence';
import { useProjectHistory } from './useProjectHistory';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { OrderItem } from '@/types';

export function useHistory() {
  const [isAuth, setIsAuth] = useState(false);
  const supabasePersistence = useSupabasePersistence();
  const localPersistence = useProjectHistory();
  const { versions, templates } = localPersistence;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuth(!!session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuth(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Return Supabase persistence if authenticated, otherwise local
  return isAuth
    ? supabasePersistence
    : {
        versions,
        templates,
        isLoading: false,
        saveVersion: async (name: string, items: OrderItem[], notes?: string) =>
          localPersistence.saveVersion(name, items, notes),
        saveTemplate: async (
          name: string,
          items: OrderItem[],
          description?: string
        ) => localPersistence.saveTemplate(name, items, description),
        deleteVersion: async (id: string) => localPersistence.deleteVersion(id),
        deleteTemplate: async (id: string) =>
          localPersistence.deleteTemplate(id),
        shareProject: async () => {
          throw new Error('Moraš biti prijavljen za dijeljenje projekta.');
        },
        fetchSharedProject: async () => {
          throw new Error(
            'Moraš biti prijavljen za dohvaćanje dijeljenih projekata.'
          );
        },
        refresh: () => {},
      };
}
