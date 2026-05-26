'use client';

import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { useMemo, useState } from 'react';
import { createRoom, updateRoom } from '@/lib/api';
import {
  ROOM_TYPE_PRESETS,
  ROOM_TYPES,
  normalizeRoomType,
  roomTypePreset,
  type RoomTypePreset,
} from '@/config/roomTypes';
import type { Room, RoomType } from '@/types';

const PLAN_SCALE = 8; // px per foot on floor plan canvas

export function FloorPlanEditor({
  projectId,
  rooms,
}: {
  projectId: string;
  rooms: Room[];
}) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const bounds = useMemo(() => {
    let maxX = 40;
    let maxZ = 32;
    for (const r of rooms) {
      const lx = (r.layoutX ?? 0) + r.widthFt;
      const lz = (r.layoutZ ?? 0) + r.depthFt;
      maxX = Math.max(maxX, lx + 4);
      maxZ = Math.max(maxZ, lz + 4);
    }
    return { widthFt: maxX, depthFt: maxZ };
  }, [rooms]);

  const addMutation = useMutation({
    mutationFn: async (type: RoomType) => {
      const preset = ROOM_TYPE_PRESETS[type];
      const offset = rooms.length * 2;
      return createRoom(projectId, {
        type,
        name: nextRoomName(type, rooms),
        widthFt: preset.widthFt,
        depthFt: preset.depthFt,
        heightFt: preset.heightFt,
        layoutX: offset,
        layoutZ: offset,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms', projectId] });
      setAdding(false);
    },
  });

  const layoutMutation = useMutation({
    mutationFn: ({ roomId, layoutX, layoutZ }: { roomId: string; layoutX: number; layoutZ: number }) =>
      updateRoom(roomId, { layoutX, layoutZ }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms', projectId] });
    },
  });

  const canvasW = bounds.widthFt * PLAN_SCALE;
  const canvasH = bounds.depthFt * PLAN_SCALE;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone-600">
          Drag room blocks to arrange your home. Double-click a block to open its 3D planner.
        </p>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="btn-primary text-sm"
        >
          + Add room
        </button>
      </div>

      {adding && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ROOM_TYPES.filter((t) => t !== 'other').map((type) => (
            <AddRoomCard
              key={type}
              preset={ROOM_TYPE_PRESETS[type]}
              pending={addMutation.isPending}
              onAdd={() => addMutation.mutate(type)}
            />
          ))}
        </div>
      )}

      <div
        className="relative overflow-auto rounded-2xl border border-stone-200 bg-[#f5f3f0] shadow-inner"
        style={{ maxHeight: 'min(70vh, 560px)' }}
      >
        <svg
          width={canvasW}
          height={canvasH}
          className="block"
          style={{ minWidth: canvasW, minHeight: canvasH }}
        >
          <defs>
            <pattern id="planGrid" width={PLAN_SCALE} height={PLAN_SCALE} patternUnits="userSpaceOnUse">
              <path
                d={`M ${PLAN_SCALE} 0 L 0 0 0 ${PLAN_SCALE}`}
                fill="none"
                stroke="#d6d3d1"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width={canvasW} height={canvasH} fill="url(#planGrid)" />

          {rooms.map((room) => {
            const lx = room.layoutX ?? 0;
            const lz = room.layoutZ ?? 0;
            const preset = roomTypePreset(room.type);
            const x = lx * PLAN_SCALE;
            const y = lz * PLAN_SCALE;
            const w = room.widthFt * PLAN_SCALE;
            const h = room.depthFt * PLAN_SCALE;
            const fill =
              room.type === 'kitchen'
                ? '#c4b5a0'
                : room.type === 'bathroom'
                  ? '#c5d4dc'
                  : room.type === 'bedroom'
                    ? '#ddd6fe'
                    : '#e7e5e4';

            return (
              <g key={room.roomId}>
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  rx={4}
                  fill={fill}
                  stroke={draggingId === room.roomId ? '#5c7a6a' : '#78716c'}
                  strokeWidth={draggingId === room.roomId ? 2.5 : 1.5}
                  className="cursor-grab active:cursor-grabbing"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    setDraggingId(room.roomId);
                    const startX = e.clientX;
                    const startY = e.clientY;
                    const startLx = lx;
                    const startLz = lz;

                    const onMove = (ev: PointerEvent) => {
                      const dx = (ev.clientX - startX) / PLAN_SCALE;
                      const dz = (ev.clientY - startY) / PLAN_SCALE;
                      const newX = Math.max(0, Math.round((startLx + dx) * 2) / 2);
                      const newZ = Math.max(0, Math.round((startLz + dz) * 2) / 2);
                      layoutMutation.mutate({
                        roomId: room.roomId,
                        layoutX: newX,
                        layoutZ: newZ,
                      });
                    };

                    const onUp = () => {
                      setDraggingId(null);
                      window.removeEventListener('pointermove', onMove);
                      window.removeEventListener('pointerup', onUp);
                    };

                    window.addEventListener('pointermove', onMove);
                    window.addEventListener('pointerup', onUp);
                  }}
                />
                <text
                  x={x + w / 2}
                  y={y + h / 2 - 6}
                  textAnchor="middle"
                  className="pointer-events-none select-none fill-stone-800 text-[11px] font-bold"
                  style={{ fontSize: 11 }}
                >
                  {room.name}
                </text>
                <text
                  x={x + w / 2}
                  y={y + h / 2 + 10}
                  textAnchor="middle"
                  className="pointer-events-none select-none fill-stone-600"
                  style={{ fontSize: 9 }}
                >
                  {preset.label} · {room.widthFt}&apos;×{room.depthFt}&apos;
                </text>
                <foreignObject x={x + 4} y={y + h - 22} width={w - 8} height={18}>
                  <Link
                    href={`/planner/${projectId}/${room.roomId}`}
                    className="block rounded bg-white/90 px-2 py-0.5 text-center text-[10px] font-semibold text-[var(--sage-800)] shadow hover:bg-white"
                  >
                    Open 3D →
                  </Link>
                </foreignObject>
              </g>
            );
          })}
        </svg>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2">
        {rooms.map((room) => {
          const preset = roomTypePreset(room.type);
          return (
            <li
              key={room.roomId}
              className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
            >
              <div>
                <p className="font-semibold text-stone-800">{room.name}</p>
                <p className="text-xs text-stone-500">
                  {preset.label}
                  {preset.hasCatalogPricing ? ' · catalog pricing' : ' · custom blocks only'}
                </p>
              </div>
              <Link
                href={`/planner/${projectId}/${room.roomId}`}
                className="shrink-0 text-xs font-semibold text-[var(--sage-700)] hover:underline"
              >
                Plan →
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function AddRoomCard({
  preset,
  onAdd,
  pending,
}: {
  preset: RoomTypePreset;
  onAdd: () => void;
  pending: boolean;
}) {
  return (
    <button
      type="button"
      disabled={pending}
      onClick={onAdd}
      className={clsx(
        'rounded-xl border border-stone-200 bg-white p-3 text-left transition hover:border-[var(--sage-600)] hover:shadow-sm',
        pending && 'opacity-60',
      )}
    >
      <p className="font-semibold text-stone-800">{preset.label}</p>
      <p className="mt-0.5 text-xs text-stone-500">{preset.description}</p>
      <p className="mt-1 text-[11px] text-stone-400">
        {preset.widthFt}&apos; × {preset.depthFt}&apos; default
      </p>
    </button>
  );
}

function nextRoomName(type: RoomType, rooms: Room[]): string {
  const preset = ROOM_TYPE_PRESETS[type];
  const same = rooms.filter((r) => normalizeRoomType(r.type) === type).length;
  if (same === 0) return preset.name;
  return `${preset.name} ${same + 1}`;
}
