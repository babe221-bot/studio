import { supabase } from '@/lib/supabase';
import type { ProjectVersion, OrderItem } from '@/types';

export interface CreateVersionInput {
  name?: string;
  items: OrderItem[];
  notes?: string;
  is_public?: boolean;
}

/**
 * Version History Service - Manages project version snapshots
 */
export const versionHistoryService = {
  /**
   * Fetch all versions for the current user
   */
  async fetchAll(): Promise<ProjectVersion[]> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let query = supabase
      .from('project_versions')
      .select('*')
      .order('timestamp', { ascending: false });

    if (user) {
      query = query.eq('user_id', user.id);
    } else {
      // For non-authenticated users, get local versions
      return this.getLocalVersions();
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching versions:', error);
      throw error;
    }

    return (data || []).map(this.mapDbToVersion);
  },

  /**
   * Fetch a single version by ID
   */
  async fetchById(id: string): Promise<ProjectVersion | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let query = supabase.from('project_versions').select('*').eq('id', id);

    if (user) {
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Error fetching version:', error);
      throw error;
    }

    return this.mapDbToVersion(data);
  },

  /**
   * Create a new version snapshot
   */
  async create(input: CreateVersionInput): Promise<ProjectVersion> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const version = {
      name: input.name || `Verzija ${new Date().toLocaleString('hr-HR')}`,
      items: input.items,
      notes: input.notes || '',
      timestamp: Date.now(),
      user_id: user?.id || null,
      is_public: input.is_public || false,
    };

    if (!user) {
      // Store in localStorage for non-authenticated users
      const localVersions = this.getLocalVersions();
      const newVersion: ProjectVersion = {
        id: `local-${Date.now()}`,
        name: version.name,
        items: version.items,
        notes: version.notes,
        timestamp: version.timestamp,
        is_public: version.is_public,
      };
      localStorage.setItem(
        'project_versions',
        JSON.stringify([newVersion, ...localVersions])
      );
      return newVersion;
    }

    const { data, error } = await supabase
      .from('project_versions')
      .insert([
        {
          name: version.name,
          items: version.items,
          notes: version.notes,
          timestamp: version.timestamp,
          user_id: version.user_id,
          is_public: version.is_public,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating version:', error);
      throw error;
    }

    return this.mapDbToVersion(data);
  },

  /**
   * Update a version
   */
  async update(
    id: string,
    input: Partial<CreateVersionInput>
  ): Promise<ProjectVersion> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const updates: Record<string, unknown> = {};
    if (input.name) updates.name = input.name;
    if (input.notes !== undefined) updates.notes = input.notes;
    if (input.items) updates.items = input.items;
    if (input.is_public !== undefined) updates.is_public = input.is_public;

    if (!user) {
      const localVersions = this.getLocalVersions();
      const index = localVersions.findIndex((v) => v.id === id);
      if (index === -1) throw new Error('Version not found');

      localVersions[index] = { ...localVersions[index], ...updates };
      localStorage.setItem('project_versions', JSON.stringify(localVersions));
      return localVersions[index];
    }

    const { data, error } = await supabase
      .from('project_versions')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating version:', error);
      throw error;
    }

    return this.mapDbToVersion(data);
  },

  /**
   * Delete a version
   */
  async delete(id: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const localVersions = this.getLocalVersions();
      const filtered = localVersions.filter((v) => v.id !== id);
      localStorage.setItem('project_versions', JSON.stringify(filtered));
      return;
    }

    const { error } = await supabase
      .from('project_versions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting version:', error);
      throw error;
    }
  },

  /**
   * Get versions from localStorage
   */
  getLocalVersions(): ProjectVersion[] {
    try {
      const stored = localStorage.getItem('project_versions');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  /**
   * Map database row to ProjectVersion
   */
  mapDbToVersion(row: Record<string, unknown>): ProjectVersion {
    return {
      id: row.id as string,
      name: row.name as string,
      items: row.items as OrderItem[],
      notes: row.notes as string | undefined,
      timestamp: row.timestamp as number,
      share_token: row.share_token as string | undefined,
      is_public: row.is_public as boolean | undefined,
    };
  },

  /**
   * Generate share token for a version
   */
  async generateShareToken(id: string): Promise<string> {
    const token = `${id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const { error } = await supabase
      .from('project_versions')
      .update({ share_token: token })
      .eq('id', id);

    if (error) {
      console.error('Error generating share token:', error);
      throw error;
    }

    return token;
  },

  /**
   * Get version by share token
   */
  async getByShareToken(token: string): Promise<ProjectVersion | null> {
    const { data, error } = await supabase
      .from('project_versions')
      .select('*')
      .eq('share_token', token)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Error fetching version by token:', error);
      throw error;
    }

    return this.mapDbToVersion(data);
  },
};
