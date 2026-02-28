/**
 * SceneEnvironment - Environment and background setup for R3F
 * 
 * Features:
 * - Room environment for realistic reflections
 * - Checkerboard background pattern
 * - Ground plane with shadows
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Environment } from '@react-three/drei';

export const SceneEnvironment: React.FC = () => {
    // Create checkerboard background texture
    const backgroundTexture = useMemo(() => {
        const canvas = document.createElement('canvas');
        const sq = 32;
        canvas.width = canvas.height = sq * 2;
        const ctx = canvas.getContext('2d');

        if (ctx) {
            ctx.fillStyle = 'hsl(240 3.7% 11%)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'hsl(240 3.7% 16%)';
            ctx.fillRect(0, 0, sq, sq);
            ctx.fillRect(sq, sq, sq, sq);
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(80, 80);
        tex.colorSpace = THREE.SRGBColorSpace;

        return tex;
    }, []);

    return (
        <>
            {/* Environment for realistic reflections */}
            <Environment preset="city" background={false} />

            {/* Background */}
            <color attach="background" args={['#1a1a1e']} />

            {/* Ground plane */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
                <planeGeometry args={[60, 60]} />
                <meshStandardMaterial
                    color="#151515"
                    roughness={0.9}
                    metalness={0.1}
                />
            </mesh>
        </>
    );
};

export default SceneEnvironment;
