import { useState, useEffect, useMemo } from 'react';
import type { Material } from '@/types';
import { PhysicsEngine } from '@/lib/physics/PhysicsEngine';

interface UsePhysicsOptions {
  material: Material | null;
  length: number;
  width: number;
  height: number;
  supportPoints?: { left: number; right: number };
}

export function usePhysics({
  material,
  length,
  width,
  height,
  supportPoints = { left: 0, right: 100 },
}: UsePhysicsOptions) {
  const [deformation, setDeformation] = useState<number[]>([]);
  const [naturalFrequency, setNaturalFrequency] = useState<number>(0);
  const [maxDeflection, setMaxDeflection] = useState<number>(0);

  useEffect(() => {
    if (!material) {
      setDeformation([]);
      setNaturalFrequency(0);
      setMaxDeflection(0);
      return;
    }

    // Calculate deflection profile (for visualization)
    const profile = PhysicsEngine.calculateDeflectionProfile(
      material,
      length,
      width,
      height,
      supportPoints
    );
    setDeformation(profile);

    // Calculate maximum deflection
    const max = PhysicsEngine.calculateDeflection(
      material,
      length,
      width,
      height,
      supportPoints
    );
    setMaxDeflection(max);

    // Calculate natural frequency
    const freq = PhysicsEngine.calculateNaturalFrequency(
      material,
      length,
      width,
      height,
      supportPoints
    );
    setNaturalFrequency(freq);
  }, [material, length, width, height, supportPoints]);

  return {
    deformation,
    naturalFrequency,
    maxDeflection,
  };
}
