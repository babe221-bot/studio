import React from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ExportFormat } from '@/lib/export/exportService';

interface ExportOptionsProps {
  format: ExportFormat;
  setFormat: (format: ExportFormat) => void;
  quality: 'draft' | 'standard' | 'high';
  setQuality: (quality: 'draft' | 'standard' | 'high') => void;
}

export const ExportOptions: React.FC<ExportOptionsProps> = ({
  format,
  setFormat,
  quality,
  setQuality,
}) => {
  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="space-y-2">
        <Label>Format</Label>
        <RadioGroup
          defaultValue={format}
          onValueChange={(value) => setFormat(value as ExportFormat)}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="stl" id="stl" />
            <Label htmlFor="stl">STL</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="obj" id="obj" />
            <Label htmlFor="obj">OBJ</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="gltf" id="gltf" />
            <Label htmlFor="gltf">GLTF (.gltf)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="glb" id="glb" />
            <Label htmlFor="glb">GLB (.glb)</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label>Quality</Label>
        <RadioGroup
          defaultValue={quality}
          onValueChange={(value) =>
            setQuality(value as 'draft' | 'standard' | 'high')
          }
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="draft" id="draft" />
            <Label htmlFor="draft">Draft (Low Poly)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="standard" id="standard" />
            <Label htmlFor="standard">Standard</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="high" id="high" />
            <Label htmlFor="high">High Poly</Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
};
