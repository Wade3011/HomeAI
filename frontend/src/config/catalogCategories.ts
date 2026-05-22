import type { CatalogItem } from '@/types';

export type CatalogSectionId =
  | 'base-cabinets'
  | 'wall-cabinets'
  | 'countertops'
  | 'vanities'
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
];

export function catalogSectionForItem(item: CatalogItem): CatalogSectionId {
  if (item.category === 'countertop') return 'countertops';
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
