import type { CatalogItem, Placement } from '@/types';
import {
  isBaseCabinetItem,
  isCountertopItem,
  isWallCabinetItem,
} from '@/lib/placementHeight';
import { countertopHasBaseSupport } from '@/lib/placementHeight';
import { CABINET_GRID_FT, clampPlacementOrigin, snapToGrid } from '@/components/planner/plannerUtils';

const INCHES_PER_FOOT = 12;

export interface PlacementFootprint {
  placementId: string;
  catalogItemId: string;
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
    const otherItem = catalogById?.[other.catalogItemId];
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
  return placements
    .map((p) => {
      const item = catalogById[p.catalogItemId];
      if (!item) return null;
      const { widthFt, depthFt } = catalogDimensionsFt(item);
      return {
        placementId: p.placementId,
        catalogItemId: p.catalogItemId,
        x: p.positionX,
        z: p.positionZ,
        widthFt,
        depthFt,
        rotationY: p.rotationY,
      };
    })
    .filter((f): f is PlacementFootprint => f !== null);
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
}): { x: number; z: number } | null {
  const oriented = orientedDimensions(widthFt, depthFt, rotationY);
  const snapped = {
    x: snapToGrid(x),
    z: snapToGrid(z),
  };
  const clamped = clampPlacementOrigin(
    snapped.x,
    snapped.z,
    oriented.widthFt,
    oriented.depthFt,
    roomWidthFt,
    roomDepthFt,
  );

  if (
    !overlapsAny(
      clamped.x,
      clamped.z,
      widthFt,
      depthFt,
      rotationY,
      footprints,
      excludePlacementId,
      placingItem,
      catalogById,
    )
  ) {
    return clamped;
  }

  if (fallbackX !== undefined && fallbackZ !== undefined) {
    const fb = clampPlacementOrigin(
      fallbackX,
      fallbackZ,
      oriented.widthFt,
      oriented.depthFt,
      roomWidthFt,
      roomDepthFt,
    );
    if (
      !overlapsAny(
        fb.x,
        fb.z,
        widthFt,
        depthFt,
        rotationY,
        footprints,
        excludePlacementId,
        placingItem,
        catalogById,
      )
    ) {
      return fb;
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
}): { x: number; z: number } | null {
  const oriented = orientedDimensions(widthFt, depthFt, rotationY);
  const clamped = clampPlacementOrigin(
    snapToGrid(x, CABINET_GRID_FT),
    snapToGrid(z, CABINET_GRID_FT),
    oriented.widthFt,
    oriented.depthFt,
    roomWidthFt,
    roomDepthFt,
  );

  const checkValid = (px: number, pz: number) => {
    if (
      !countertopHasBaseSupportFromFootprints(
        px,
        pz,
        widthFt,
        depthFt,
        rotationY,
        footprints,
        catalogById,
        excludePlacementId,
      )
    ) {
      return false;
    }
    return !overlapsAny(
      px,
      pz,
      widthFt,
      depthFt,
      rotationY,
      footprints,
      excludePlacementId,
      placingItem,
      catalogById,
    );
  };

  if (checkValid(clamped.x, clamped.z)) return clamped;

  if (fallbackX !== undefined && fallbackZ !== undefined) {
    const fb = clampPlacementOrigin(
      fallbackX,
      fallbackZ,
      oriented.widthFt,
      oriented.depthFt,
      roomWidthFt,
      roomDepthFt,
    );
    if (checkValid(fb.x, fb.z)) return fb;
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
