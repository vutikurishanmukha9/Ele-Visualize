import * as THREE from 'three';

/**
 * Deep recursive WebGL resource disposal utility.
 * Frees geometry buffers, materials, uniform textures, and lights
 * to prevent GPU context loss when switching elements/molecules.
 */
export function disposeHierarchy(node: THREE.Object3D | null) {
  if (!node) return;

  node.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;

      if (mesh.geometry) {
        mesh.geometry.dispose();
      }

      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => disposeMaterial(mat));
        } else {
          disposeMaterial(mesh.material);
        }
      }
    }

    if ((child as THREE.Light).isLight) {
      (child as THREE.Light).dispose?.();
    }
  });

  while (node.children.length > 0) {
    const child = node.children[0];
    node.remove(child);
    disposeHierarchy(child);
  }
}

function disposeMaterial(mat: THREE.Material) {
  mat.dispose();
  for (const key of Object.keys(mat)) {
    const value = (mat as unknown as Record<string, unknown>)[key];
    if (value && typeof value === 'object' && 'isTexture' in value && value.isTexture) {
      (value as THREE.Texture).dispose();
    }
  }
}
