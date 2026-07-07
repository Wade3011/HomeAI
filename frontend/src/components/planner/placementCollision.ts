import type { CatalogItem, Placement } from '@/types';
import { resolvePlacementItem } from '@/lib/placementItem';
import {
  isBaseCabinetItem,
  isCountertopItem,
  isShowerItem,
  isToiletItem,
  isWallCabinetItem,
} from '@/lib/placementHeight';
import { countertopHasBaseSupport } from '@/lib/placementHeight';
import { CABINET_GRID_FT, clampPlacementOrigin, snapToGrid } from '@/components/planner/plannerUtils';

const INCHES_PER_FOOT = 12;

export interface PlacementFootprint {
  placementId: string;
  catalogItemId?: string;
  isCustom: boolean;
  x: number;
  z: number;
  widthFt: number;
  depthFt: number;
  rotationY: number;
}

export function catalogDimensionsFt(item: CatalogItem): { widthFt: number; depthFt: number } {
  return {
    widthFt: item.widthIn / INCHES_PER_FOOT,
    depthFt: item.depthIn / INCHES_PER_FOOT,
  };
}

/** Footprint on XZ plane after 90° rotation steps. */
export function orientedDimensions(
  widthFt: number,
  depthFt: number,
  rotationY: number,
): { widthFt: number; depthFt: number } {
  const quarterTurns = Math.round(rotationY / (Math.PI / 2));
  const swap = Math.abs(quarterTurns % 2) === 1;
  return swap
    ? { widthFt: depthFt, depthFt: widthFt }
    : { widthFt, depthFt };
}

/** Keep footprint center fixed when rotating 90° steps. */
export function placementOriginAfterRotation(
  positionX: number,
  positionZ: number,
  widthFt: number,
  depthFt: number,
  oldRotationY: number,
  newRotationY: number,
): { positionX: number; positionZ: number } {
  const oldO = orientedDimensions(widthFt, depthFt, oldRotationY);
  const newO = orientedDimensions(widthFt, depthFt, newRotationY);
  const centerX = positionX + oldO.widthFt / 2;
  const centerZ = positionZ + oldO.depthFt / 2;
  return {
    positionX: centerX - newO.widthFt / 2,
    positionZ: centerZ - newO.depthFt / 2,
  };
}

export function boxesOverlap2d(
  ax: number,
  az: number,
  aw: number,
  ad: number,
  bx: number,
  bz: number,
  bw: number,
  bd: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && az < bz + bd && az + ad > bz;
}

/** True when the oriented footprint fits entirely inside the room floor. */
export function footprintFitsRoom(
  x: number,
  z: number,
  widthFt: number,
  depthFt: number,
  rotationY: number,
  roomWidthFt: number,
  roomDepthFt: number,
): boolean {
  const { widthFt: w, depthFt: d } = orientedDimensions(widthFt, depthFt, rotationY);
  if (w > roomWidthFt + 1e-6 || d > roomDepthFt + 1e-6) return false;
  const c = clampPlacementOrigin(x, z, w, d, roomWidthFt, roomDepthFt);
  return (
    c.x >= -1e-6 &&
    c.z >= -1e-6 &&
    c.x + w <= roomWidthFt + 1e-6 &&
    c.z + d <= roomDepthFt + 1e-6
  );
}

function shouldCollide(
  placingItem: CatalogItem | undefined,
  otherItem: CatalogItem | undefined,
): boolean {
  if (!placingItem || !otherItem) return true;
  if (isCountertopItem(placingItem) && isBaseCabinetItem(otherItem)) return false;
  if (isBaseCabinetItem(placingItem) && isCountertopItem(otherItem)) return false;
  if (isWallCabinetItem(placingItem) && isBaseCabinetItem(otherItem)) return false;
  if (isBaseCabinetItem(placingItem) && isWallCabinetItem(otherItem)) return false;
  if (isWallCabinetItem(placingItem) && isCountertopItem(otherItem)) return false;
  if (isCountertopItem(placingItem) && isWallCabinetItem(otherItem)) return false;
  if (isWallCabinetItem(placingItem) && (isToiletItem(otherItem) || isShowerItem(otherItem))) {
    return false;
  }
  if ((isToiletItem(placingItem) || isShowerItem(placingItem)) && isWallCabinetItem(otherItem)) {
    return false;
  }
  return true;
}

export function overlapsAny(
  x: number,
  z: number,
  widthFt: number,
  depthFt: number,
  rotationY: number,
  others: PlacementFootprint[],
  excludePlacementId?: string,
  placingItem?: CatalogItem,
  catalogById?: Record<string, CatalogItem>,
): boolean {
  const { widthFt: w, depthFt: d } = orientedDimensions(widthFt, depthFt, rotationY);
  for (const other of others) {
    if (other.placementId === excludePlacementId) continue;
    const otherItem = other.isCustom
      ? undefined
      : other.catalogItemId
        ? catalogById?.[other.catalogItemId]
        : undefined;
    if (!shouldCollide(placingItem, otherItem)) continue;

    const o = orientedDimensions(other.widthFt, other.depthFt, other.rotationY);
    if (boxesOverlap2d(x, z, w, d, other.x, other.z, o.widthFt, o.depthFt)) {
      return true;
    }
  }
  return false;
}

export function buildFootprints(
  placements: Placement[],
  catalogById: Record<string, CatalogItem>,
): PlacementFootprint[] {
  const out: PlacementFootprint[] = [];
  for (const p of placements) {
    const resolved = resolvePlacementItem(p, catalogById);
    if (!resolved) continue;
    out.push({
      placementId: p.placementId,
      catalogItemId: p.catalogItemId,
      isCustom: resolved.isCustom,
      x: p.positionX,
      z: p.positionZ,
      widthFt: resolved.widthFt,
      depthFt: resolved.depthFt,
      rotationY: p.rotationY,
    });
  }
  return out;
}

export function resolvePlacementPosition({
  x,
  z,
  widthFt,
  depthFt,
  rotationY,
  roomWidthFt,
  roomDepthFt,
  footprints,
  excludePlacementId,
  placingItem,
  catalogById,
  fallbackX,
  fallbackZ,
  gridFt = CABINET_GRID_FT,
  nudgeFt = 0,
}: {
  x: number;
  z: number;
  widthFt: number;
  depthFt: number;
  rotationY: number;
  roomWidthFt: number;
  roomDepthFt: number;
  footprints: PlacementFootprint[];
  excludePlacementId?: string;
  placingItem?: CatalogItem;
  catalogById?: Record<string, CatalogItem>;
  /** Last valid position while dragging — held when new position overlaps */
  fallbackX?: number;
  fallbackZ?: number;
  /** Snap grid in feet. Defaults to coarse 6" placement grid. */
  gridFt?: number;
  /** If > 0, search outward in `gridFt` steps up to this distance for a valid spot. */
  nudgeFt?: number;
}): { x: number; z: number } | null {
  const oriented = orientedDimensions(widthFt, depthFt, rotationY);

  const tryAt = (px: number, pz: number): { x: number; z: number } | null => {
    const c = clampPlacementOrigin(
      snapToGrid(px, gridFt),
      snapToGrid(pz, gridFt),
      oriented.widthFt,
      oriented.depthFt,
      roomWidthFt,
      roomDepthFt,
    );
    if (
      !footprintFitsRoom(
        c.x,
        c.z,
        widthFt,
        depthFt,
        rotationY,
        roomWidthFt,
        roomDepthFt,
      )
    ) {
      return null;
    }
    if (
      !overlapsAny(
        c.x,
        c.z,
        widthFt,
        depthFt,
        rotationY,
        footprints,
        excludePlacementId,
        placingItem,
        catalogById,
      )
    ) {
      return c;
    }
    return null;
  };

  const first = tryAt(x, z);
  if (first) return first;

  if (nudgeFt > 0) {
    const nudged = nudgeSearch(x, z, nudgeFt, gridFt, tryAt);
    if (nudged) return nudged;
  }

  if (fallbackX !== undefined && fallbackZ !== undefined) {
    const fb = tryAt(fallbackX, fallbackZ);
    if (fb) return fb;
  }

  return null;
}

/** Spiral outward in grid-aligned steps, looking for the nearest non-overlapping spot. */
function nudgeSearch(
  x: number,
  z: number,
  maxNudgeFt: number,
  gridFt: number,
  tryAt: (px: number, pz: number) => { x: number; z: number } | null,
): { x: number; z: number } | null {
  const maxRings = Math.max(1, Math.round(maxNudgeFt / gridFt));
  for (let ring = 1; ring <= maxRings; ring++) {
    const d = ring * gridFt;
    const candidates: [number, number][] = [
      [x + d, z],
      [x - d, z],
      [x, z + d],
      [x, z - d],
      [x + d, z + d],
      [x + d, z - d],
      [x - d, z + d],
      [x - d, z - d],
    ];
    for (const [cx, cz] of candidates) {
      const result = tryAt(cx, cz);
      if (result) return result;
    }
  }
  return null;
}

/** Countertop placement: must sit on bases; only blocks other countertops. */
export function resolveCountertopPosition({
  x,
  z,
  widthFt,
  depthFt,
  rotationY,
  roomWidthFt,
  roomDepthFt,
  footprints,
  catalogById,
  placingItem,
  excludePlacementId,
  fallbackX,
  fallbackZ,
  gridFt = CABINET_GRID_FT,
  nudgeFt = 0,
}: {
  x: number;
  z: number;
  widthFt: number;
  depthFt: number;
  rotationY: number;
  roomWidthFt: number;
  roomDepthFt: number;
  footprints: PlacementFootprint[];
  catalogById: Record<string, CatalogItem>;
  placingItem: CatalogItem;
  excludePlacementId?: string;
  fallbackX?: number;
  fallbackZ?: number;
  gridFt?: number;
  nudgeFt?: number;
}): { x: number; z: number } | null {
  const oriented = orientedDimensions(widthFt, depthFt, rotationY);

  const tryAt = (px: number, pz: number): { x: number; z: number } | null => {
    const c = clampPlacementOrigin(
      snapToGrid(px, gridFt),
      snapToGrid(pz, gridFt),
      oriented.widthFt,
      oriented.depthFt,
      roomWidthFt,
      roomDepthFt,
    );
    if (
      !countertopHasBaseSupportFromFootprints(
        c.x,
        c.z,
        widthFt,
        depthFt,
        rotationY,
        footprints,
        catalogById,
        excludePlacementId,
      )
    ) {
      return null;
    }
    if (
      overlapsAny(
        c.x,
        c.z,
        widthFt,
        depthFt,
        rotationY,
        footprints,
        excludePlacementId,
        placingItem,
        catalogById,
      )
    ) {
      return null;
    }
    return c;
  };

  const first = tryAt(x, z);
  if (first) return first;

  if (nudgeFt > 0) {
    const maxRings = Math.max(1, Math.round(nudgeFt / gridFt));
    for (let ring = 1; ring <= maxRings; ring++) {
      const d = ring * gridFt;
      const candidates: [number, number][] = [
        [x + d, z],
        [x - d, z],
        [x, z + d],
        [x, z - d],
        [x + d, z + d],
        [x + d, z - d],
        [x - d, z + d],
        [x - d, z - d],
      ];
      for (const [cx, cz] of candidates) {
        const result = tryAt(cx, cz);
        if (result) return result;
      }
    }
  }

  if (fallbackX !== undefined && fallbackZ !== undefined) {
    const fb = tryAt(fallbackX, fallbackZ);
    if (fb) return fb;
  }

  return null;
}

function countertopHasBaseSupportFromFootprints(
  x: number,
  z: number,
  widthFt: number,
  depthFt: number,
  rotationY: number,
  footprints: PlacementFootprint[],
  catalogById: Record<string, CatalogItem>,
  excludePlacementId?: string,
): boolean {
  const placements = footprints
    .filter((f) => f.placementId !== excludePlacementId)
    .map((f) => ({
      placementId: f.placementId,
      roomId: '',
      catalogItemId: f.catalogItemId,
      positionX: f.x,
      positionY: 0,
      positionZ: f.z,
      rotationY: f.rotationY,
    }));
  return countertopHasBaseSupport(x, z, widthFt, depthFt, rotationY, placements, catalogById);
}
