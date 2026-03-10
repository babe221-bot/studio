'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Check, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InviteCollaboratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  configId: string | null;
}

export const InviteCollaboratorModal: React.FC<
  InviteCollaboratorModalProps
> = ({ isOpen, onClose, configId }) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?configId=${configId}`
      : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: 'Link kopiran!',
        description: 'Link za saradnju je kopiran u međumemoriju.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: 'Greška',
        description: 'Neuspješno kopiranje linka.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Pozovi saradnika
          </DialogTitle>
          <DialogDescription>
            Podijelite ovaj link s drugima kako bi mogli sarađivati na ovoj
            konfiguraciji u stvarnom vremenu.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center space-x-2 py-4">
          <div className="grid flex-1 gap-2">
            <Label htmlFor="link" className="sr-only">
              Link
            </Label>
            <Input id="link" defaultValue={shareUrl} readOnly className="h-9" />
          </div>
          <Button type="submit" size="sm" className="px-3" onClick={handleCopy}>
            <span className="sr-only">Kopiraj</span>
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
        <DialogFooter className="sm:justify-start">
          <Button type="button" variant="secondary" onClick={onClose}>
            Zatvori
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
