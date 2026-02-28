/**
 * DimensionLabels - 3D dimension labels for the stone slab visualization
 * 
 * Displays length, width, and height labels using Sprite materials.
 * Automatically cleans up textures and materials on unmount.
 */

import React, { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';

interface DimensionLabelsProps {
    dims: { length: number; width: number; height: number };
    visible: boolean;
}

interface LabelData {
    text: string;
    position: [number, number, number];
}

const createDimensionTexture = (text: string): { texture: THREE.CanvasTexture; aspectRatio: number } => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 256;
    canvas.height = 64;

    // Background
    context.fillStyle = 'rgba(0, 0, 0, 0.75)';
    context.beginPath();
    context.roundRect(0, 0, canvas.width, canvas.height, 8);
    context.fill();

    // Border
    context.strokeStyle = 'rgba(255,255,255,0.5)';
    context.lineWidth = 1.5;
    context.beginPath();
    context.roundRect(2, 2, canvas.width - 4, canvas.height - 4, 6);
    context.stroke();

    // Text
    context.font = 'bold 22px "Inter", Arial, sans-serif';
    context.fillStyle = '#ffffff';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const aspectRatio = canvas.width / canvas.height;

    return { texture, aspectRatio };
};

export const DimensionLabels: React.FC<DimensionLabelsProps> = ({ dims, visible }) => {
    const texturesRef = useRef<THREE.CanvasTexture[]>([]);

    const { length, width, height } = dims;
    const vizL = length / 100;
    const vizW = width / 100;
    const h = height / 100;

    // Clean up old textures
    useEffect(() => {
        return () => {
            texturesRef.current.forEach(texture => texture.dispose());
            texturesRef.current = [];
        };
    }, []);

    const labels = useMemo((): LabelData[] => {
        if (!visible) return [];

        return [
            { text: `${length} cm`, position: [0, h + 0.35, vizW / 2 + 0.35] },
            { text: `${width} cm`, position: [-vizL / 2 - 0.35, h + 0.35, 0] },
            { text: `${height} cm`, position: [vizL / 2 + 0.35, h / 2, -vizW / 2 - 0.35] },
        ];
    }, [length, width, height, vizL, vizW, h, visible]);

    if (!visible || labels.length === 0) return null;

    return (
        <group>
            {labels.map((label, index) => {
                const { texture, aspectRatio } = createDimensionTexture(label.text);
                texturesRef.current.push(texture);

                const height = 0.8; // World units
                const width = height * aspectRatio;

                return (
                    <sprite
                        key={index}
                        position={label.position}
                        scale={[width, height, 1]}
                    >
                        <spriteMaterial
                            map={texture}
                            transparent
                            depthTest={false}
                            sizeAttenuation
                        />
                    </sprite>
                );
            })}
        </group>
    );
};

export default DimensionLabels;
