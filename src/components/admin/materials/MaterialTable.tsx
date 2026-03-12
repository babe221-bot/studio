'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { MaterialResponse } from '@/types/admin';

interface MaterialTableProps {
  materials: MaterialResponse[];
  onEdit: (material: MaterialResponse) => void;
  onDelete: (materialId: number) => void;
}

export const MaterialTable: React.FC<MaterialTableProps> = ({
  materials,
  onEdit,
  onDelete,
}) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Inventory</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {materials.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={5}
              className="text-center text-muted-foreground"
            >
              No materials found.
            </TableCell>
          </TableRow>
        ) : (
          materials.map((material) => (
            <TableRow key={material.id}>
              <TableCell className="font-medium">{material.id}</TableCell>
              <TableCell>{material.name}</TableCell>
              <TableCell>{material.inventory_count}</TableCell>
              <TableCell>
                <Badge variant={material.is_active ? 'success' : 'destructive'}>
                  {material.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(material)}
                  className="mr-1"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(material.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};
