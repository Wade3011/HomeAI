'use client';

import type { CatalogItem, Placement, Room } from '@/types';
import { catalogDimensionsFt, orientedDimensions } from '@/components/planner/placementCollision';

function formatFt(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
}

export function PlacementInfoOverlay({
  room,
  placement,
  item,
  onRotateLeft,
  onRotateRight,
}: {
  room: Room;
  placement: Placement | null;
  item: CatalogItem | null;
  onRotateLeft: () => void;
  onRotateRight: () => void;
}) {
  const rotationDeg = placement
    ? (() => {
        const steps = Math.round(placement.rotationY / (Math.PI / 2));
        return ((steps % 4) + 4) % 4 * 90;
      })()
    : 0;

  let wallDistances: { left: number; right: number; back: number; front: number } | null = null;
  if (placement && item) {
    const { widthFt, depthFt } = catalogDimensionsFt(item);
    const o = orientedDimensions(widthFt, depthFt, placement.rotationY);
    wallDistances = {
      left: placement.positionX,
      right: room.widthFt - placement.positionX - o.widthFt,
      back: placement.positionZ,
      front: room.depthFt - placement.positionZ - o.depthFt,
    };
  }

  return (
    <div className="pointer-events-auto absolute right-3 top-3 z-10 max-w-[220px] rounded-lg border border-zinc-200 bg-white/95 p-3 text-xs text-zinc-700 shadow-md">
      <p className="font-semibold text-zinc-900">Room</p>
      <p>
        {formatFt(room.widthFt)} ft wide × {formatFt(room.depthFt)} ft deep ×{' '}
        {formatFt(room.heightFt)} ft high
      </p>

      {placement && item && wallDistances && (
        <>
          <p className="mt-2 font-semibold text-zinc-900">{item.name}</p>
          <ul className="mt-1 space-y-0.5 text-zinc-600">
            <li>Left wall: {formatFt(wallDistances.left)} ft</li>
            <li>Right wall: {formatFt(wallDistances.right)} ft</li>
            <li>Back wall: {formatFt(wallDistances.back)} ft</li>
            <li>Front wall: {formatFt(wallDistances.front)} ft</li>
            <li>Facing: {rotationDeg}°</li>
          </ul>
          <div className="mt-2 flex gap-1">
            <button
              type="button"
              onClick={onRotateLeft}
              className="flex-1 rounded border border-zinc-200 px-2 py-1.5 text-[11px] font-medium hover:bg-zinc-50"
            >
              ↺ 90°
            </button>
            <button
              type="button"
              onClick={onRotateRight}
              className="flex-1 rounded border border-zinc-200 px-2 py-1.5 text-[11px] font-medium hover:bg-zinc-50"
            >
              90° ↻
            </button>
          </div>
        </>
      )}
    </div>
  );
}
