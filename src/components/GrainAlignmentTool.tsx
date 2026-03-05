import React from 'react';
import { useLabStore } from '@/store/useLabStore';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export const GrainAlignmentTool: React.FC = () => {
  const { 
    grainOffset, 
    grainRotation, 
    mirrorGrain,
    setGrainOffset, 
    setGrainRotation,
    setMirrorGrain
  } = useLabStore();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Grain Alignment (Bookmatching)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="offset-x">X Offset</Label>
            <span className="text-xs text-muted-foreground">{grainOffset.x.toFixed(2)}m</span>
          </div>
          <Slider
            id="offset-x"
            min={-2}
            max={2}
            step={0.01}
            value={[grainOffset.x]}
            onValueChange={([val]) => setGrainOffset({ x: val })}
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="offset-y">Y Offset</Label>
            <span className="text-xs text-muted-foreground">{grainOffset.y.toFixed(2)}m</span>
          </div>
          <Slider
            id="offset-y"
            min={-2}
            max={2}
            step={0.01}
            value={[grainOffset.y]}
            onValueChange={([val]) => setGrainOffset({ y: val })}
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="rotation">Rotation</Label>
            <span className="text-xs text-muted-foreground">{grainRotation}°</span>
          </div>
          <Slider
            id="rotation"
            min={0}
            max={360}
            step={1}
            value={[grainRotation]}
            onValueChange={([val]) => setGrainRotation(val)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="mirror-mode">Mirror Mode (Bookmatch)</Label>
          <Switch 
            id="mirror-mode" 
            checked={mirrorGrain}
            onCheckedChange={setMirrorGrain}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default GrainAlignmentTool;
