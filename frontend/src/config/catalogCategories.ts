import type { CatalogItem } from '@/types';

export type CatalogSectionId =
  | 'base-cabinets'
  | 'wall-cabinets'
  | 'countertops'
  | 'vanities'
  | 'toilets'
  | 'showers'
  | 'other';

export const CATALOG_SECTIONS: {
  id: CatalogSectionId;
  title: string;
  description: string;
}[] = [
  {
    id: 'base-cabinets',
    title: 'Base cabinets (floor)',
    description: 'Sit on the floor — toe-kick height',
  },
  {
    id: 'wall-cabinets',
    title: 'Wall cabinets',
    description: 'Upper cabinets — mounted on the wall',
  },
  {
    id: 'countertops',
    title: 'Countertops',
    description: 'Runs on top of base cabinets',
  },
  {
    id: 'vanities',
    title: 'Vanities',
    description: 'Bathroom base storage',
  },
  {
    id: 'toilets',
    title: 'Toilets',
    description: 'Floor-mounted toilets',
  },
  {
    id: 'showers',
    title: 'Showers & tubs',
    description: 'Tubs, combos, and walk-in showers',
  },
  {
    id: 'other',
    title: 'Other',
    description: 'Miscellaneous catalog items',
  },
];

/** Unified catalog chrome — sage accent, not per-section rainbow */
export const SECTION_UI = {
  header: 'catalog-section-header',
  border: 'border-stone-200',
  active: 'catalog-item-active',
  badge: 'bg-stone-100 text-stone-600',
} as const;

export function isToiletItem(item: CatalogItem): boolean {
  return item.category === 'toilet';
}

export function isShowerItem(item: CatalogItem): boolean {
  return item.category === 'shower';
}

export function catalogSectionForItem(item: CatalogItem): CatalogSectionId {
  if (item.category === 'countertop') return 'countertops';
  if (item.category === 'toilet') return 'toilets';
  if (item.category === 'shower') return 'showers';
  if (item.category === 'vanity') return 'vanities';
  if (item.subcategory === 'wall' || item.category === 'wall-cabinet') return 'wall-cabinets';
  if (item.subcategory === 'base' || item.category === 'base-cabinet') return 'base-cabinets';
  if (item.category === 'cabinet' && item.subcategory === 'wall') return 'wall-cabinets';
  if (item.category === 'cabinet' && item.subcategory === 'base') return 'base-cabinets';
  return 'other';
}

/** Standard mount height for wall cabinet bottom edge (feet). */
export const WALL_CABINET_MOUNT_Y_FT = 4.5;

export function defaultPlacementY(item: CatalogItem): number {
  const section = catalogSectionForItem(item);
  if (section === 'wall-cabinets') return WALL_CABINET_MOUNT_Y_FT;
  return 0;
}

export function isWallCabinet(item: CatalogItem): boolean {
  return catalogSectionForItem(item) === 'wall-cabinets';
}
