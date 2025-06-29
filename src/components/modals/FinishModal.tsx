"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
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

  useEffect(() => {
    if (item) {
      setName(item.name);
      setCostSqm(item.cost_sqm);
    } else {
      setName('');
      setCostSqm(0);
    }
  }, [item, isOpen]);

  const handleSave = () => {
    if (!name || costSqm === null) {
      alert('Molimo popunite sva polja.');
      return;
    }
    onSave({
      id: item?.id || Date.now(),
      name,
      cost_sqm: parseFloat(costSqm.toString()),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? 'Uredi obradu' : 'Nova obrada lica'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="finish-name" className="text-right">Naziv</Label>
            <Input id="finish-name" value={name} onChange={e => setName(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="finish-cost" className="text-right">Trošak (€/m²)</Label>
            <Input id="finish-cost" type="number" value={costSqm} onChange={e => setCostSqm(parseFloat(e.target.value))} className="col-span-3" />
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

export default FinishModal;
