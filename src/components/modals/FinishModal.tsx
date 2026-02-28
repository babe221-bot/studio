"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { FocusScope } from '@radix-ui/react-focus-scope';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SurfaceFinish } from '@/types';

interface FinishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (finish: SurfaceFinish) => void;
  item: SurfaceFinish | null;
}

const FinishModal: React.FC<FinishModalProps> = ({ isOpen, onClose, onSave, item }) => {
  const [name, setName] = useState('');
  const [costSqm, setCostSqm] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (item) {
      setName(item.name);
      setCostSqm(item.cost_sqm);
    } else {
      setName('');
      setCostSqm(0);
    }
    setErrors({});
  }, [item, isOpen]);

  const handleSave = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'Naziv obrade je obavezan';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const errorMessage = Object.values(newErrors).join('. ');
      document.getElementById('finish-form-errors')?.setAttribute('aria-label', errorMessage);
      return;
    }

    setErrors({});
    onSave({
      id: item?.id || Date.now(),
      name,
      cost_sqm: parseFloat(costSqm.toString()),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <FocusScope asChild loop trapped>
        <DialogContent
          aria-labelledby="finish-modal-title"
          aria-describedby="finish-modal-desc"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            document.getElementById('finish-name')?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle id="finish-modal-title">{item ? 'Uredi obradu' : 'Nova obrada lica'}</DialogTitle>
            <DialogDescription id="finish-modal-desc" className="sr-only">
              Forma za {item ? 'uređivanje' : 'dodavanje'} obrade lica. Naziv je obavezan.
            </DialogDescription>
          </DialogHeader>
          <div id="finish-form-errors" className="sr-only" role="alert" />
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="finish-name" className={errors.name ? 'text-destructive' : ''}>
                Naziv <span aria-label="obavezno" aria-hidden="false">*</span>
              </Label>
              <Input
                id="finish-name"
                value={name}
                onChange={e => {
                  setName(e.target.value);
                  if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                }}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'finish-name-error' : undefined}
                required
              />
              {errors.name && (
                <p id="finish-name-error" className="text-sm text-destructive" role="alert">
                  {errors.name}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="finish-cost">Trošak (€/m²)</Label>
              <Input
                id="finish-cost"
                type="number"
                value={costSqm}
                onChange={e => setCostSqm(parseFloat(e.target.value))}
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

export default FinishModal;
