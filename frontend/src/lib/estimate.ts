import type { CatalogItem, Placement } from '@/types';

export interface EstimateBreakdown {
  baseCabinets: number;
  wallCabinets: number;
  countertops: number;
  vanities: number;
  other: number;
}

export interface PlacementEstimate {
  total: number;
  itemCount: number;
  breakdown: EstimateBreakdown;
  lineItems: { placementId: string; name: string; price: number; group: string }[];
}

export function catalogGroupLabel(item: CatalogItem): keyof EstimateBreakdown | 'other' {
  if (item.category === 'countertop') return 'countertops';
  if (item.category === 'vanity') return 'vanities';
  if (item.subcategory === 'wall' || item.category === 'wall-cabinet') return 'wallCabinets';
  if (item.subcategory === 'base' || item.category === 'base-cabinet') return 'baseCabinets';
  if (item.category === 'cabinet' && item.subcategory === 'base') return 'baseCabinets';
  if (item.category === 'cabinet' && item.subcategory === 'wall') return 'wallCabinets';
  return 'other';
}

/** Sum list prices for every placement currently on the canvas. */
export function computePlacementEstimate(
  placements: Placement[],
  catalogById: Record<string, CatalogItem>,
): PlacementEstimate {
  const breakdown: EstimateBreakdown = {
    baseCabinets: 0,
    wallCabinets: 0,
    countertops: 0,
    vanities: 0,
    other: 0,
  };

  let total = 0;
  const lineItems: PlacementEstimate['lineItems'] = [];

  for (const p of placements) {
    const item = catalogById[p.catalogItemId];
    if (!item) continue;
    const price = item.listPrice;
    total += price;
    const group = catalogGroupLabel(item);
    breakdown[group] += price;
    lineItems.push({
      placementId: p.placementId,
      name: item.name,
      price,
      group,
    });
  }

  return { total, itemCount: lineItems.length, breakdown, lineItems };
}
