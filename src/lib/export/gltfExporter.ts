import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';

export function exportGLTF(
  mesh: THREE.Mesh,
  filename: string = 'model.gltf'
): Blob {
  const exporter = new GLTFExporter();

  const exportOptions = {
    binary: filename.endsWith('.glb'), // Automatically set binary if filename is .glb
  };

  return new Promise<Blob>((resolve, reject) => {
    exporter.parse(
      mesh,
      (blob) => {
        resolve(blob as Blob);
      },
      (error) => {
        console.error('Error exporting GLTF:', error);
        reject(error);
      },
      exportOptions
    );
  });
}
