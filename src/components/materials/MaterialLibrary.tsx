'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { MaterialCard } from './MaterialCard';
import { MaterialSearch } from './MaterialSearch';
import { MaterialFilters } from './MaterialFilters';
import { MaterialDetail } from './MaterialDetail';
import { useMaterials } from '@/hooks/useMaterials';
import { useMaterialFilters } from '@/hooks/useMaterialFilters';
import { Loader2, X } from 'lucide-react';
import type { Material } from '@/types';

export function MaterialLibrary({
  onSelect,
  onClose,
}: {
  onSelect?: (material: Material) => void;
  onClose?: () => void;
}) {
  const { materials, isLoading, error } = useMaterials();
  const { filters, setFilter, clearFilters } = useMaterialFilters();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(
    null
  );

  // Filter materials client-side for instant feedback
  const filteredMaterials = materials.filter((material) => {
    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !material.name.toLowerCase().includes(query) &&
        !material.display_name?.toLowerCase().includes(query) &&
        !material.tags?.some((tag) => tag.toLowerCase().includes(query))
      ) {
        return false;
      }
    }

    // Apply category filter (if we had category_id, but we'll adjust based on actual data)
    // For now, we'll skip category filter until we have the data structure

    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-center">Loading materials...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4">
        <p className="text-red-700">Failed to load materials.</p>
      </div>
    );
  }

  return (
    <Card className="space-y-4 relative">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Material Library</CardTitle>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <MaterialSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search materials..."
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => clearFilters()}>
              Reset Filters
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMaterials.map((material) => (
            <MaterialCard
              key={material.id}
              material={material}
              onClick={() => setSelectedMaterial(material)}
              onApply={() => onSelect?.(material)}
            />
          ))}
        </div>

        {filteredMaterials.length === 0 && (
          <p className="text-center text-muted-foreground">
            No materials found matching your criteria.
          </p>
        )}
      </CardContent>

      {selectedMaterial && (
        <MaterialDetail
          material={selectedMaterial}
          onClose={() => setSelectedMaterial(null)}
          onApply={(m) => {
            onSelect?.(m);
            setSelectedMaterial(null);
          }}
        />
      )}
    </Card>
  );
}
