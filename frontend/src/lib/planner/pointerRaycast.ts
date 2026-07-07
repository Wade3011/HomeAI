import type { Camera } from 'three';
import * as THREE from 'three';

const ndc = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hitPoint = new THREE.Vector3();

/** Screen coords → ray for the active canvas camera. */
export function rayFromClient(
  clientX: number,
  clientY: number,
  camera: Camera,
  canvas: HTMLCanvasElement,
): THREE.Ray {
  const rect = canvas.getBoundingClientRect();
  ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(ndc, camera);
  return raycaster.ray;
}

/** Intersect the floor plane (y = 0). */
export function floorHitFromClient(
  clientX: number,
  clientY: number,
  camera: Camera,
  canvas: HTMLCanvasElement,
): { x: number; z: number } | null {
  const ray = rayFromClient(clientX, clientY, camera, canvas);
  if (!ray.intersectPlane(floorPlane, hitPoint)) return null;
  return { x: hitPoint.x, z: hitPoint.z };
}
