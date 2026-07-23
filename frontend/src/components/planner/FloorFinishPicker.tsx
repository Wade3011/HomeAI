'use client';

import clsx from 'clsx';
import {
  FLOOR_FINISH_IDS,
  FLOOR_FINISHES,
  resolveFloorFinishId,
} from '@/config/floorFinishes';
import type { FloorFinishId, Room } from '@/types';

export function FloorFinishPicker({
  room,
  disabled,
  onChange,
}: {
  room: Room;
  disabled?: boolean;
  onChange: (floorFinishId: FloorFinishId) => void;
}) {
  const current = resolveFloorFinishId(room);

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Flooring</p>
      <p className="text-[11px] text-stone-500">
        Choose a finish for this room. Style packs set defaults for the whole home.
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {FLOOR_FINISH_IDS.map((id) => {
          const finish = FLOOR_FINISHES[id];
          const active = current === id;
          return (
            <button
              key={id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(id)}
              className={clsx(
                'flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-xs transition disabled:opacity-50',
                active
                  ? 'border-stone-800 bg-stone-50 ring-1 ring-stone-800'
                  : 'border-stone-200 bg-white hover:border-stone-400',
              )}
            >
              <span
                className="h-6 w-6 shrink-0 rounded-md border border-stone-300 shadow-inner"
                style={{
                  background: `linear-gradient(135deg, ${finish.color} 55%, ${finish.accentColor ?? finish.color} 100%)`,
                }}
              />
              <span className="min-w-0">
                <span className="block truncate font-semibold text-stone-800">{finish.label}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
