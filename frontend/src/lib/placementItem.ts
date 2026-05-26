import type { CatalogItem, CustomItemSpec, Placement } from '@/types';

const INCHES_PER_FOOT = 12;

export interface ResolvedPlacementItem {
  isCustom: boolean;
  isCatalog: boolean;
  label: string;
  shape: CustomItemSpec['shape'];
  widthIn: number;
  depthIn: number;
  heightIn: number;
  widthFt: number;
  depthFt: number;
  heightFt: number;
  catalogItem?: CatalogItem;
  /** Custom blocks are always floor-mounted */
  floorMounted: boolean;
}

export function isCustomPlacement(placement: Placement): boolean {
  return !!placement.customItem;
}

export function isCatalogPlacement(placement: Placement): boolean {
  return !placement.customItem && !!placement.catalogItemId;
}

export function resolvePlacementItem(
  placement: Placement,
  catalogById: Record<string, CatalogItem>,
): ResolvedPlacementItem | null {
  if (placement.customItem) {
    const c = placement.customItem;
    return {
      isCustom: true,
      isCatalog: false,
      label: c.label,
      shape: c.shape,
      widthIn: c.widthIn,
      depthIn: c.depthIn,
      heightIn: c.heightIn,
      widthFt: c.widthIn / INCHES_PER_FOOT,
      depthFt: c.depthIn / INCHES_PER_FOOT,
      heightFt: c.heightIn / INCHES_PER_FOOT,
      floorMounted: true,
    };
  }

  const item = placement.catalogItemId
    ? catalogById[placement.catalogItemId]
    : undefined;
  if (!item) return null;

  return {
    isCustom: false,
    isCatalog: true,
    label: item.name,
    shape: 'box',
    widthIn: item.widthIn,
    depthIn: item.depthIn,
    heightIn: item.heightIn,
    widthFt: item.widthIn / INCHES_PER_FOOT,
    depthFt: item.depthIn / INCHES_PER_FOOT,
    heightFt: item.heightIn / INCHES_PER_FOOT,
    catalogItem: item,
    floorMounted: false,
  };
}

export function dimensionsFtFromPlacement(
  placement: Placement,
  catalogById: Record<string, CatalogItem>,
): { widthFt: number; depthFt: number; heightFt: number } | null {
  const resolved = resolvePlacementItem(placement, catalogById);
  if (!resolved) return null;
  return {
    widthFt: resolved.widthFt,
    depthFt: resolved.depthFt,
    heightFt: resolved.heightFt,
  };
}
