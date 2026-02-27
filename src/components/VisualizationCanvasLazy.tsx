"use client";

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Material as MaterialType, SurfaceFinish, EdgeProfile, ProcessedEdges } from '@/types';

const VisualizationCanvas = dynamic(
    () => import('./VisualizationCanvas'),
    {
        ssr: false,
        loading: () => (
            <div className="h-full w-full flex items-center justify-center">
                <div className="space-y-2 w-full max-w-md px-8">
                    <Skeleton className="h-48 w-full" />
                    <div className="flex justify-center gap-2">
                        <Skeleton className="h-4 w-32" />
                    </div>
                </div>
            </div>
        ),
    }
);

interface LazyVisualizationProps {
    dims: { length: number; width: number; height: number };
    material?: MaterialType;
    finish?: SurfaceFinish;
    profile?: EdgeProfile;
    processedEdges: ProcessedEdges;
    okapnikEdges: ProcessedEdges;
}

export function VisualizationCanvasLazy(props: LazyVisualizationProps) {
    return (
        <Suspense fallback={
            <Card className="h-full flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground">
                    Učitavam 3D prikaz...
                </div>
            </Card>
        }>
            <VisualizationCanvas {...props} />
        </Suspense>
    );
}
