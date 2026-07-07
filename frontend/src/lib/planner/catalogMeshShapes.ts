import type { CatalogItem } from '@/types';

export type CatalogMeshProfile =
  | 'default-box'
  | 'base-cabinet'
  | 'wall-cabinet'
  | 'cabinet-corner'
  | 'cabinet-sink'
  | 'cabinet-drawer'
  | 'cabinet-pantry'
  | 'countertop'
  | 'toilet-two-piece'
  | 'toilet-one-piece'
  | 'vanity'
  | 'shower-tub'
  | 'shower-combo'
  | 'shower-walk-in'
  | 'shower-base'
  | 'shower-enclosure'
  | 'appliance-dishwasher'
  | 'appliance-oven'
  | 'appliance-range'
  | 'appliance-range-microwave';

export function catalogMeshProfile(item: CatalogItem): CatalogMeshProfile {
  if (item.category === 'toilet') {
    return item.subcategory === 'one-piece' ? 'toilet-one-piece' : 'toilet-two-piece';
  }
  if (item.category === 'shower') {
    switch (item.subcategory) {
      case 'tub':
        return 'shower-tub';
      case 'combo':
        return 'shower-combo';
      case 'walk-in':
        return 'shower-walk-in';
      case 'base':
        return 'shower-base';
      case 'enclosure':
        return 'shower-enclosure';
      default:
        return 'shower-combo';
    }
  }
  if (item.category === 'appliance') {
    if (item.subcategory === 'dishwasher') return 'appliance-dishwasher';
    if (item.subcategory === 'oven') return 'appliance-oven';
    if (item.subcategory === 'range-microwave') return 'appliance-range-microwave';
    if (item.subcategory === 'range') return 'appliance-range';
    return 'appliance-oven';
  }
  if (item.category === 'countertop') return 'countertop';
  if (item.category === 'vanity') return 'vanity';
  if (item.category === 'cabinet') {
    if (item.itemId.includes('-corner')) return 'cabinet-corner';
    if (item.itemId.includes('-sink-')) return 'cabinet-sink';
    if (item.itemId.includes('-drawer-')) return 'cabinet-drawer';
    if (item.itemId.includes('-pantry-')) return 'cabinet-pantry';
    if (item.subcategory === 'wall') return 'wall-cabinet';
    return 'base-cabinet';
  }
  return 'default-box';
}

/** Y center for a part whose bottom sits `bottomFt` above the floor. */
export function yCenterFromFloor(bottomFt: number, partHeightFt: number, totalHeightFt: number): number {
  return -totalHeightFt / 2 + bottomFt + partHeightFt / 2;
}

/** Z center for a part aligned to the back (-Z) edge. */
export function zCenterFromBack(partDepthFt: number, totalDepthFt: number): number {
  return -totalDepthFt / 2 + partDepthFt / 2;
}

/** Z center for a part aligned to the front (+Z) edge. */
export function zCenterFromFront(partDepthFt: number, totalDepthFt: number): number {
  return totalDepthFt / 2 - partDepthFt / 2;
}

export const TOE_KICK_FT = 4 / 12;
export const COUNTERTOP_SLAB_FT = 1.25 / 12;
export const CABINET_FACE_RECESS_FT = 0.75 / 12;
