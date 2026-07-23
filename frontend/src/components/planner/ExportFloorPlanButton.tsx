'use client';

import { useState } from 'react';
import {
  downloadFloorPlanPng,
  downloadFloorPlanSvg,
} from '@/lib/exportFloorPlan';
import type { Room } from '@/types';

export function ExportFloorPlanButton({
  projectName,
  rooms,
}: {
  projectName: string;
  rooms: Room[];
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<'svg' | 'png' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const houseRoomCount = rooms.filter((r) => !r.linkedSiteStructureId).length;
  const disabled = houseRoomCount === 0 || busy != null;

  const run = async (format: 'svg' | 'png') => {
    setError(null);
    setBusy(format);
    try {
      const input = { projectName, rooms };
      if (format === 'svg') downloadFloorPlanSvg(input);
      else await downloadFloorPlanPng(input);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled && houseRoomCount === 0}
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:border-[var(--sage-600)] disabled:opacity-50"
        title="Export floor plan with room measurements"
      >
        {busy ? 'Exporting…' : 'Export plan'}
      </button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-10 cursor-default"
            aria-label="Close export menu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-1 w-56 rounded-xl border border-stone-200 bg-white p-2 shadow-lg">
            <p className="px-2 pb-1 text-[11px] text-stone-500">
              Includes house size, each room&apos;s W × D, and a room schedule.
            </p>
            <button
              type="button"
              disabled={disabled}
              onClick={() => void run('svg')}
              className="block w-full rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-50"
            >
              Download SVG (vector)
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => void run('png')}
              className="block w-full rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-50"
            >
              Download PNG (image)
            </button>
            {error && <p className="px-2 pt-1 text-[11px] text-red-600">{error}</p>}
          </div>
        </>
      )}
    </div>
  );
}
