"use client";

import { useCallback } from 'react';
import { useLocalStorage } from './use-local-storage';
import { ProjectVersion, ProjectTemplate, OrderItem } from '@/types';

export function useProjectHistory() {
    const [versions, setVersions] = useLocalStorage<ProjectVersion[]>('studio-project-versions', []);
    const [templates, setTemplates] = useLocalStorage<ProjectTemplate[]>('studio-project-templates', []);

    const generateId = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    };

    const saveVersion = useCallback((name: string, items: OrderItem[], notes?: string) => {
        const newVersion: ProjectVersion = {
            id: generateId(),
            name,
            timestamp: Date.now(),
            items: JSON.parse(JSON.stringify(items)), // Deep clone to avoid mutations
            notes,
        };
        setVersions(prev => [newVersion, ...prev]);
        return newVersion;
    }, [setVersions]);

    const saveTemplate = useCallback((name: string, items: OrderItem[], description?: string) => {
        const newTemplate: ProjectTemplate = {
            id: generateId(),
            name,
            items: JSON.parse(JSON.stringify(items)),
            description,
            createdAt: Date.now(),
        };
        setTemplates(prev => [newTemplate, ...prev]);
        return newTemplate;
    }, [setTemplates]);

    const deleteVersion = useCallback((id: string) => {
        setVersions(prev => prev.filter(v => v.id !== id));
    }, [setVersions]);

    const deleteTemplate = useCallback((id: string) => {
        setTemplates(prev => prev.filter(t => t.id !== id));
    }, [setTemplates]);

    return {
        versions,
        templates,
        saveVersion,
        saveTemplate,
        deleteVersion,
        deleteTemplate,
    };
}
