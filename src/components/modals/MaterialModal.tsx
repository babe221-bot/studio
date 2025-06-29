"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
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

  useEffect(() => {
    if (item) {
      setName(item.name);
      setDensity(item.density);
      setCostSqm(item.cost_sqm);
      setTexture(item.texture);
    } else {
      setName('');
      setDensity(2.7);
      setCostSqm(100);
      setTexture('');
    }
  }, [item, isOpen]);

  const handleSave = () => {
    if (!name || !density || !costSqm) {
      alert('Molimo popunite sva obavezna polja.');
      return;
    }
    onSave({
      id: item?.id || Date.now(),
      name,
      density: parseFloat(density.toString()),
      cost_sqm: parseFloat(costSqm.toString()),
      texture,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? 'Uredi materijal' : 'Novi materijal'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="material-name" className="text-right">Naziv</Label>
            <Input id="material-name" value={name} onChange={e => setName(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="material-density" className="text-right">Gustoća (g/cm³)</Label>
            <Input id="material-density" type="number" value={density} onChange={e => setDensity(parseFloat(e.target.value))} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="material-cost" className="text-right">Cijena (€/m²)</Label>
            <Input id="material-cost" type="number" value={costSqm} onChange={e => setCostSqm(parseFloat(e.target.value))} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="material-texture" className="text-right">URL Teksture</Label>
            <Input id="material-texture" value={texture} onChange={e => setTexture(e.target.value)} className="col-span-3" />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="secondary">Odustani</Button></DialogClose>
          <Button type="button" onClick={handleSave}>Spremi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MaterialModal;
