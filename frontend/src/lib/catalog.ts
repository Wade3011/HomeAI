import type { CatalogFile, CatalogItem } from '@/types';
import type { CatalogSectionId } from '@/config/catalogCategories';
import { catalogSectionForItem } from '@/config/catalogCategories';
import catalogData from '@/data/catalog.json';

const catalog = catalogData as CatalogFile;

/** Full catalog document (future: fetch from S3, same JSON shape). */
export function getCatalogFile(): CatalogFile {
  return catalog;
}

export function getCatalogItems(): CatalogItem[] {
  return catalog.items;
}

export function getCatalogItem(itemId: string): CatalogItem | undefined {
  return catalog.items.find((i) => i.itemId === itemId);
}

/** Distinct brand names for items in a catalog section, sorted A–Z. */
export function getBrandsForSection(
  sectionId: CatalogSectionId,
  items: CatalogItem[] = catalog.items,
): string[] {
  const brands = new Set<string>();
  for (const item of items) {
    if (catalogSectionForItem(item) === sectionId && item.brand) {
      brands.add(item.brand);
    }
  }
  return Array.from(brands).sort((a, b) => a.localeCompare(b));
}

export function filterItemsByBrand(
  items: CatalogItem[],
  brand: string | null,
): CatalogItem[] {
  if (!brand) return items;
  return items.filter((i) => i.brand === brand);
}
