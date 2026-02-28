"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { FocusScope } from '@radix-ui/react-focus-scope';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Material } from '@/types';

interface MaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (material: Material) => void;
  item: Material | null;
}

const MaterialModal: React.FC<MaterialModalProps> = ({ isOpen, onClose, onSave, item }) => {
  const [name, setName] = useState('');
  const [density, setDensity] = useState(2.7);
  const [costSqm, setCostSqm] = useState(100);
  const [texture, setTexture] = useState('');
  const [color, setColor] = useState('#FFFFFF');

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (item) {
      setName(item.name);
      setDensity(item.density);
      setCostSqm(item.cost_sqm);
      setTexture(item.texture);
      setColor(item.color || '#FFFFFF');
    } else {
      setName('');
      setDensity(2.7);
      setCostSqm(100);
      setTexture('');
      setColor('#FFFFFF');
    }
    setErrors({});
  }, [item, isOpen]);

  const handleSave = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Naziv materijala je obavezan';
    }
    if (!density || density <= 0) {
      newErrors.density = 'Gustoća mora biti veća od 0';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Announce errors to screen readers
      const errorMessage = Object.values(newErrors).join('. ');
      document.getElementById('form-errors')?.setAttribute('aria-label', errorMessage);
      return;
    }

    setErrors({});
    onSave({
      id: item?.id || Date.now(),
      name,
      density: parseFloat(density.toString()),
      cost_sqm: parseFloat(costSqm.toString()),
      texture,
      color,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <FocusScope asChild loop trapped>
        <DialogContent
          aria-labelledby="material-modal-title"
          aria-describedby="material-modal-desc"
          onOpenAutoFocus={(e) => {
            // Prevent auto-focus on close button, focus first input instead
            e.preventDefault();
            document.getElementById('material-name')?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle id="material-modal-title">
              {item ? 'Uredi materijal' : 'Novi materijal'}
            </DialogTitle>
            <DialogDescription id="material-modal-desc" className="sr-only">
              Forma za {item ? 'uređivanje' : 'dodavanje'} materijala.
              Sva polja su obavezna.
            </DialogDescription>
          </DialogHeader>
          <div id="form-errors" className="sr-only" role="alert" />
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="material-name" className={errors.name ? 'text-destructive' : ''}>
                Naziv <span aria-label="obavezno">*</span>
              </Label>
              <Input
                id="material-name"
                value={name}
                onChange={e => {
                  setName(e.target.value);
                  if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                }}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'name-error' : undefined}
                required
              />
              {errors.name && (
                <p id="name-error" className="text-sm text-destructive" role="alert">
                  {errors.name}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="material-density" className={errors.density ? 'text-destructive' : ''}>
                Gustoća (g/cm³) <span aria-label="obavezno">*</span>
              </Label>
              <Input
                id="material-density"
                type="number"
                value={density}
                onChange={e => {
                  setDensity(parseFloat(e.target.value));
                  if (errors.density) setErrors(prev => ({ ...prev, density: '' }));
                }}
                aria-invalid={!!errors.density}
                aria-describedby={errors.density ? 'density-error' : undefined}
                required
              />
              {errors.density && (
                <p id="density-error" className="text-sm text-destructive" role="alert">
                  {errors.density}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="material-cost">
                Cijena (€/m²)
              </Label>
              <Input
                id="material-cost"
                type="number"
                value={costSqm}
                onChange={e => setCostSqm(parseFloat(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="material-texture">
                URL Teksture
              </Label>
              <Input
                id="material-texture"
                value={texture}
                onChange={e => setTexture(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="material-color">
                Boja (HEX)
              </Label>
              <Input
                id="material-color"
                value={color}
                onChange={e => setColor(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="secondary">Odustani</Button></DialogClose>
            <Button type="button" onClick={handleSave}>Spremi</Button>
          </DialogFooter>
        </DialogContent>
      </FocusScope>
    </Dialog>
  );
};

export default MaterialModal;
