"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
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

  useEffect(() => {
    if (item) {
      setName(item.name);
      setCostM(item.cost_m);
    } else {
      setName('');
      setCostM(0);
    }
  }, [item, isOpen]);

  const handleSave = () => {
    if (!name || costM === null) {
      alert('Molimo popunite sva polja.');
      return;
    }
    onSave({
      id: item?.id || Date.now(),
      name,
      cost_m: parseFloat(costM.toString()),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? 'Uredi profil' : 'Novi profil ivice'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="profile-name" className="text-right">Naziv</Label>
            <Input id="profile-name" value={name} onChange={e => setName(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="profile-cost" className="text-right">Trošak (€/m)</Label>
            <Input id="profile-cost" type="number" value={costM} onChange={e => setCostM(parseFloat(e.target.value))} className="col-span-3" />
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

export default ProfileModal;
