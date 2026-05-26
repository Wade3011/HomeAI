import type { CatalogItem } from '@/types';
import { catalogSectionForItem, isShowerItem, isToiletItem } from '@/config/catalogCategories';

/** Cohesive 3D palette — warm wood cabinets, soft fixtures, sage selection. */
export function meshColor(item: CatalogItem, selected: boolean): string {
  if (selected) return '#5c7a6a';
  if (isToiletItem(item)) return '#f5f3f0';
  if (isShowerItem(item)) return '#c5d4dc';
  const section = catalogSectionForItem(item);
  switch (section) {
    case 'wall-cabinets':
      return '#9fb3c8';
    case 'countertops':
      return '#d6d0c4';
    case 'vanities':
      return '#b8a99a';
    case 'toilets':
      return '#f5f3f0';
    case 'showers':
      return '#c5d4dc';
    default:
      return '#c4b5a0';
  }
}

/** Custom furniture blocks — warm neutral tones */
export function customMeshColor(selected: boolean): string {
  return selected ? '#5c7a6a' : '#a8a29e';
}

export function meshColorForResolved(
  resolved: { isCustom: boolean; catalogItem?: CatalogItem },
  selected: boolean,
): string {
  if (resolved.isCustom) return customMeshColor(selected);
  if (!resolved.catalogItem) return '#c4b5a0';
  return meshColor(resolved.catalogItem, selected);
}

export function meshEmissive(selected: boolean): { color: string; intensity: number } {
  if (selected) return { color: '#3d5348', intensity: 0.14 };
  return { color: '#000000', intensity: 0 };
}
