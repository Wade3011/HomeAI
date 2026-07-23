'use client';

import clsx from 'clsx';
import { STYLE_PACK_IDS, STYLE_PACKS } from '@/config/stylePacks';
import type { StylePackId } from '@/types';

export function StylePackPanel({
  activePackId,
  applying,
  onApply,
}: {
  activePackId?: StylePackId | null;
  applying?: boolean;
  onApply: (packId: StylePackId) => void;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Style pack</p>
      <p className="mt-1 text-xs text-stone-500">
        Apply flooring defaults across all rooms (modern, farmhouse, coastal, industrial). You can
        still override each room afterward.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {STYLE_PACK_IDS.map((id) => {
          const pack = STYLE_PACKS[id];
          const active = activePackId === id;
          return (
            <button
              key={id}
              type="button"
              disabled={applying}
              onClick={() => onApply(id)}
              className={clsx(
                'rounded-xl border px-3 py-2.5 text-left transition disabled:opacity-50',
                active
                  ? 'border-stone-800 bg-stone-50 shadow-sm'
                  : 'border-stone-200 bg-white hover:border-stone-400',
              )}
            >
              <span
                className="mb-2 block h-1.5 w-10 rounded-full"
                style={{ backgroundColor: pack.accent }}
              />
              <span className="block text-sm font-semibold text-stone-900">{pack.label}</span>
              <span className="mt-0.5 block text-[11px] text-stone-500">{pack.description}</span>
              {active && (
                <span className="mt-1.5 block text-[11px] font-semibold text-[var(--sage-700)]">
                  Active
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
