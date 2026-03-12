'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Heart, X } from 'lucide-react';
import type { Material } from '@/types';
import { useMaterialFavorites } from '@/hooks/useMaterialFavorites';
import { cn } from '@/lib/utils';

interface MaterialDetailProps {
  material: Material;
  onClose: () => void;
  onApply?: (material: Material) => void;
}

export function MaterialDetail({
  material,
  onClose,
  onApply,
}: MaterialDetailProps) {
  const { isFavorite, toggleFavorite } = useMaterialFavorites();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="relative bg-background w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg shadow-xl">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-4 right-4 z-10"
        >
          <X className="h-4 w-4" />
        </Button>

        <Card className="border-0 shadow-none">
          <CardHeader>
            <CardTitle className="text-2xl font-bold pr-8">
              {material.display_name || material.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-4">
                <div className="aspect-square relative overflow-hidden rounded-lg border">
                  <img
                    alt={`${material.display_name || material.name} texture`}
                    src={material.texture || '/placeholder-material-detail.jpg'}
                    className="object-cover w-full h-full"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => onApply?.(material)}
                  >
                    Apply Material
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => toggleFavorite(material.id)}
                  >
                    <Heart
                      className={cn(
                        'h-4 w-4',
                        isFavorite(material.id) && 'fill-red-500 text-red-500'
                      )}
                    />
                  </Button>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Properties
                  </h3>
                  <dl className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <dt className="text-xs text-muted-foreground uppercase tracking-wider">
                        Density
                      </dt>
                      <dd className="text-sm font-medium text-foreground">
                        {material.density?.toFixed(2)} g/cm³
                      </dd>
                    </div>
                    <div className="space-y-1">
                      <dt className="text-xs text-muted-foreground uppercase tracking-wider">
                        Price
                      </dt>
                      <dd className="text-sm font-medium text-foreground">
                        €{material.cost_sqm?.toFixed(2)} / m²
                      </dd>
                    </div>
                    <div className="space-y-1">
                      <dt className="text-xs text-muted-foreground uppercase tracking-wider">
                        Category
                      </dt>
                      <dd className="text-sm font-medium text-foreground">
                        {material.category_id || 'Natural Stone'}
                      </dd>
                    </div>
                    <div className="space-y-1">
                      <dt className="text-xs text-muted-foreground uppercase tracking-wider">
                        Availability
                      </dt>
                      <dd className="text-sm font-medium text-foreground">
                        {material.availability || 'In Stock'}
                      </dd>
                    </div>
                  </dl>
                </div>

                {material.roughness !== undefined && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      PBR Attributes
                    </h3>
                    <dl className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <dt className="text-xs text-muted-foreground uppercase tracking-wider">
                          Roughness
                        </dt>
                        <dd className="text-sm font-medium text-foreground">
                          {material.roughness.toFixed(2)}
                        </dd>
                      </div>
                      <div className="space-y-1">
                        <dt className="text-xs text-muted-foreground uppercase tracking-wider">
                          Metallic
                        </dt>
                        <dd className="text-sm font-medium text-foreground">
                          {material.metallic?.toFixed(2) || '0.00'}
                        </dd>
                      </div>
                    </dl>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Description
                  </h3>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    Premium natural stone material suitable for various
                    applications including countertops, flooring, and wall
                    clipping. Each slab features unique veining and color
                    variations that make every installation one-of-a-kind.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
