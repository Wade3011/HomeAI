import { isWallCabinet } from '@/config/catalogCategories';
import type { CatalogItem, Placement } from '@/types';
import {
  snapBaseCabinetPosition,
  snapWallCabinetWithNeighbors,
} from '@/lib/cabinetNeighborSnap';
import { catalogDimensionsFt, orientedDimensions } from '@/components/planner/placementCollision';
import {
  countertopHasBaseSupport,
  isBaseCabinetItem,
  isCountertopItem,
} from '@/lib/placementHeight';
import {
  CABINET_GRID_FT,
  clampPlacementOrigin,
  rotationStepsFromY,
  rotationYFromSteps,
  snapToGrid,
} from '@/components/planner/plannerUtils';

const COUNTERTOP_SNAP_MAX_FT = 8;
const COUNTERTOP_INSIDE_TOLERANCE_FT = 0.25;

export type RoomWallId = 'back' | 'front' | 'left' | 'right';

export type PlacementSnapResult = {
  x: number;
  z: number;
  rotationY?: number;
};

export const WALL_BASE_ROTATION: Record<RoomWallId, number> = {
  back: 0,
  front: Math.PI,
  left: Math.PI / 2,
  right: -Math.PI / 2,
};

export function wallRelativeRotationSteps(rotationY: number, wall: RoomWallId): number {
  return rotationStepsFromY(rotationY - WALL_BASE_ROTATION[wall]);
}

export function nearestWall(
  clickX: number,
  clickZ: number,
  roomWidthFt: number,
  roomDepthFt: number,
): RoomWallId {
  const distances: { wall: RoomWallId; d: number }[] = [
    { wall: 'back', d: clickZ },
    { wall: 'front', d: roomDepthFt - clickZ },
    { wall: 'left', d: clickX },
    { wall: 'right', d: roomWidthFt - clickX },
  ];
  distances.sort((a, b) => a.d - b.d);
  return distances[0].wall;
}

export function snapWallCabinetFromClick(
  clickX: number,
  clickZ: number,
  widthFt: number,
  depthFt: number,
  rotationSteps: number,
  roomWidthFt: number,
  roomDepthFt: number,
  wall?: RoomWallId,
): PlacementSnapResult {
  const targetWall = wall ?? nearestWall(clickX, clickZ, roomWidthFt, roomDepthFt);
  const rotationY = WALL_BASE_ROTATION[targetWall] + rotationYFromSteps(rotationSteps);
  return {
    ...snapWallCabinetAlongWall(
      targetWall,
      clickX,
      clickZ,
      widthFt,
      depthFt,
      rotationY,
      roomWidthFt,
      roomDepthFt,
    ),
    rotationY,
  };
}

/** Slide wall cabinet along a locked wall on a 6-inch grid. */
export function snapWallCabinetAlongWall(
  wall: RoomWallId,
  clickX: number,
  clickZ: number,
  widthFt: number,
  depthFt: number,
  rotationY: number,
  roomWidthFt: number,
  roomDepthFt: number,
): { x: number; z: number } {
  const o = orientedDimensions(widthFt, depthFt, rotationY);

  switch (wall) {
    case 'back':
      return {
        x: clampPlacementOrigin(
          snapToGrid(clickX - o.widthFt / 2, CABINET_GRID_FT),
          0,
          o.widthFt,
          o.depthFt,
          roomWidthFt,
          roomDepthFt,
        ).x,
        z: 0,
      };
    case 'front':
      return {
        x: clampPlacementOrigin(
          snapToGrid(clickX - o.widthFt / 2, CABINET_GRID_FT),
          roomDepthFt - o.depthFt,
          o.widthFt,
          o.depthFt,
          roomWidthFt,
          roomDepthFt,
        ).x,
        z: roomDepthFt - o.depthFt,
      };
    case 'left':
      return {
        x: 0,
        z: clampPlacementOrigin(
          0,
          snapToGrid(clickZ - o.widthFt / 2, CABINET_GRID_FT),
          o.widthFt,
          o.depthFt,
          roomWidthFt,
          roomDepthFt,
        ).z,
      };
    case 'right':
      return {
        x: roomWidthFt - o.depthFt,
        z: clampPlacementOrigin(
          roomWidthFt - o.depthFt,
          snapToGrid(clickZ - o.widthFt / 2, CABINET_GRID_FT),
          o.widthFt,
          o.depthFt,
          roomWidthFt,
          roomDepthFt,
        ).z,
      };
  }
}

export function snapWallCabinetPosition(
  x: number,
  z: number,
  widthFt: number,
  depthFt: number,
  rotationY: number,
  roomWidthFt: number,
  roomDepthFt: number,
): { x: number; z: number } {
  const wall = inferWallFromPlacement(x, z, widthFt, depthFt, rotationY, roomWidthFt, roomDepthFt);
  const o = orientedDimensions(widthFt, depthFt, rotationY);
  return snapWallCabinetAlongWall(
    wall,
    x + o.widthFt / 2,
    z + o.depthFt / 2,
    widthFt,
    depthFt,
    rotationY,
    roomWidthFt,
    roomDepthFt,
  );
}

export function inferWallFromPlacement(
  x: number,
  z: number,
  widthFt: number,
  depthFt: number,
  rotationY: number,
  roomWidthFt: number,
  roomDepthFt: number,
): RoomWallId {
  const o = orientedDimensions(widthFt, depthFt, rotationY);
  const cx = x + o.widthFt / 2;
  const cz = z + o.depthFt / 2;
  if (z < 0.5) return 'back';
  if (z + o.depthFt > roomDepthFt - 0.5) return 'front';
  if (x < 0.5) return 'left';
  if (x + o.widthFt > roomWidthFt - 0.5) return 'right';
  return nearestWall(cx, cz, roomWidthFt, roomDepthFt);
}

function pointInFootprint(
  px: number,
  pz: number,
  x: number,
  z: number,
  w: number,
  d: number,
  tolerance = 0,
): boolean {
  return (
    px >= x - tolerance &&
    px <= x + w + tolerance &&
    pz >= z - tolerance &&
    pz <= z + d + tolerance
  );
}

function getBasePlacements(
  placements: Placement[],
  catalogById: Record<string, CatalogItem>,
): { placement: Placement; item: CatalogItem; widthFt: number; depthFt: number }[] {
  return placements
    .map((p) => {
      const item = catalogById[p.catalogItemId ?? ''];
      if (!item || !isBaseCabinetItem(item)) return null;
      const { widthFt, depthFt } = catalogDimensionsFt(item);
      return { placement: p, item, widthFt, depthFt };
    })
    .filter((b): b is NonNullable<typeof b> => b !== null);
}

function hasCountertopSupportAt(
  x: number,
  z: number,
  widthFt: number,
  depthFt: number,
  rotationY: number,
  placements: Placement[],
  catalogById: Record<string, CatalogItem>,
  excludePlacementId?: string,
): boolean {
  const filtered = excludePlacementId
    ? placements.filter((p) => p.placementId !== excludePlacementId)
    : placements;
  return countertopHasBaseSupport(x, z, widthFt, depthFt, rotationY, filtered, catalogById);
}

export function snapCountertopPosition(
  clickX: number,
  clickZ: number,
  widthFt: number,
  depthFt: number,
  rotationY: number,
  placements: Placement[],
  catalogById: Record<string, CatalogItem>,
  roomWidthFt: number,
  roomDepthFt: number,
  excludePlacementId?: string,
): { x: number; z: number } | null {
  const o = orientedDimensions(widthFt, depthFt, rotationY);
  const bases = getBasePlacements(
    excludePlacementId
      ? placements.filter((p) => p.placementId !== excludePlacementId)
      : placements,
    catalogById,
  );

  if (bases.length === 0) return null;

  const tryCandidate = (x: number, z: number) => {
    const clamped = clampPlacementOrigin(x, z, o.widthFt, o.depthFt, roomWidthFt, roomDepthFt);
    if (
      hasCountertopSupportAt(
        clamped.x,
        clamped.z,
        widthFt,
        depthFt,
        rotationY,
        placements,
        catalogById,
        excludePlacementId,
      )
    ) {
      return clamped;
    }
    return null;
  };

  for (const { placement: p, widthFt: bw, depthFt: bd } of bases) {
    const b = orientedDimensions(bw, bd, p.rotationY);
    if (
      pointInFootprint(
        clickX,
        clickZ,
        p.positionX,
        p.positionZ,
        b.widthFt,
        b.depthFt,
        COUNTERTOP_INSIDE_TOLERANCE_FT,
      )
    ) {
      const aligned = tryCandidate(p.positionX, p.positionZ);
      if (aligned) return aligned;

      const slide = tryCandidate(
        snapToGrid(clickX - o.widthFt / 2, CABINET_GRID_FT),
        snapToGrid(p.positionZ, CABINET_GRID_FT),
      );
      if (slide) return slide;

      const slideZ = tryCandidate(
        snapToGrid(p.positionX, CABINET_GRID_FT),
        snapToGrid(clickZ - o.depthFt / 2, CABINET_GRID_FT),
      );
      if (slideZ) return slideZ;
    }
  }

  const centered = tryCandidate(
    snapToGrid(clickX - o.widthFt / 2, CABINET_GRID_FT),
    snapToGrid(clickZ - o.depthFt / 2, CABINET_GRID_FT),
  );
  if (centered) return centered;

  let bestBase: (typeof bases)[0] | null = null;
  let bestDist = Infinity;
  for (const base of bases) {
    const b = orientedDimensions(base.widthFt, base.depthFt, base.placement.rotationY);
    const cx = base.placement.positionX + b.widthFt / 2;
    const cz = base.placement.positionZ + b.depthFt / 2;
    const dist = Math.hypot(clickX - cx, clickZ - cz);
    if (dist < bestDist) {
      bestDist = dist;
      bestBase = base;
    }
  }

  if (!bestBase || bestDist > COUNTERTOP_SNAP_MAX_FT) return null;

  const p = bestBase.placement;
  const candidates = [
    { x: p.positionX, z: p.positionZ },
    {
      x: snapToGrid(clickX - o.widthFt / 2, CABINET_GRID_FT),
      z: p.positionZ,
    },
    {
      x: p.positionX,
      z: snapToGrid(clickZ - o.depthFt / 2, CABINET_GRID_FT),
    },
  ];

  for (const c of candidates) {
    const result = tryCandidate(c.x, c.z);
    if (result) return result;
  }

  return null;
}

export function clickToPlacementOrigin(
  clickX: number,
  clickZ: number,
  widthFt: number,
  depthFt: number,
  rotationY: number,
): { x: number; z: number } {
  const o = orientedDimensions(widthFt, depthFt, rotationY);
  return {
    x: snapToGrid(clickX - o.widthFt / 2, CABINET_GRID_FT),
    z: snapToGrid(clickZ - o.depthFt / 2, CABINET_GRID_FT),
  };
}

export function applyPlacementSnap(
  clickX: number,
  clickZ: number,
  item: CatalogItem,
  rotationSteps: number,
  placements: Placement[],
  catalogById: Record<string, CatalogItem>,
  roomWidthFt: number,
  roomDepthFt: number,
  wall?: RoomWallId,
  excludePlacementId?: string,
): PlacementSnapResult | null {
  const { widthFt, depthFt } = catalogDimensionsFt(item);
  const rotationY = rotationYFromSteps(rotationSteps);

  if (isCountertopItem(item)) {
    const pos = snapCountertopPosition(
      clickX,
      clickZ,
      widthFt,
      depthFt,
      rotationY,
      placements,
      catalogById,
      roomWidthFt,
      roomDepthFt,
      excludePlacementId,
    );
    return pos ? { ...pos, rotationY } : null;
  }

  if (isWallCabinet(item)) {
    const targetWall = wall ?? nearestWall(clickX, clickZ, roomWidthFt, roomDepthFt);
    const wallRotationY = WALL_BASE_ROTATION[targetWall] + rotationYFromSteps(rotationSteps);
    const pos = snapWallCabinetWithNeighbors({
      clickX,
      clickZ,
      widthFt,
      depthFt,
      rotationY: wallRotationY,
      wall: targetWall,
      roomWidthFt,
      roomDepthFt,
      placements,
      catalogById,
      excludePlacementId,
      placingItem: item,
    });
    return pos ? { ...pos, rotationY: wallRotationY } : null;
  }

  if (isBaseCabinetItem(item)) {
    const pos = snapBaseCabinetPosition({
      clickX,
      clickZ,
      widthFt,
      depthFt,
      rotationY,
      roomWidthFt,
      roomDepthFt,
      placements,
      catalogById,
      excludePlacementId,
      placingItem: item,
    });
    return pos ? { ...pos, rotationY } : null;
  }

  const { x, z } = clickToPlacementOrigin(clickX, clickZ, widthFt, depthFt, rotationY);
  const o = orientedDimensions(widthFt, depthFt, rotationY);

  return {
    ...clampPlacementOrigin(x, z, o.widthFt, o.depthFt, roomWidthFt, roomDepthFt),
    rotationY,
  };
}
