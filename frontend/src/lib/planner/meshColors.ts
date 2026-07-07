import type { CatalogItem } from '@/types';
import { catalogSectionForItem, isShowerItem, isToiletItem } from '@/config/catalogCategories';

/** Cohesive 3D palette — warm wood cabinets, soft fixtures, sage selection. */
export function meshColor(item: CatalogItem, selected: boolean): string {
  if (selected) return '#5c7a6a';
  if (isToiletItem(item)) return '#f2eee8';
  if (isShowerItem(item)) return '#b8ccd6';
  const section = catalogSectionForItem(item);
  switch (section) {
    case 'wall-cabinets':
      return '#a8bcc8';
    case 'countertops':
      return '#c8c0b4';
    case 'appliances':
      return '#aeb4bc';
    case 'vanities':
      return '#b0a090';
    case 'toilets':
      return '#f2eee8';
    case 'showers':
      return '#b8ccd6';
    default:
      return '#b8a88e';
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
