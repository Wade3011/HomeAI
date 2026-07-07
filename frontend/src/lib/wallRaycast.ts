import * as THREE from 'three';
import type { RoomWallId } from '@/lib/placementSnap';

const hitPoint = new THREE.Vector3();

export function getWallPlane(
  wall: RoomWallId,
  roomWidthFt: number,
  roomDepthFt: number,
): THREE.Plane {
  switch (wall) {
    case 'back':
      return new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    case 'front':
      return new THREE.Plane(new THREE.Vector3(0, 0, -1), -roomDepthFt);
    case 'left':
      return new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);
    case 'right':
      return new THREE.Plane(new THREE.Vector3(-1, 0, 0), -roomWidthFt);
  }
}

/** Project pointer ray onto a wall plane — returns coords along the wall for snapping. */
export function raycastWallCoords(
  ray: THREE.Ray,
  wall: RoomWallId,
  roomWidthFt: number,
  roomDepthFt: number,
): { clickX: number; clickZ: number } | null {
  const plane = getWallPlane(wall, roomWidthFt, roomDepthFt);
  if (!ray.intersectPlane(plane, hitPoint)) return null;
  return { clickX: hitPoint.x, clickZ: hitPoint.z };
}
