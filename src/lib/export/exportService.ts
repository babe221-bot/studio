import * as THREE from 'three';
import { exportSTL } from './stlExporter';
import { exportOBJ } from './objExporter';
import { exportGLTF } from './gltfExporter';

export type ExportFormat = 'stl' | 'obj' | 'gltf' | 'glb';

export async function exportConfig(
  mesh: THREE.Mesh,
  format: ExportFormat,
  filename: string
): Promise<Blob> {
  switch (format) {
    case 'stl':
      return exportSTL(mesh, filename);
    case 'obj':
      return exportOBJ(mesh, filename);
    case 'gltf' || 'glb':
      return exportGLTF(mesh, filename);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}
