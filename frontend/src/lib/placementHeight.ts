import {
  catalogSectionForItem,
  isShowerItem,
  isToiletItem,
  WALL_CABINET_MOUNT_Y_FT,
} from '@/config/catalogCategories';

export { isShowerItem, isToiletItem };
import type { CatalogItem, Placement } from '@/types';
import {
  boxesOverlap2d,
  buildFootprints,
  catalogDimensionsFt,
  footprintFitsRoom,
  orientedDimensions,
  overlapsAny,
} from '@/components/planner/placementCollision';
import { formatFeetInches, formatInchesValue } from '@/lib/imperialDimensions';

const INCHES_PER_FOOT = 12;

export function isBaseCabinetItem(item: CatalogItem): boolean {
  return catalogSectionForItem(item) === 'base-cabinets';
}

export function isWallCabinetItem(item: CatalogItem): boolean {
  return catalogSectionForItem(item) === 'wall-cabinets';
}

export function isCountertopItem(item: CatalogItem): boolean {
  return catalogSectionForItem(item) === 'countertops';
}

export function cabinetTopYFt(item: CatalogItem, floorY = 0): number {
  return floorY + item.heightIn / INCHES_PER_FOOT;
}

/** Visual / collision height capped to room ceiling for tall fixtures (showers, etc.). */
export function effectiveItemHeightFt(item: CatalogItem, roomHeightFt: number): number {
  const catalogHeightFt = item.heightIn / INCHES_PER_FOOT;
  return Math.min(catalogHeightFt, roomHeightFt);
}

export function placementFailureReason(
  item: CatalogItem,
  x: number,
  z: number,
  rotationY: number,
  placements: Placement[],
  catalogById: Record<string, CatalogItem>,
  room: { widthFt: number; depthFt: number; heightFt: number },
): string | null {
  const { widthFt, depthFt } = catalogDimensionsFt(item);
  const { widthFt: w, depthFt: d } = orientedDimensions(widthFt, depthFt, rotationY);

  if (w > room.widthFt + 1e-6 || d > room.depthFt + 1e-6) {
    return `This item (${formatInches(item.widthIn)}" × ${formatInches(item.depthIn)}") is larger than the room floor (${formatFeet(room.widthFt)} × ${formatFeet(room.depthFt)}). Widen or deepen the room first.`;
  }

  if (
    !footprintFitsRoom(x, z, widthFt, depthFt, rotationY, room.widthFt, room.depthFt)
  ) {
    return 'Not enough clear floor space here. Try another spot or rotate the item.';
  }

  const footprints = buildFootprints(placements, catalogById);
  if (
    overlapsAny(x, z, widthFt, depthFt, rotationY, footprints, undefined, item, catalogById)
  ) {
    return 'Overlaps another item. Move it or pick a different spot.';
  }

  if (isCountertopItem(item)) {
    if (
      !countertopHasBaseSupport(x, z, widthFt, depthFt, rotationY, placements, catalogById)
    ) {
      return 'Countertops must sit on base cabinets.';
    }
  }

  if (resolvePlacementY(item, x, z, rotationY, placements, catalogById) === null) {
    return 'Cannot place this item here.';
  }

  return null;
}

function formatInches(inches: number): string {
  return formatInchesValue(inches);
}

function formatFeet(feet: number): string {
  return formatFeetInches(feet);
}

/** True if countertop footprint overlaps at least one base cabinet on XZ. */
export function countertopHasBaseSupport(
  x: number,
  z: number,
  widthFt: number,
  depthFt: number,
  rotationY: number,
  placements: Placement[],
  catalogById: Record<string, CatalogItem>,
): boolean {
  const c = orientedDimensions(widthFt, depthFt, rotationY);
  for (const p of placements) {
    if (p.customItem) continue;
    const item = p.catalogItemId ? catalogById[p.catalogItemId] : undefined;
    if (!item || !isBaseCabinetItem(item)) continue;
    const { widthFt: bw, depthFt: bd } = catalogDimensionsFt(item);
    const b = orientedDimensions(bw, bd, p.rotationY);
    if (boxesOverlap2d(x, z, c.widthFt, c.depthFt, p.positionX, p.positionZ, b.widthFt, b.depthFt)) {
      return true;
    }
  }
  return false;
}

/** Place countertop on top of overlapping base cabinets (tallest top wins). */
export function countertopSurfaceYFt(
  x: number,
  z: number,
  widthFt: number,
  depthFt: number,
  rotationY: number,
  placements: Placement[],
  catalogById: Record<string, CatalogItem>,
): number | null {
  const c = orientedDimensions(widthFt, depthFt, rotationY);
  let topY: number | null = null;

  for (const p of placements) {
    if (p.customItem) continue;
    const item = p.catalogItemId ? catalogById[p.catalogItemId] : undefined;
    if (!item || !isBaseCabinetItem(item)) continue;
    const { widthFt: bw, depthFt: bd } = catalogDimensionsFt(item);
    const b = orientedDimensions(bw, bd, p.rotationY);
    if (!boxesOverlap2d(x, z, c.widthFt, c.depthFt, p.positionX, p.positionZ, b.widthFt, b.depthFt)) {
      continue;
    }
    const surface = cabinetTopYFt(item, p.positionY);
    topY = topY === null ? surface : Math.max(topY, surface);
  }

  return topY;
}

export function resolvePlacementY(
  item: CatalogItem,
  x: number,
  z: number,
  rotationY: number,
  placements: Placement[],
  catalogById: Record<string, CatalogItem>,
): number | null {
  const section = catalogSectionForItem(item);

  if (section === 'wall-cabinets') {
    return WALL_CABINET_MOUNT_Y_FT;
  }

  if (section === 'countertops') {
    const { widthFt, depthFt } = catalogDimensionsFt(item);
    return countertopSurfaceYFt(x, z, widthFt, depthFt, rotationY, placements, catalogById);
  }

  if (
    section === 'vanities' ||
    section === 'base-cabinets' ||
    section === 'toilets' ||
    section === 'showers'
  ) {
    return 0;
  }

  return 0;
}

export function canPlaceItemAt(
  item: CatalogItem,
  x: number,
  z: number,
  rotationY: number,
  placements: Placement[],
  catalogById: Record<string, CatalogItem>,
  room?: { widthFt: number; depthFt: number; heightFt: number },
): boolean {
  const { widthFt, depthFt } = catalogDimensionsFt(item);
  const footprints = buildFootprints(placements, catalogById);
  if (room && !footprintFitsRoom(x, z, widthFt, depthFt, rotationY, room.widthFt, room.depthFt)) {
    return false;
  }
  if (
    overlapsAny(x, z, widthFt, depthFt, rotationY, footprints, undefined, item, catalogById)
  ) {
    return false;
  }
  if (isCountertopItem(item)) {
    return countertopHasBaseSupport(x, z, widthFt, depthFt, rotationY, placements, catalogById);
  }
  return resolvePlacementY(item, x, z, rotationY, placements, catalogById) !== null;
}
