import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import type { Material } from '@/types';

interface MaterialCardProps {
  material: Material;
}

export function MaterialCard({ material }: MaterialCardProps) {
  return (
    <Card className="h-[180px] w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          {material.display_name || material.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <div className="aspect-w-16 aspect-h-9">
          <img
            alt={material.display_name || material.name}
            src={material.texture || '/placeholder-material.jpg'}
            className="object-cover w-full h-full rounded"
          />
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between px-3 pt-2">
        <span className="text-xs text-muted-foreground">
          {material.category_id
            ? material.category_id.replace('_', ' ').toUpperCase()
            : 'Natural Stone'}
        </span>
        <Button variant="ghost" size="icon" aria-label="Select material">
          <Plus className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
