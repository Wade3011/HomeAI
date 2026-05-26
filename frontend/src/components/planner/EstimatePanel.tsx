'use client';

import { getCatalogFile } from '@/lib/catalog';
import type { PlacementEstimate } from '@/lib/estimate';

const ROWS: { key: keyof PlacementEstimate['breakdown']; label: string }[] = [
  { key: 'baseCabinets', label: 'Base (floor)' },
  { key: 'wallCabinets', label: 'Wall' },
  { key: 'countertops', label: 'Countertops' },
  { key: 'vanities', label: 'Vanities' },
  { key: 'toilets', label: 'Toilets' },
  { key: 'showers', label: 'Showers & tubs' },
  { key: 'other', label: 'Other' },
];

export function EstimatePanel({ estimate }: { estimate: PlacementEstimate }) {
  const { priceDisclaimer, priceCalibratedAt } = getCatalogFile();

  return (
    <div className="p-4">
      <p className="text-2xl font-bold text-[var(--sage-800)]">
        ${estimate.total.toLocaleString()}
      </p>
      <p className="text-xs font-medium text-stone-500">
        Kitchen &amp; bath catalog pricing · {estimate.itemCount} priced item
        {estimate.itemCount === 1 ? '' : 's'}
      </p>
      {priceCalibratedAt && (
        <p className="mt-2 rounded-lg bg-stone-100 px-2 py-1.5 text-[10px] leading-snug text-stone-500">
          Prices as of {priceCalibratedAt}. {priceDisclaimer}
        </p>
      )}

      <ul className="mt-4 space-y-1.5 border-t border-stone-100 pt-3">
        {ROWS.map(({ key, label }) => {
          const amount = estimate.breakdown[key];
          if (amount <= 0) return null;
          return (
            <li key={key} className="flex justify-between text-xs">
              <span className="text-stone-600">{label}</span>
              <span className="font-medium text-stone-800">${amount.toLocaleString()}</span>
            </li>
          );
        })}
      </ul>

      {estimate.lineItems.length > 0 && (
        <ul className="mt-4 max-h-40 space-y-1 overflow-y-auto border-t border-stone-100 pt-3">
          {estimate.lineItems.map((line) => (
            <li key={line.placementId} className="flex justify-between gap-2 text-[11px]">
              <span className="truncate text-stone-500">{line.name}</span>
              <span className="shrink-0 font-medium text-stone-700">${line.price}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
