"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string | null;
}

const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({ isOpen, onClose, pdfUrl }) => {
  if (!isOpen || !pdfUrl) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `radni_nalog_${Date.now()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Pregled PDF naloga</DialogTitle>
        </DialogHeader>
        <div className="flex-grow my-4">
          <iframe src={pdfUrl} title="PDF Preview" className="w-full h-full border-0" />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">Zatvori</Button>
          </DialogClose>
          <Button type="button" onClick={handleDownload}>
            Preuzmi PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PdfPreviewModal;
