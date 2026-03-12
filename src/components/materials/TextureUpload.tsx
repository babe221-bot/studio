'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import type { Material } from '@/types';

interface TextureUploadProps {
  material: Material;
  onClose: () => void;
  onTextureUpload: (textureType: string, url: string) => void;
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
      // Simulate upload - in a real app, this would call an API
      // For now, we'll create a preview URL
      const previewUrl = URL.createObjectURL(selectedFile);

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Call the callback with the texture info
      onTextureUpload(textureType, previewUrl);

      // Close the modal
      onClose();
    } catch (error) {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative bg-background w-full max-w-md p-6">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-opacity"
          aria-label="Close"
        >
          <span className="sr-only">Close</span>
          <Button variant="ghost" size="icon">
            <span className="sr-only">Close</span>
          </Button>
        </button>

        <Card className="space-y-6">
          <CardHeader>
            <CardTitle className="text-xl font-bold">
              Upload Texture for {material.display_name || material.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <span className="text-sm font-medium">Texture Type</span>
                <div className="flex flex-col space-y-2">
                  {[
                    { label: 'Albedo (Base Color)', value: 'albedo' },
                    { label: 'Normal Map', value: 'normal' },
                    { label: 'Roughness Map', value: 'roughness' },
                    { label: 'Displacement Map', value: 'displacement' },
                    { label: 'Ambient Occlusion', value: 'ao' },
                    { label: 'Metallic Map', value: 'metallic' },
                  ].map((option) => (
                    <div
                      key={option.value}
                      className="flex items-center space-x-2"
                    >
                      <input
                        type="radio"
                        id={`texture-${option.value}`}
                        value={option.value}
                        checked={textureType === option.value}
                        onChange={(e) =>
                          setTextureType(e.target.value as typeof textureType)
                        }
                        className="h-4 w-4 text-primary"
                      />
                      <label
                        htmlFor={`texture-${option.value}`}
                        className="text-sm font-medium"
                      >
                        {option.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-sm font-medium">Select File</span>
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg"
                  className="w-full"
                  onChange={handleFileChange}
                />
                {selectedFile && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedFile.name} ({Math.round(selectedFile.size / 1024)}{' '}
                    KB)
                  </p>
                )}
              </div>

              {uploadError && (
                <p className="text-sm text-destructive">{uploadError}</p>
              )}
            </div>
          </CardContent>
          <CardContent className="flex justify-end space-x-3">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleUpload}
              disabled={isUploading || !selectedFile}
              className="w-32"
            >
              {isUploading ? 'Uploading...' : 'Upload Texture'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
