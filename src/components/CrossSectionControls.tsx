'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { RotateCw, MoveVertical, MoveHorizontal } from 'lucide-react';

export interface CrossSectionState {
  enabled: boolean;
  position: number; // 0-100% along the axis
  orientation: 'x' | 'y' | 'z'; // axis to cut along
}

interface CrossSectionControlsProps {
  crossSection: CrossSectionState;
  onCrossSectionChange: (state: CrossSectionState) => void;
}

export function CrossSectionControls({
  crossSection,
  onCrossSectionChange,
}: CrossSectionControlsProps) {
  const handleToggle = (enabled: boolean) => {
    onCrossSectionChange({ ...crossSection, enabled });
  };

  const handlePositionChange = (position: number) => {
    onCrossSectionChange({ ...crossSection, position });
  };

  const handleOrientationChange = (orientation: 'x' | 'y' | 'z') => {
    onCrossSectionChange({ ...crossSection, orientation });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            Cross-section View
          </CardTitle>
          <Checkbox
            id="cross-section-enabled"
            checked={crossSection.enabled}
            onCheckedChange={handleToggle}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {crossSection.enabled && (
          <>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="cross-section-position" className="text-xs">
                  Position (%)
                </Label>
                <span className="text-xs font-mono">
                  {crossSection.position}%
                </span>
              </div>
              <Slider
                id="cross-section-position"
                min={0}
                max={100}
                step={1}
                value={[crossSection.position]}
                onValueChange={(vals) => handlePositionChange(vals[0])}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Orientation (Cut Axis)</Label>
              <div className="flex gap-1">
                <Button
                  variant={
                    crossSection.orientation === 'x' ? 'default' : 'outline'
                  }
                  size="sm"
                  className="flex-1"
                  onClick={() => handleOrientationChange('x')}
                >
                  <MoveHorizontal className="w-4 h-4 mr-1" />X
                </Button>
                <Button
                  variant={
                    crossSection.orientation === 'y' ? 'default' : 'outline'
                  }
                  size="sm"
                  className="flex-1"
                  onClick={() => handleOrientationChange('y')}
                >
                  <MoveVertical className="w-4 h-4 mr-1" />Y
                </Button>
                <Button
                  variant={
                    crossSection.orientation === 'z' ? 'default' : 'outline'
                  }
                  size="sm"
                  className="flex-1"
                  onClick={() => handleOrientationChange('z')}
                >
                  <RotateCw className="w-4 h-4 mr-1" />Z
                </Button>
              </div>
            </div>

            <div className="pt-2 text-xs text-muted-foreground">
              {crossSection.orientation.toUpperCase()}-axis cut at{' '}
              {crossSection.position}% of dimension
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
