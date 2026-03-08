'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ProjectVersion, ProjectTemplate, OrderItem } from '@/types';

export function useSupabasePersistence() {
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setVersions([]);
        setTemplates([]);
        return;
      }

      const { data: versionsData, error: versionsError } = await supabase
        .from('project_versions')
        .select('*')
        .order('timestamp', { ascending: false });

      const { data: templatesData, error: templatesError } = await supabase
        .from('project_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (versionsError) throw versionsError;
      if (templatesError) throw templatesError;

      setVersions(versionsData || []);
      setTemplates(
        templatesData?.map((t) => ({
          ...t,
          createdAt: new Date(t.created_at).getTime(),
        })) || []
      );
    } catch (error) {
      console.error('Error fetching projects from Supabase:', error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const saveVersion = useCallback(
    async (name: string, items: OrderItem[], notes?: string) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('Korisnik nije prijavljen.');

        const newVersion = {
          name,
          items,
          notes,
          timestamp: Date.now(),
          user_id: user.id,
        };

        const { data, error } = await supabase
          .from('project_versions')
          .insert([newVersion])
          .select()
          .single();

        if (error) throw error;

        setVersions((prev) => [data, ...prev]);
        return data as ProjectVersion;
      } catch (error) {
        console.error('Error saving version to Supabase:', error);
        throw error;
      }
    },
    [supabase]
  );

  const saveTemplate = useCallback(
    async (name: string, items: OrderItem[], description?: string) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('Korisnik nije prijavljen.');

        const newTemplate = {
          name,
          items,
          description,
          user_id: user.id,
        };

        const { data, error } = await supabase
          .from('project_templates')
          .insert([newTemplate])
          .select()
          .single();

        if (error) throw error;

        const formattedTemplate: ProjectTemplate = {
          ...data,
          createdAt: new Date(data.created_at).getTime(),
        };

        setTemplates((prev) => [formattedTemplate, ...prev]);
        return formattedTemplate;
      } catch (error) {
        console.error('Error saving template to Supabase:', error);
        throw error;
      }
    },
    [supabase]
  );

  const deleteVersion = useCallback(
    async (id: string) => {
      try {
        const { error } = await supabase
          .from('project_versions')
          .delete()
          .eq('id', id);

        if (error) throw error;
        setVersions((prev) => prev.filter((v) => v.id !== id));
      } catch (error) {
        console.error('Error deleting version from Supabase:', error);
        throw error;
      }
    },
    [supabase]
  );

  const deleteTemplate = useCallback(
    async (id: string) => {
      try {
        const { error } = await supabase
          .from('project_templates')
          .delete()
          .eq('id', id);

        if (error) throw error;
        setTemplates((prev) => prev.filter((t) => t.id !== id));
      } catch (error) {
        console.error('Error deleting template from Supabase:', error);
        throw error;
      }
    },
    [supabase]
  );

  return {
    versions,
    templates,
    isLoading,
    saveVersion,
    saveTemplate,
    deleteVersion,
    deleteTemplate,
    refresh: fetchProjects,
  };
}
