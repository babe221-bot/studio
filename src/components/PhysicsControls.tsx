'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

interface PhysicsControlsProps {
  leftSupport: number;
  rightSupport: number;
  onLeftSupportChange: (value: number) => void;
  onRightSupportChange: (value: number) => void;
  maxDeflection: number;
  naturalFrequency: number;
}

export function PhysicsControls({
  leftSupport,
  rightSupport,
  onLeftSupportChange,
  onRightSupportChange,
  maxDeflection,
  naturalFrequency,
}: PhysicsControlsProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Physics Simulation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="left-support" className="text-xs">
              Left Support (%)
            </Label>
            <span className="text-xs font-mono">{leftSupport}%</span>
          </div>
          <Slider
            id="left-support"
            min={0}
            max={40}
            step={1}
            value={[leftSupport]}
            onValueChange={(vals) => onLeftSupportChange(vals[0])}
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="right-support" className="text-xs">
              Right Support (%)
            </Label>
            <span className="text-xs font-mono">{rightSupport}%</span>
          </div>
          <Slider
            id="right-support"
            min={60}
            max={100}
            step={1}
            value={[rightSupport]}
            onValueChange={(vals) => onRightSupportChange(vals[0])}
          />
        </div>

        <div className="pt-2 border-t space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Max Deflection:</span>
            <span className="font-medium">{maxDeflection.toFixed(3)} mm</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Natural Freq:</span>
            <span className="font-medium">
              {naturalFrequency.toFixed(1)} Hz
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
