"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Box, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import dynamic from 'next/dynamic';

const ModelViewerElement = dynamic(() => import('@google/model-viewer').then(() => {
    return () => null;
}), { ssr: false });

interface ARPreviewProps {
    config: {
        dims: { length: number; width: number; height: number };
        material?: any;
        finish?: any;
        profile?: any;
        processedEdges: any;
        okapnikEdges: any;
    };
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': any;
    }
  }
}

export function ARPreview({ config }: ARPreviewProps) {
    const [glbUrl, setGlbUrl] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const { toast } = useToast();

    const generateARModel = async () => {
        setIsGenerating(true);
        const PYTHON_API_URL = process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000';
        
        try {
            const res = await fetch(`${PYTHON_API_URL}/api/cad/export-glb`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dimensions: config.dims,
                    material_name: config.material?.name,
                    surface_finish_name: config.finish?.name,
                    edge_profile_name: config.profile?.name,
                    processed_edges: Object.entries(config.processedEdges)
                        .filter(([_, v]) => v)
                        .map(([k]) => k),
                    okapnik_edges: Object.entries(config.okapnikEdges)
                        .filter(([_, v]) => v)
                        .map(([k]) => k),
                })
            });

            if (!res.ok) throw new Error("Failed to generate 3D model");

            const data = await res.json();
            if (data.glb) {
                const binary = atob(data.glb);
                const array = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
                const blob = new Blob([array], { type: 'model/gltf-binary' });
                const url = URL.createObjectURL(blob);
                setGlbUrl(url);
                toast({ title: "Model spreman", description: "Sada možete pogledati model u prostoru ili ga preuzeti." });
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Greška", description: "Nije uspjelo generiranje AR modela.", variant: "destructive" });
        } finally {
            setIsGenerating(false);
        }
    };

    const downloadGLB = () => {
        if (!glbUrl) return;
        const link = document.createElement('a');
        link.href = glbUrl;
        link.download = `slab-${config.material?.name || 'design'}.glb`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    useEffect(() => {
        return () => {
            if (glbUrl) URL.revokeObjectURL(glbUrl);
        };
    }, [glbUrl]);

    return (
        <div className="flex flex-col gap-4">
            <ModelViewerElement />
            {!glbUrl ? (
                <Button 
                    onClick={generateARModel} 
                    disabled={isGenerating}
                    variant="outline"
                    className="w-full"
                >
                    {isGenerating ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Box className="mr-2 h-4 w-4" />
                    )}
                    Pripremi 3D Model / AR
                </Button>
            ) : (
                <div className="flex flex-col gap-2">
                    <div className="relative aspect-square w-full bg-muted rounded-lg overflow-hidden border">
                        <model-viewer
                            src={glbUrl}
                            ar
                            ar-modes="webxr scene-viewer quick-look"
                            camera-controls
                            shadow-intensity="1"
                            style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
                            auto-rotate
                        >
                            <Button 
                                slot="ar-button" 
                                className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-primary"
                            >
                                Pogledaj u svom prostoru (AR)
                            </Button>
                        </model-viewer>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="absolute top-2 right-2 text-xs"
                            onClick={() => setGlbUrl(null)}
                        >
                            Resetiraj
                        </Button>
                    </div>
                    <Button variant="secondary" onClick={downloadGLB} className="w-full">
                        <Download className="mr-2 h-4 w-4" /> Preuzmi .GLB (za AutoCAD/Revit)
                    </Button>
                </div>
            )}
        </div>
    );
}
