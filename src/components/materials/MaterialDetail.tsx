'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import type { Material } from '@/types';

interface MaterialDetailProps {
  material: Material;
  onClose: () => void;
}

export function MaterialDetail({ material, onClose }: MaterialDetailProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative bg-background w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-opacity"
          aria-label="Close"
        >
          <span className="sr-only">Close</span>
          <Button variant="ghost" size="icon">
            <span className="sr-only">Close</span>
          </Button>
        </button>

        <Card className="space-y-6">
          <CardHeader>
            <CardTitle className="text-xl font-bold">
              {material.display_name || material.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-4">
                <div className="aspect-w-16 aspect-h-9">
                  <img
                    alt={`${material.display_name || material.name} texture`}
                    src={material.texture || '/placeholder-material-detail.jpg'}
                    className="object-cover w-full h-full rounded"
                  />
                </div>

                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full">
                    Apply Material
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full mt-2">
                    Add to Favorites
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Properties</h3>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm font-medium">Density</dt>
                    <dd className="text-sm">
                      {material.density?.toFixed(2)} g/cm³
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium">Price</dt>
                    <dd className="text-sm">
                      €{material.cost_sqm?.toFixed(2)} / m²
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium">Category</dt>
                    <dd className="text-sm">
                      {material.category_id || 'Natural Stone'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium">Availability</dt>
                    <dd className="text-sm">
                      {material.availability || 'In Stock'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-3">Description</h3>
              <p className="text-sm text-muted-foreground">
                Premium natural stone material suitable for various applications
                including countertops, flooring, and wall clipping. Each slab
                features unique veining and color variations that make every
                installation one-of-a-kind.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
