'use client';

import React, { useState, useMemo } from 'react';
import { ProjectVersion, OrderItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeftRight,
  Copy,
  Plus,
  Minus,
  RotateCcw,
  ChevronRight,
  Check,
  X,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DesignComparisonProps {
  versions: ProjectVersion[];
  currentItems: OrderItem[];
  onRestore: (items: OrderItem[]) => void;
}

interface VersionDiff {
  field: string;
  left: string | number;
  right: string | number;
  changed: boolean;
}

export function DesignComparison({
  versions,
  currentItems,
  onRestore,
}: DesignComparisonProps) {
  const [leftVersionId, setLeftVersionId] = useState<string>('current');
  const [rightVersionId, setRightVersionId] = useState<string>('');
  const [syncViews, setSyncViews] = useState(true);
  const [activeTab, setActiveTab] = useState('visual');

  // Get version objects
  const leftVersion = useMemo(() => {
    if (leftVersionId === 'current') return null;
    return versions.find((v) => v.id === leftVersionId) || null;
  }, [leftVersionId, versions]);

  const rightVersion = useMemo(() => {
    if (rightVersionId === 'current') return null;
    return versions.find((v) => v.id === rightVersionId) || null;
  }, [rightVersionId, versions]);

  // Compute differences
  const differences = useMemo((): VersionDiff[] => {
    const left = leftVersion?.items || currentItems;
    const right = rightVersion?.items || currentItems;

    if (!rightVersion && leftVersionId === 'current') return [];
    if (!leftVersion && rightVersionId === 'current') return [];

    const diffs: VersionDiff[] = [];

    // Compare item counts
    if (left.length !== right.length) {
      diffs.push({
        field: 'Broj stavki',
        left: left.length,
        right: right.length,
        changed: true,
      });
    }

    // Compare each item
    const maxItems = Math.max(left.length, right.length);
    for (let i = 0; i < maxItems; i++) {
      const leftItem = left[i];
      const rightItem = right[i];

      if (!leftItem || !rightItem) {
        diffs.push({
          field: `Stavka ${i + 1}`,
          left: leftItem ? 'Postoji' : 'Nema',
          right: rightItem ? 'Postoji' : 'Nema',
          changed: true,
        });
        continue;
      }

      // Dimensions
      if (leftItem.dims.length !== rightItem.dims.length) {
        diffs.push({
          field: `Stavka ${i + 1} - Dužina`,
          left: `${leftItem.dims.length} cm`,
          right: `${rightItem.dims.length} cm`,
          changed: true,
        });
      }
      if (leftItem.dims.width !== rightItem.dims.width) {
        diffs.push({
          field: `Stavka ${i + 1} - Širina`,
          left: `${leftItem.dims.width} cm`,
          right: `${rightItem.dims.width} cm`,
          changed: true,
        });
      }
      if (leftItem.dims.height !== rightItem.dims.height) {
        diffs.push({
          field: `Stavka ${i + 1} - Visina`,
          left: `${leftItem.dims.height} cm`,
          right: `${rightItem.dims.height} cm`,
          changed: true,
        });
      }

      // Material
      if (leftItem.material.name !== rightItem.material.name) {
        diffs.push({
          field: `Stavka ${i + 1} - Materijal`,
          left: leftItem.material.name,
          right: rightItem.material.name,
          changed: true,
        });
      }

      // Finish
      if (leftItem.finish.name !== rightItem.finish.name) {
        diffs.push({
          field: `Stavka ${i + 1} - Obrada`,
          left: leftItem.finish.name,
          right: rightItem.finish.name,
          changed: true,
        });
      }

      // Profile
      if (leftItem.profile.name !== rightItem.profile.name) {
        diffs.push({
          field: `Stavka ${i + 1} - Profil`,
          left: leftItem.profile.name,
          right: rightItem.profile.name,
          changed: true,
        });
      }

      // Quantity
      if (leftItem.quantity !== rightItem.quantity) {
        diffs.push({
          field: `Stavka ${i + 1} - Količina`,
          left: leftItem.quantity,
          right: rightItem.quantity,
          changed: true,
        });
      }

      // Total cost
      if (leftItem.totalCost !== rightItem.totalCost) {
        diffs.push({
          field: `Stavka ${i + 1} - Cijena`,
          left: `${leftItem.totalCost.toFixed(2)} €`,
          right: `${rightItem.totalCost.toFixed(2)} €`,
          changed: true,
        });
      }
    }

    return diffs;
  }, [leftVersion, rightVersion, currentItems, leftVersionId, rightVersionId]);

  // Calculate totals comparison
  const totals = useMemo(() => {
    const left = leftVersion?.items || currentItems;
    const right = rightVersion?.items || currentItems;

    const leftTotal = left.reduce((sum, item) => sum + item.totalCost, 0);
    const rightTotal = right.reduce((sum, item) => sum + item.totalCost, 0);

    return {
      leftItems: left.length,
      rightItems: right.length,
      leftTotal,
      rightTotal,
      difference: rightTotal - leftTotal,
    };
  }, [leftVersion, rightVersion, currentItems]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('hr-HR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleRestoreLeft = () => {
    if (leftVersion) {
      onRestore(leftVersion.items);
    }
  };

  const handleRestoreRight = () => {
    if (rightVersion) {
      onRestore(rightVersion.items);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowLeftRight className="h-5 w-5" />
          Usporedba dizajna
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Version Selectors */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Lijeva verzija</label>
              <Select value={leftVersionId} onValueChange={setLeftVersionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Odaberi verziju" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Trenutno stanje</SelectItem>
                  {versions.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name} - {formatDate(v.timestamp)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {leftVersion && (
                <Button variant="outline" size="sm" onClick={handleRestoreLeft}>
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Vrati
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Desna verzija</label>
              <Select value={rightVersionId} onValueChange={setRightVersionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Odaberi verziju" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Trenutno stanje</SelectItem>
                  {versions.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name} - {formatDate(v.timestamp)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {rightVersion && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRestoreRight}
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Vrati
                </Button>
              )}
            </div>
          </div>

          {/* View Options */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={syncViews}
                onChange={(e) => setSyncViews(e.target.checked)}
                className="rounded"
              />
              Sinkroniziraj prikaz
            </label>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="visual">Vizualno</TabsTrigger>
              <TabsTrigger value="numerical">Brojčano</TabsTrigger>
            </TabsList>

            <TabsContent value="visual" className="space-y-4">
              <div className="grid grid-cols-2 gap-4 min-h-[300px]">
                {/* Left Panel */}
                <div className="border rounded-lg p-4 bg-muted/30">
                  <h4 className="font-medium mb-2">
                    {leftVersionId === 'current'
                      ? 'Trenutno stanje'
                      : leftVersion?.name || 'Odaberite verziju'}
                  </h4>
                  <ScrollArea className="h-[250px]">
                    <div className="space-y-2">
                      {(leftVersion?.items || currentItems).map((item, i) => (
                        <div
                          key={i}
                          className="p-2 bg-background rounded text-sm"
                        >
                          <div className="font-medium">
                            {item.dims.length} × {item.dims.width} ×{' '}
                            {item.dims.height} cm
                          </div>
                          <div className="text-muted-foreground">
                            {item.material.name} • {item.finish.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {item.totalCost.toFixed(2)} €
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Right Panel */}
                <div className="border rounded-lg p-4 bg-muted/30">
                  <h4 className="font-medium mb-2">
                    {rightVersionId === 'current'
                      ? 'Trenutno stanje'
                      : rightVersion?.name || 'Odaberite verziju'}
                  </h4>
                  <ScrollArea className="h-[250px]">
                    <div className="space-y-2">
                      {(rightVersion?.items || currentItems).map((item, i) => (
                        <div
                          key={i}
                          className="p-2 bg-background rounded text-sm"
                        >
                          <div className="font-medium">
                            {item.dims.length} × {item.dims.width} ×{' '}
                            {item.dims.height} cm
                          </div>
                          <div className="text-muted-foreground">
                            {item.material.name} • {item.finish.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {item.totalCost.toFixed(2)} €
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="numerical" className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Lijevo</div>
                  <div className="text-lg font-medium">
                    {totals.leftItems} stavki
                  </div>
                  <div className="text-sm">{totals.leftTotal.toFixed(2)} €</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Razlika</div>
                  <div
                    className={`text-lg font-medium ${totals.difference > 0 ? 'text-red-500' : totals.difference < 0 ? 'text-green-500' : ''}`}
                  >
                    {totals.difference > 0 ? '+' : ''}
                    {totals.difference.toFixed(2)} €
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Desno</div>
                  <div className="text-lg font-medium">
                    {totals.rightItems} stavki
                  </div>
                  <div className="text-sm">
                    {totals.rightTotal.toFixed(2)} €
                  </div>
                </div>
              </div>

              {/* Detailed Differences */}
              <ScrollArea className="h-[300px]">
                {differences.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nema razlika između odabranih verzija
                  </div>
                ) : (
                  <div className="space-y-2">
                    {differences.map((diff, i) => (
                      <div
                        key={i}
                        className={`flex items-center justify-between p-2 rounded ${
                          diff.changed ? 'bg-yellow-500/10' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {diff.changed ? (
                            <Minus className="w-4 h-4 text-yellow-500" />
                          ) : (
                            <Check className="w-4 h-4 text-green-500" />
                          )}
                          <span className="text-sm">{diff.field}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            {diff.left}
                          </span>
                          <ChevronRight className="w-4 h-4" />
                          <span className={diff.changed ? 'font-medium' : ''}>
                            {diff.right}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}
