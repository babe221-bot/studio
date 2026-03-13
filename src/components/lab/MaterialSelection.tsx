'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlusIcon } from 'lucide-react';
import type { Material, ModalType, EditableItem } from '@/types';
import { ActiveSelectionIndicator } from '../collaboration/ActiveSelectionIndicator';

interface MaterialSelectionProps {
  materials: Material[];
  selectedMaterialId: string;
  setSelectedMaterialId: (id: string) => void;
  handleOpenModal: (type: ModalType, item?: EditableItem) => void;
  handleFocus: (fieldName: string) => void;
  handleBlur: () => void;
}

export const MaterialSelection = React.memo<MaterialSelectionProps>(
  ({
    materials,
    selectedMaterialId,
    setSelectedMaterialId,
    handleOpenModal,
    handleFocus,
    handleBlur,
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>2. Odabir materijala</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleOpenModal('material')}
          aria-label="Dodaj novi materijal"
        >
          <PlusIcon className="h-4 w-4" aria-hidden="true" />
        </Button>
      </CardHeader>
      <CardContent>
        <ActiveSelectionIndicator fieldName="material">
          <div className="space-y-2">
            <Label htmlFor="material-select">Vrsta kamena</Label>
            <Select
              value={selectedMaterialId}
              onValueChange={setSelectedMaterialId}
            >
              <SelectTrigger
                id="material-select"
                onFocus={() => handleFocus('material')}
                onBlur={handleBlur}
              >
                <SelectValue placeholder="Odaberite materijal" />
              </SelectTrigger>
              <SelectContent>
                {materials.map((m) => (
                  <SelectItem key={m.id} value={m.id.toString()}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </ActiveSelectionIndicator>
      </CardContent>
    </Card>
  )
);

MaterialSelection.displayName = 'MaterialSelection';
