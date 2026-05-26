import type { CatalogItem } from '@/types';
import { isWallCabinet } from '@/config/catalogCategories';
import { isBaseCabinetItem, isCountertopItem } from '@/lib/placementHeight';
import {
  snapBaseCabinetPosition,
  snapWallCabinetWithNeighbors,
} from '@/lib/cabinetNeighborSnap';
import {
  buildFootprints,
  catalogDimensionsFt,
  orientedDimensions,
} from '@/components/planner/placementCollision';
import {
  snapCountertopPosition,
  inferWallFromPlacement,
  type RoomWallId,
} from '@/lib/placementSnap';
import { raycastWallCoords } from '@/lib/wallRaycast';
import {
  FINE_GRID_FT,
  clampPlacementOrigin,
  snapToGrid,
} from '@/components/planner/plannerUtils';
import type { Placement } from '@/types';
import * as THREE from 'three';

const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const floorHit = new THREE.Vector3();

/** Live drag snap — cabinet neighbor snap with overlap rejection. */
export function previewDragPosition({
  ray,
  item,
  customFloorDims,
  placement,
  lockedWall,
  roomWidthFt,
  roomDepthFt,
  placements,
  catalogById,
}: {
  ray: THREE.Ray;
  item?: CatalogItem;
  customFloorDims?: { widthFt: number; depthFt: number };
  placement: Placement;
  lockedWall: RoomWallId | null;
  roomWidthFt: number;
  roomDepthFt: number;
  placements: Placement[];
  catalogById: Record<string, CatalogItem>;
}): { x: number; z: number } | null {
  if (customFloorDims) {
    if (!ray.intersectPlane(floorPlane, floorHit)) return null;
    const x = snapToGrid(floorHit.x - customFloorDims.widthFt / 2, FINE_GRID_FT);
    const z = snapToGrid(floorHit.z - customFloorDims.depthFt / 2, FINE_GRID_FT);
    return clampPlacementOrigin(
      x,
      z,
      customFloorDims.widthFt,
      customFloorDims.depthFt,
      roomWidthFt,
      roomDepthFt,
    );
  }

  if (!item) return null;

  const { widthFt, depthFt } = catalogDimensionsFt(item);
  const o = orientedDimensions(widthFt, depthFt, placement.rotationY);

  if (isWallCabinet(item)) {
    const wall =
      lockedWall ??
      inferWallFromPlacement(
        placement.positionX,
        placement.positionZ,
        widthFt,
        depthFt,
        placement.rotationY,
        roomWidthFt,
        roomDepthFt,
      );
    const wallCoords = raycastWallCoords(ray, wall, roomWidthFt, roomDepthFt);
    if (!wallCoords) return null;
    const footprints = buildFootprints(placements, catalogById);
    return snapWallCabinetWithNeighbors({
      clickX: wallCoords.clickX,
      clickZ: wallCoords.clickZ,
      widthFt,
      depthFt,
      rotationY: placement.rotationY,
      wall,
      roomWidthFt,
      roomDepthFt,
      placements,
      catalogById,
      excludePlacementId: placement.placementId,
      footprints,
      placingItem: item,
      gridFt: FINE_GRID_FT,
    });
  }

  if (!ray.intersectPlane(floorPlane, floorHit)) return null;

  if (isCountertopItem(item)) {
    return snapCountertopPosition(
      floorHit.x,
      floorHit.z,
      widthFt,
      depthFt,
      placement.rotationY,
      placements,
      catalogById,
      roomWidthFt,
      roomDepthFt,
      placement.placementId,
    );
  }

  if (isBaseCabinetItem(item)) {
    const footprints = buildFootprints(placements, catalogById);
    return snapBaseCabinetPosition({
      clickX: floorHit.x,
      clickZ: floorHit.z,
      widthFt,
      depthFt,
      rotationY: placement.rotationY,
      roomWidthFt,
      roomDepthFt,
      placements,
      catalogById,
      excludePlacementId: placement.placementId,
      footprints,
      placingItem: item,
      gridFt: FINE_GRID_FT,
    });
  }

  const x = snapToGrid(floorHit.x - o.widthFt / 2, FINE_GRID_FT);
  const z = snapToGrid(floorHit.z - o.depthFt / 2, FINE_GRID_FT);
  return clampPlacementOrigin(x, z, o.widthFt, o.depthFt, roomWidthFt, roomDepthFt);
}
