'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MaterialTable } from '@/components/admin/materials/MaterialTable';
import { MaterialDialog } from '@/components/admin/materials/MaterialDialog';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { MaterialResponse } from '@/types/admin';

export default function AdminMaterialsPage() {
  const [materials, setMaterials] = useState<MaterialResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] =
    useState<MaterialResponse | null>(null);

  const fetchMaterials = async () => {
    setIsLoading(true);
    setError(null);
    const PYTHON_API_URL =
      process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000';
    try {
      const response = await fetch(`${PYTHON_API_URL}/api/admin/materials`);
      if (response.ok) {
        setMaterials(await response.json());
      } else {
        console.error('Failed to fetch materials', await response.text());
        setError('Failed to load materials.');
      }
    } catch (err) {
      console.error('Error fetching materials:', err);
      setError('An unexpected error occurred while fetching materials.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const handleEditMaterial = (material: MaterialResponse) => {
    setEditingMaterial(material);
    setIsDialogOpen(true);
  };

  const handleDeleteMaterial = async (materialId: number) => {
    if (!confirm('Are you sure you want to deactivate this material?')) return;
    const PYTHON_API_URL =
      process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000';
    try {
      const response = await fetch(
        `${PYTHON_API_URL}/api/admin/materials/${materialId}`,
        {
          method: 'DELETE',
        }
      );
      if (response.ok) {
        fetchMaterials();
      } else {
        console.error('Failed to deactivate material', await response.text());
        setError('Failed to deactivate material.');
      }
    } catch (err) {
      console.error('Error deactivating material:', err);
      setError('An unexpected error occurred.');
    }
  };

  const handleSaveMaterial = async (
    materialId: number,
    data: { name?: string; inventory_count?: number; is_active?: boolean }
  ) => {
    const PYTHON_API_URL =
      process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000';
    try {
      const response = await fetch(
        `${PYTHON_API_URL}/api/admin/materials/${materialId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );
      if (response.ok) {
        fetchMaterials();
      } else {
        console.error('Failed to save material', await response.text());
        setError('Failed to save material.');
      }
    } catch (err) {
      console.error('Error saving material:', err);
      setError('An unexpected error occurred.');
    }
    setIsDialogOpen(false);
  };

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">
          Material Management
        </h2>
        <Button
          onClick={() => {
            setEditingMaterial(null);
            setIsDialogOpen(true);
          }}
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Add Material
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Materials</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading materials...</p>
          ) : error ? (
            <p className="text-destructive">Error: {error}</p>
          ) : (
            <MaterialTable
              materials={materials}
              onEdit={handleEditMaterial}
              onDelete={handleDeleteMaterial}
            />
          )}
        </CardContent>
      </Card>

      <MaterialDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSaveMaterial}
        material={editingMaterial}
      />
    </div>
  );
}
