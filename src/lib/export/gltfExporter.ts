import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

export async function exportGLTF(
  mesh: THREE.Mesh,
  filename: string = 'model.gltf'
): Promise<Blob> {
  const exporter = new GLTFExporter();

  const exportOptions = {
    binary: filename.endsWith('.glb'), // Automatically set binary if filename is .glb
  };

  return new Promise<Blob>((resolve, reject) => {
    exporter.parse(
      mesh,
      (gltf: any) => {
        if (gltf instanceof Blob) {
          resolve(gltf);
        } else {
          // If GLTFExporter returns a JSON object (for .gltf), convert to Blob
          const json = JSON.stringify(gltf);
          const blob = new Blob([json], { type: 'application/json' });
          resolve(blob);
        }
      },
      (error: any) => {
        console.error('Error exporting GLTF:', error);
        reject(error);
      },
      exportOptions
    );
  });
}
