'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { MaterialResponse } from '@/backend/app/api/admin/materials';

interface MaterialDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    materialId: number,
    data: { name?: string; inventory_count?: number; is_active?: boolean }
  ) => void;
  material: MaterialResponse | null;
}

export const MaterialDialog: React.FC<MaterialDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  material,
}) => {
  const [name, setName] = useState(material?.name || '');
  const [inventoryCount, setInventoryCount] = useState(
    material?.inventory_count || 0
  );
  const [isActive, setIsActive] = useState(material?.is_active ?? true);

  useEffect(() => {
    if (material) {
      setName(material.name);
      setInventoryCount(material.inventory_count);
      setIsActive(material.is_active);
    } else {
      setName('');
      setInventoryCount(0);
      setIsActive(true);
    }
  }, [material]);

  const handleSave = () => {
    if (material) {
      onSave(material.id, {
        name,
        inventory_count: inventoryCount,
        is_active: isActive,
      });
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {material ? `Edit Material: ${material.name}` : 'New Material'}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inventoryCount">Inventory Count</Label>
            <Input
              id="inventoryCount"
              type="number"
              value={inventoryCount}
              onChange={(e) => setInventoryCount(parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="active-status"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="active-status">Active</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
