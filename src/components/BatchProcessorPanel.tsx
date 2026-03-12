'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Calculator,
  Download,
  Copy,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  batchProcessor,
  type BatchConfig,
  type BatchItem,
} from '@/lib/batch/BatchProcessor';
import type { Material, SurfaceFinish, EdgeProfile } from '@/types';

interface BatchProcessorPanelProps {
  material: Material | null;
  finish: SurfaceFinish | null;
  profile: EdgeProfile | null;
  processedEdges: {
    front: boolean;
    back: boolean;
    left: boolean;
    right: boolean;
  };
  onApplyBatch: (items: BatchItem[]) => void;
}

export function BatchProcessorPanel({
  material,
  finish,
  profile,
  processedEdges,
  onApplyBatch,
}: BatchProcessorPanelProps) {
  const { toast } = useToast();

  // Form state for adding new dimensions
  const [newLength, setNewLength] = useState('200');
  const [newWidth, setNewWidth] = useState('100');
  const [newHeight, setNewHeight] = useState('3');
  const [newQuantity, setNewQuantity] = useState('1');

  // Batch configuration
  const [batchConfig, setBatchConfig] = useState<BatchConfig>(() =>
    batchProcessor.createBatch(material, finish, profile, processedEdges)
  );

  // Update batch config when props change
  React.useEffect(() => {
    setBatchConfig((prev) => ({
      ...prev,
      material: material || null,
      finish: finish || null,
      profile: profile || null,
      processedEdges,
    }));
  }, [material, finish, profile, processedEdges]);

  // Calculate pricing
  const pricing = useMemo(() => {
    return batchProcessor.calculatePricing(batchConfig);
  }, [batchConfig]);

  // Validate batch
  const validation = useMemo(() => {
    return batchProcessor.validateBatch(batchConfig);
  }, [batchConfig]);

  const handleAddItem = () => {
    const length = parseFloat(newLength);
    const width = parseFloat(newWidth);
    const height = parseFloat(newHeight);
    const quantity = parseInt(newQuantity) || 1;

    if (isNaN(length) || isNaN(width) || isNaN(height) || isNaN(quantity)) {
      toast({
        title: 'Greška',
        description: 'Unesite ispravne brojčane vrijednosti.',
        variant: 'destructive',
      });
      return;
    }

    const updated = batchProcessor.addItems(batchConfig, [
      {
        length,
        width,
        height,
        quantity,
      },
    ]);

    setBatchConfig(updated);

    // Reset form
    setNewLength('200');
    setNewWidth('100');
    setNewHeight('3');
    setNewQuantity('1');
  };

  const handleRemoveItem = (itemId: string) => {
    const updated = batchProcessor.removeItem(batchConfig, itemId);
    setBatchConfig(updated);
  };

  const handleApplyBatch = () => {
    if (!validation.valid) {
      toast({
        title: 'Neuspješno',
        description: 'Ispravite greške prije primjene.',
        variant: 'destructive',
      });
      return;
    }

    onApplyBatch(batchConfig.items);
    toast({
      title: 'Grupna obrada primijenjena',
      description: `Dodano ${batchConfig.items.length} stavki.`,
    });
  };

  const handleExportSummary = () => {
    const summary = batchProcessor.generateSummary(batchConfig);
    navigator.clipboard.writeText(summary);
    toast({
      title: 'Kopirano',
      description: 'Sažetak je kopiran u međuspremnik.',
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Calculator className="w-4 h-4" />
          Grupna obrada
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add New Dimensions */}
        <div className="space-y-3">
          <Label className="text-xs font-medium">Dodaj dimenzije</Label>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <Input
                type="number"
                placeholder="D"
                value={newLength}
                onChange={(e) => setNewLength(e.target.value)}
                className="h-8"
              />
              <span className="text-[10px] text-muted-foreground">
                Dužina (cm)
              </span>
            </div>
            <div>
              <Input
                type="number"
                placeholder="Š"
                value={newWidth}
                onChange={(e) => setNewWidth(e.target.value)}
                className="h-8"
              />
              <span className="text-[10px] text-muted-foreground">
                Širina (cm)
              </span>
            </div>
            <div>
              <Input
                type="number"
                placeholder="V"
                value={newHeight}
                onChange={(e) => setNewHeight(e.target.value)}
                className="h-8"
              />
              <span className="text-[10px] text-muted-foreground">
                Visina (cm)
              </span>
            </div>
            <div>
              <Input
                type="number"
                placeholder="K"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                className="h-8"
              />
              <span className="text-[10px] text-muted-foreground">
                Količina
              </span>
            </div>
          </div>
          <Button onClick={handleAddItem} size="sm" className="w-full">
            <Plus className="w-3 h-3 mr-1" />
            Dodaj
          </Button>
        </div>

        <Separator />

        {/* Batch Items List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">
              Stavke ({batchConfig.items.length})
            </Label>
            {validation.valid ? (
              <Badge
                variant="outline"
                className="text-green-500 bg-green-500/10"
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Valjano
              </Badge>
            ) : (
              <Badge variant="outline" className="text-red-500 bg-red-500/10">
                <AlertCircle className="w-3 h-3 mr-1" />
                Greške
              </Badge>
            )}
          </div>

          <ScrollArea className="h-[150px]">
            {batchConfig.items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Dodajte dimenzije za grupnu obradu
              </div>
            ) : (
              <div className="space-y-2">
                {batchConfig.items.map((item) => (
                  <div
                    key={item.id}
                    className={`p-2 rounded border text-sm ${
                      item.validated
                        ? 'bg-background border-input'
                        : 'bg-red-500/10 border-red-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">
                          {item.dims.length} × {item.dims.width} ×{' '}
                          {item.dims.height} cm
                        </span>
                        <span className="text-muted-foreground ml-2">
                          × {item.quantity}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    {item.errors.length > 0 && (
                      <div className="mt-1 text-xs text-red-500">
                        {item.errors[0]}
                      </div>
                    )}
                    {item.warnings.length > 0 && item.errors.length === 0 && (
                      <div className="mt-1 text-xs text-yellow-500">
                        {item.warnings[0]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Summary */}
        {batchConfig.items.length > 0 && (
          <>
            <Separator />
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ukupno komada:</span>
                <span>{pricing.totalPieces}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ukupna površina:</span>
                <span>{pricing.totalArea.toFixed(2)} m²</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Ukupna cijena:</span>
                <span>{pricing.subtotal.toFixed(2)} €</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleApplyBatch}
                size="sm"
                className="flex-1"
                disabled={!validation.valid}
              >
                Primijeni
              </Button>
              <Button onClick={handleExportSummary} variant="outline" size="sm">
                <Download className="w-3 h-3" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
