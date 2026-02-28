"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { FocusScope } from '@radix-ui/react-focus-scope';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EdgeProfile } from '@/types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: EdgeProfile) => void;
  item: EdgeProfile | null;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, onSave, item }) => {
  const [name, setName] = useState('');
  const [costM, setCostM] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (item) {
      setName(item.name);
      setCostM(item.cost_m);
    } else {
      setName('');
      setCostM(0);
    }
    setErrors({});
  }, [item, isOpen]);

  const handleSave = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'Naziv profila je obavezan';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const errorMessage = Object.values(newErrors).join('. ');
      document.getElementById('profile-form-errors')?.setAttribute('aria-label', errorMessage);
      return;
    }

    setErrors({});
    onSave({
      id: item?.id || Date.now(),
      name,
      cost_m: parseFloat(costM.toString()),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <FocusScope asChild loop trapped>
        <DialogContent
          aria-labelledby="profile-modal-title"
          aria-describedby="profile-modal-desc"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            document.getElementById('profile-name')?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle id="profile-modal-title">{item ? 'Uredi profil' : 'Novi profil ivice'}</DialogTitle>
            <DialogDescription id="profile-modal-desc" className="sr-only">
              Forma za {item ? 'uređivanje' : 'dodavanje'} profila ivice. Naziv je obavezan.
            </DialogDescription>
          </DialogHeader>
          <div id="profile-form-errors" className="sr-only" role="alert" />
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name" className={errors.name ? 'text-destructive' : ''}>
                Naziv <span aria-label="obavezno" aria-hidden="false">*</span>
              </Label>
              <Input
                id="profile-name"
                value={name}
                onChange={e => {
                  setName(e.target.value);
                  if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                }}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'profile-name-error' : undefined}
                required
              />
              {errors.name && (
                <p id="profile-name-error" className="text-sm text-destructive" role="alert">
                  {errors.name}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-cost">Trošak (€/m)</Label>
              <Input
                id="profile-cost"
                type="number"
                value={costM}
                onChange={e => setCostM(parseFloat(e.target.value))}
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

export default ProfileModal;
