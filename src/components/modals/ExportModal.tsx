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
import { ExportFormat } from '@/lib/export/exportService';
import { ExportOptions } from './ExportOptions';
import { FileDown } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (
    format: ExportFormat,
    filename: string,
    quality: 'draft' | 'standard' | 'high'
  ) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  onExport,
}) => {
  const [filename, setFilename] = useState('model');
  const [format, setFormat] = useState<ExportFormat>('stl');
  const [quality, setQuality] = useState<'draft' | 'standard' | 'high'>(
    'standard'
  );

  const handleExport = () => {
    onExport(format, `${filename}.${format}`, quality);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] lg:max-w-[900px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            Export Configuration
          </DialogTitle>
          <DialogDescription>
            Choose the export format and quality for your configuration file.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="filename">Filename</Label>
            <Input
              id="filename"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="Enter filename (e.g., my-model)"
            />
          </div>
          <ExportOptions
            format={format}
            setFormat={setFormat}
            quality={quality}
            setQuality={setQuality}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleExport}>Export</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
