'use client';

import type { CustomItemSpec, Placement, Room } from '@/types';
import type { ResolvedPlacementItem } from '@/lib/placementItem';
import { formatFt } from '@/components/planner/SceneDimensions';
import { orientedDimensions } from '@/components/planner/placementCollision';
import { CustomPlacementEditor } from '@/components/planner/CustomPlacementEditor';

export function PlacementInfoOverlay({
  room,
  placement,
  resolved,
  onRotateLeft,
  onRotateRight,
  onCustomChange,
}: {
  room: Room;
  placement: Placement | null;
  resolved: ResolvedPlacementItem | null;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onCustomChange?: (patch: Partial<CustomItemSpec>) => void;
}) {
  const rotationDeg = placement
    ? (() => {
        const steps = Math.round(placement.rotationY / (Math.PI / 2));
        return ((steps % 4) + 4) % 4 * 90;
      })()
    : 0;

  let wallDistances: { left: number; right: number; back: number; front: number } | null = null;
  if (placement && resolved) {
    const o = orientedDimensions(resolved.widthFt, resolved.depthFt, placement.rotationY);
    wallDistances = {
      left: placement.positionX,
      right: room.widthFt - placement.positionX - o.widthFt,
      back: placement.positionZ,
      front: room.depthFt - placement.positionZ - o.depthFt,
    };
  }

  return (
    <div className="pointer-events-auto absolute right-3 top-3 z-10 max-w-[260px] overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg">
      <div className="panel-header px-3 py-2 text-xs font-semibold">Room &amp; selection</div>
      <div className="px-3 py-2 text-xs text-stone-600">
        <p>
          {formatFt(room.widthFt)} × {formatFt(room.depthFt)} × {formatFt(room.heightFt)}
        </p>

        {placement && resolved && wallDistances ? (
          <>
            <p className="mt-2 font-semibold text-[var(--sage-800)]">{resolved.label}</p>
            {resolved.isCatalog && (
              <p className="text-[10px] text-stone-400">Catalog item — fixed size &amp; price</p>
            )}
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {(
                [
                  ['Left', wallDistances.left],
                  ['Right', wallDistances.right],
                  ['Back', wallDistances.back],
                  ['Front', wallDistances.front],
                ] as const
              ).map(([side, ft]) => (
                <div
                  key={side}
                  className="rounded-md bg-[var(--sage-50)] px-2 py-1 text-center"
                >
                  <span className="block text-[10px] font-medium uppercase text-stone-500">
                    {side}
                  </span>
                  <span className="font-semibold text-[var(--sage-800)]">{formatFt(ft)}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-stone-500">Facing {rotationDeg}°</p>
            <div className="mt-2 flex gap-1">
              <button
                type="button"
                onClick={onRotateLeft}
                className="flex-1 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-[11px] font-medium text-stone-700 transition hover:bg-[var(--sage-50)]"
              >
                ↺ 90°
              </button>
              <button
                type="button"
                onClick={onRotateRight}
                className="flex-1 rounded-lg border border-[var(--sage-600)] bg-[var(--sage-50)] px-2 py-1.5 text-[11px] font-medium text-[var(--sage-800)] transition hover:bg-[var(--sage-100)]"
              >
                90° ↻
              </button>
            </div>
            {resolved.isCustom && placement.customItem && onCustomChange && (
              <CustomPlacementEditor customItem={placement.customItem} onChange={onCustomChange} />
            )}
          </>
        ) : (
          <p className="mt-2 text-stone-500">Select an item to see details.</p>
        )}
      </div>
    </div>
  );
}
