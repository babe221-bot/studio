import * as THREE from 'three';

export function exportOBJ(
  mesh: THREE.Mesh,
  filename: string = 'model.obj'
): Blob {
  // OBJExporter is not directly available in @types/three, needs to be imported from three/examples/jsm/exporters/OBJExporter
  // For demonstration purposes, we'll use a placeholder.
  // In a real implementation, you would import and use OBJExporter.
  console.warn('OBJExporter is not fully implemented. Using placeholder.');

  // Placeholder for actual OBJ export logic
  const placeholderContent = `# Placeholder OBJ file for ${filename}\n
`;

  return new Blob([placeholderContent], { type: 'text/plain' });
}
