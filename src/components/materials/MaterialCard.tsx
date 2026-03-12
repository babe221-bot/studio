import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Heart } from 'lucide-react';
import type { Material } from '@/types';
import { useMaterialFavorites } from '@/hooks/useMaterialFavorites';
import { cn } from '@/lib/utils';

interface MaterialCardProps {
  material: Material;
  onClick?: () => void;
  onApply?: () => void;
}

export function MaterialCard({
  material,
  onClick,
  onApply,
}: MaterialCardProps) {
  const { isFavorite, toggleFavorite } = useMaterialFavorites();

  return (
    <Card
      className="h-[200px] w-full cursor-pointer hover:shadow-md transition-shadow group"
      onClick={onClick}
    >
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">
          {material.display_name || material.name}
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(material.id);
          }}
        >
          <Heart
            className={cn(
              'h-4 w-4',
              isFavorite(material.id) && 'fill-red-500 text-red-500'
            )}
          />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <div className="aspect-w-16 aspect-h-9 relative">
          <img
            alt={material.display_name || material.name}
            src={material.texture || '/placeholder-material.jpg'}
            className="object-cover w-full h-full rounded"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onApply?.();
              }}
            >
              Apply
            </Button>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between px-3 pt-2">
        <span className="text-xs text-muted-foreground">
          {material.category_id
            ? material.category_id.replace('_', ' ').toUpperCase()
            : 'Natural Stone'}
        </span>
        <span className="text-xs font-semibold">€{material.cost_sqm}/m²</span>
      </CardFooter>
    </Card>
  );
}
