'use client';

import type { PlacementEstimate } from '@/lib/estimate';

const ROWS: { key: keyof PlacementEstimate['breakdown']; label: string }[] = [
  { key: 'baseCabinets', label: 'Base (floor)' },
  { key: 'wallCabinets', label: 'Wall' },
  { key: 'countertops', label: 'Countertops' },
  { key: 'vanities', label: 'Vanities' },
  { key: 'other', label: 'Other' },
];

export function EstimatePanel({ estimate }: { estimate: PlacementEstimate }) {
  return (
    <div className="p-4">
      <p className="text-2xl font-semibold text-zinc-900">
        ${estimate.total.toLocaleString()}
      </p>
      <p className="text-xs text-zinc-500">
        {estimate.itemCount} item{estimate.itemCount === 1 ? '' : 's'} on layout
      </p>

      <ul className="mt-4 space-y-1.5 border-t border-zinc-100 pt-3">
        {ROWS.map(({ key, label }) => {
          const amount = estimate.breakdown[key];
          if (amount <= 0) return null;
          return (
            <li key={key} className="flex justify-between text-xs">
              <span className="text-zinc-600">{label}</span>
              <span className="font-medium text-zinc-800">${amount.toLocaleString()}</span>
            </li>
          );
        })}
      </ul>

      {estimate.lineItems.length > 0 && (
        <ul className="mt-4 max-h-40 space-y-1 overflow-y-auto border-t border-zinc-100 pt-3">
          {estimate.lineItems.map((line) => (
            <li key={line.placementId} className="flex justify-between gap-2 text-[11px]">
              <span className="truncate text-zinc-500">{line.name}</span>
              <span className="shrink-0 text-zinc-700">${line.price}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
