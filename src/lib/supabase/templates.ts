import { supabase } from '@/lib/supabase';
import type { ProjectTemplate, OrderItem } from '@/types';

export interface CreateTemplateInput {
  name: string;
  items: OrderItem[];
  description?: string;
}

export interface TemplateFilters {
  search?: string;
  category?: string;
  favoritesOnly?: boolean;
}

/**
 * Template Service - CRUD operations for project templates
 */
export const templateService = {
  /**
   * Fetch all templates for the current user
   */
  async fetchAll(): Promise<ProjectTemplate[]> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // Return localStorage templates for non-authenticated users
      return this.getLocalTemplates();
    }

    const { data, error } = await supabase
      .from('project_templates')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching templates:', error);
      throw error;
    }

    return (data || []).map(this.mapDbToTemplate);
  },

  /**
   * Fetch a single template by ID
   */
  async fetchById(id: string): Promise<ProjectTemplate | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const local = this.getLocalTemplates();
      return local.find((t) => t.id === id) || null;
    }

    const { data, error } = await supabase
      .from('project_templates')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      console.error('Error fetching template:', error);
      throw error;
    }

    return this.mapDbToTemplate(data);
  },

  /**
   * Create a new template
   */
  async create(input: CreateTemplateInput): Promise<ProjectTemplate> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const template = {
      name: input.name,
      description: input.description || '',
      items: input.items,
      user_id: user?.id || null,
      created_at: new Date().toISOString(),
    };

    if (!user) {
      // Store in localStorage for non-authenticated users
      const localTemplates = this.getLocalTemplates();
      const newTemplate: ProjectTemplate = {
        id: `local-${Date.now()}`,
        name: template.name,
        items: template.items,
        description: template.description,
        createdAt: Date.now(),
      };
      localStorage.setItem(
        'project_templates',
        JSON.stringify([...localTemplates, newTemplate])
      );
      return newTemplate;
    }

    const { data, error } = await supabase
      .from('project_templates')
      .insert([template])
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      throw error;
    }

    return this.mapDbToTemplate(data);
  },

  /**
   * Update an existing template
   */
  async update(
    id: string,
    input: Partial<CreateTemplateInput>
  ): Promise<ProjectTemplate> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const updates: Record<string, unknown> = {};
    if (input.name) updates.name = input.name;
    if (input.description !== undefined)
      updates.description = input.description;
    if (input.items) updates.items = input.items;
    updates.updated_at = new Date().toISOString();

    if (!user) {
      // Update localStorage
      const localTemplates = this.getLocalTemplates();
      const index = localTemplates.findIndex((t) => t.id === id);
      if (index === -1) throw new Error('Template not found');

      localTemplates[index] = { ...localTemplates[index], ...updates };
      localStorage.setItem('project_templates', JSON.stringify(localTemplates));
      return localTemplates[index];
    }

    const { data, error } = await supabase
      .from('project_templates')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating template:', error);
      throw error;
    }

    return this.mapDbToTemplate(data);
  },

  /**
   * Delete a template
   */
  async delete(id: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // Delete from localStorage
      const localTemplates = this.getLocalTemplates();
      const filtered = localTemplates.filter((t) => t.id !== id);
      localStorage.setItem('project_templates', JSON.stringify(filtered));
      return;
    }

    const { error } = await supabase
      .from('project_templates')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  },

  /**
   * Get templates from localStorage
   */
  getLocalTemplates(): ProjectTemplate[] {
    try {
      const stored = localStorage.getItem('project_templates');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  /**
   * Map database row to ProjectTemplate
   */
  mapDbToTemplate(row: Record<string, unknown>): ProjectTemplate {
    return {
      id: row.id as string,
      name: row.name as string,
      items: row.items as OrderItem[],
      description: row.description as string | undefined,
      createdAt: new Date(row.created_at as string).getTime(),
    };
  },
};
