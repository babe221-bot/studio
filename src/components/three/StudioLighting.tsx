/**
 * StudioLighting - Professional studio lighting setup for R3F
 * 
 * Features:
 * - Key light (warm, high angle)
 * - Fill light (cool, opposite side)
 * - Rim light (pure white, behind and above)
 * - Bottom bounce light (subtle warm fill)
 * - Ambient light (low intensity, environment-driven)
 */

import React, { useRef } from 'react';
import * as THREE from 'three';

export const StudioLighting: React.FC = () => {
    return (
        <>
            {/* Ambient light - low intensity since environment drives most ambient */}
            <ambientLight intensity={0.15} color="#ffffff" />

            {/* Key light — warm, high angle */}
            <directionalLight
                position={[4, 9, 4]}
                intensity={1.6}
                color="#FFFAF0"
                castShadow
                shadow-mapSize={[4096, 4096]}
                shadow-camera-near={0.5}
                shadow-camera-far={50}
                shadow-camera-left={-6}
                shadow-camera-right={6}
                shadow-camera-top={6}
                shadow-camera-bottom={-6}
                shadow-bias={-0.0005}
            />

            {/* Fill light — cool, opposite side */}
            <directionalLight
                position={[-5, 3, -3]}
                intensity={0.55}
                color="#C8D8FF"
            />

            {/* Rim light — pure white, behind and above */}
            <directionalLight
                position={[0, 5, -9]}
                intensity={0.7}
                color="#FFFFFF"
            />

            {/* Bottom bounce light — subtle warm fill from below */}
            <directionalLight
                position={[0, -3, 2]}
                intensity={0.25}
                color="#FFEECC"
            />
        </>
    );
};

export default StudioLighting;
