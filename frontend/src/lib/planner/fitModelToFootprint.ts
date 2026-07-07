import * as THREE from 'three';

/** Uniform scale + floor-align so a loaded model fits the catalog footprint (feet). */
export function fitModelToFootprint(
  root: THREE.Object3D,
  widthFt: number,
  depthFt: number,
  heightFt: number,
): void {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  if (size.x <= 0 || size.y <= 0 || size.z <= 0) return;

  const scale = Math.min(widthFt / size.x, depthFt / size.z, heightFt / size.y);
  root.scale.setScalar(scale);
  root.updateMatrixWorld(true);

  const fitted = new THREE.Box3().setFromObject(root);
  const center = fitted.getCenter(new THREE.Vector3());
  root.position.set(-center.x, -heightFt / 2 - fitted.min.y, -center.z);
}

export function cloneSceneGraph(source: THREE.Object3D): THREE.Group {
  const group = new THREE.Group();
  const clone = source.clone(true);
  group.add(clone);
  return group;
}

/** Disable picking on visual-only GLTF geometry (floor pick box handles interaction). */
export function setRaycastEnabled(root: THREE.Object3D, enabled: boolean): void {
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.raycast = enabled ? THREE.Mesh.prototype.raycast : () => null;
    }
  });
}

export function applySelectionTint(root: THREE.Object3D, selected: boolean): void {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    for (const mat of mats) {
      if (!(mat instanceof THREE.MeshStandardMaterial)) continue;
      if (selected) {
        mat.emissive.set('#3d5348');
        mat.emissiveIntensity = 0.12;
      } else {
        mat.emissive.set('#000000');
        mat.emissiveIntensity = 0;
      }
    }
  });
}
