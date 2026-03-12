'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { Material } from '@/types';

interface TextureUploadProps {
  material: Material;
  onClose: () => void;
  onTextureUpload: (textureType: string, file: File) => Promise<void>;
}

export function TextureUpload({
  material,
  onClose,
  onTextureUpload,
}: TextureUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [textureType, setTextureType] = useState<
    'albedo' | 'normal' | 'roughness' | 'displacement' | 'ao' | 'metallic'
  >('albedo');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setUploadError(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError('Please select a file');
      return;
    }

    // Basic file validation
    const validTypes = ['image/png', 'image/jpeg'];
    if (!validTypes.includes(selectedFile.type)) {
      setUploadError('Only PNG and JPEG files are supported');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      await onTextureUpload(textureType, selectedFile);
      onClose();
    } catch (error) {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <div className="relative bg-background w-full max-w-md rounded-lg shadow-2xl">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-2 right-2 z-10"
        >
          <X className="h-4 w-4" />
        </Button>

        <Card className="border-0 shadow-none">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Upload Texture</CardTitle>
            <p className="text-xs text-muted-foreground">
              Add custom maps for {material.display_name || material.name}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <span className="text-sm font-medium">Texture Type</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Albedo', value: 'albedo' },
                    { label: 'Normal', value: 'normal' },
                    { label: 'Roughness', value: 'roughness' },
                    { label: 'Displacement', value: 'displacement' },
                    { label: 'AO', value: 'ao' },
                    { label: 'Metallic', value: 'metallic' },
                  ].map((option) => (
                    <div
                      key={option.value}
                      className={`flex items-center justify-between p-2 border rounded-md cursor-pointer transition-colors ${
                        textureType === option.value
                          ? 'bg-primary/5 border-primary'
                          : 'hover:bg-accent'
                      }`}
                      onClick={() => setTextureType(option.value as any)}
                    >
                      <span className="text-xs font-medium">
                        {option.label}
                      </span>
                      <div
                        className={`w-2 h-2 rounded-full ${textureType === option.value ? 'bg-primary' : 'bg-transparent border'}`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-sm font-medium">Select File</span>
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    id="texture-file"
                    accept=".png,.jpg,.jpeg"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <Button
                    variant="outline"
                    onClick={() =>
                      document.getElementById('texture-file')?.click()
                    }
                    className="w-full border-dashed"
                  >
                    {selectedFile ? selectedFile.name : 'Choose Image...'}
                  </Button>
                </div>
              </div>

              {uploadError && (
                <p className="text-sm text-destructive">{uploadError}</p>
              )}
            </div>
          </CardContent>
          <CardContent className="flex justify-end space-x-3 pt-0">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleUpload}
              disabled={isUploading || !selectedFile}
            >
              {isUploading ? 'Uploading...' : 'Start Upload'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
