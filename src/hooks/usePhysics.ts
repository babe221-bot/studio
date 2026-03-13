import { useMemo } from 'react';
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
  return useMemo(() => {
    if (!material) {
      return {
        deformation: [],
        naturalFrequency: 0,
        maxDeflection: 0,
      };
    }

    // Calculate deflection profile (for visualization)
    const profile = PhysicsEngine.calculateDeflectionProfile(
      material,
      length,
      width,
      height,
      supportPoints
    );

    // Calculate maximum deflection
    const max = PhysicsEngine.calculateDeflection(
      material,
      length,
      width,
      height,
      supportPoints
    );

    // Calculate natural frequency
    const freq = PhysicsEngine.calculateNaturalFrequency(
      material,
      length,
      width,
      height,
      supportPoints
    );

    return {
      deformation: profile,
      naturalFrequency: freq,
      maxDeflection: max,
    };
  }, [
    material,
    length,
    width,
    height,
    supportPoints.left,
    supportPoints.right,
  ]);
}
