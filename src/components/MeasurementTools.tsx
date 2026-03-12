'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Ruler, Triangle, Square, Trash2 } from 'lucide-react';
import type { Measurement } from '@/lib/measurement/MeasurementTool';

export type MeasurementToolType = 'distance' | 'angle' | 'area' | null;

interface MeasurementToolsProps {
  activeTool: MeasurementToolType;
  onToolChange: (tool: MeasurementToolType) => void;
  measurements: Measurement[];
  onClearMeasurements: () => void;
  previewValue?: number;
}

export function MeasurementTools({
  activeTool,
  onToolChange,
  measurements,
  onClearMeasurements,
  previewValue,
}: MeasurementToolsProps) {
  const formatValue = (value: number, unit: string): string => {
    return `${value.toFixed(2)} ${unit}`;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Measurement Tools</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tool Selection */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant={activeTool === 'distance' ? 'default' : 'outline'}
            size="sm"
            className="flex flex-col h-auto py-2"
            onClick={() =>
              onToolChange(activeTool === 'distance' ? null : 'distance')
            }
          >
            <Ruler className="w-4 h-4 mb-1" />
            <span className="text-xs">Distance</span>
          </Button>

          <Button
            variant={activeTool === 'angle' ? 'default' : 'outline'}
            size="sm"
            className="flex flex-col h-auto py-2"
            onClick={() =>
              onToolChange(activeTool === 'angle' ? null : 'angle')
            }
          >
            <Triangle className="w-4 h-4 mb-1" />
            <span className="text-xs">Angle</span>
          </Button>

          <Button
            variant={activeTool === 'area' ? 'default' : 'outline'}
            size="sm"
            className="flex flex-col h-auto py-2"
            onClick={() => onToolChange(activeTool === 'area' ? null : 'area')}
          >
            <Square className="w-4 h-4 mb-1" />
            <span className="text-xs">Area</span>
          </Button>
        </div>

        {/* Preview Value */}
        {activeTool && previewValue !== undefined && (
          <div className="text-center py-2 bg-muted rounded-md">
            <span className="text-xs text-muted-foreground">Preview: </span>
            <span className="text-sm font-medium">
              {previewValue.toFixed(2)} {activeTool === 'area' ? 'cm²' : 'cm'}
            </span>
          </div>
        )}

        <Separator />

        {/* Measurements List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Measurements</span>
            {measurements.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearMeasurements}
                className="h-6 px-2 text-xs"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {measurements.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              {activeTool
                ? 'Click on the model to measure'
                : 'Select a tool to start measuring'}
            </p>
          ) : (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {measurements.map((measurement, index) => (
                <div
                  key={measurement.id}
                  className="flex items-center justify-between text-xs bg-muted/50 rounded px-2 py-1"
                >
                  <span className="text-muted-foreground">
                    {measurement.type === 'distance' && (
                      <Ruler className="w-3 h-3 inline mr-1" />
                    )}
                    {measurement.type === 'angle' && (
                      <Triangle className="w-3 h-3 inline mr-1" />
                    )}
                    {measurement.type === 'area' && (
                      <Square className="w-3 h-3 inline mr-1" />
                    )}
                    {index + 1}
                  </span>
                  <span className="font-medium">
                    {formatValue(measurement.value, measurement.unit)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
