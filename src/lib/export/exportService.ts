import * as THREE from 'three';
import { exportSTL } from './stlExporter';
import { exportOBJ } from './objExporter';
import { exportGLTF } from './gltfExporter';
import { simplifyMesh, ExportQuality } from './meshSimplifier';

export type ExportFormat = 'stl' | 'obj' | 'gltf' | 'glb';

export async function exportConfig(
  mesh: THREE.Mesh,
  format: ExportFormat,
  filename: string,
  quality: ExportQuality = 'standard'
): Promise<Blob> {
  const processedMesh = simplifyMesh(mesh, quality);

  switch (format) {
    case 'stl':
      return exportSTL(processedMesh, filename);
    case 'obj':
      return exportOBJ(processedMesh, filename);
    case 'gltf':
    case 'glb':
      return exportGLTF(processedMesh, filename);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}
