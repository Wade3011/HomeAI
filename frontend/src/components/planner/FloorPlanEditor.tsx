'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createRoom,
  fetchConnections,
  saveConnections,
  updateRoom,
} from '@/lib/api';
import {
  ROOM_TYPE_PRESETS,
  ROOM_TYPES,
  normalizeRoomType,
  roomTypePreset,
  type RoomTypePreset,
} from '@/config/roomTypes';
import { findConnection, oppositeWallSide, roomRect, roomsAreAdjacent, sharedEdge } from '@/lib/homeLayout';
import type { Room, RoomConnection, RoomType } from '@/types';

const PLAN_SCALE = 8; // px per foot on floor plan canvas

type Mode = 'arrange' | 'connect';

export function FloorPlanEditor({
  projectId,
  rooms,
}: {
  projectId: string;
  rooms: Room[];
}) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [mode, setMode] = useState<Mode>('arrange');
  const [connectPick, setConnectPick] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Local layout overrides (room positions during drag). Committed to the
  // server only on pointerup so dragging stays smooth.
  const [layoutOverrides, setLayoutOverrides] = useState<
    Record<string, { layoutX: number; layoutZ: number }>
  >({});

  // Merge committed room positions with local drag overrides for display.
  const displayRooms = useMemo(
    () =>
      rooms.map((r) => {
        const ov = layoutOverrides[r.roomId];
        if (!ov) return r;
        return { ...r, layoutX: ov.layoutX, layoutZ: ov.layoutZ };
      }),
    [rooms, layoutOverrides],
  );

  const connectionsQuery = useQuery({
    queryKey: ['connections', projectId],
    queryFn: () => fetchConnections(projectId),
  });
  const connections = connectionsQuery.data ?? [];

  const bounds = useMemo(() => {
    let maxX = 40;
    let maxZ = 32;
    for (const r of displayRooms) {
      const lx = (r.layoutX ?? 0) + r.widthFt;
      const lz = (r.layoutZ ?? 0) + r.depthFt;
      maxX = Math.max(maxX, lx + 4);
      maxZ = Math.max(maxZ, lz + 4);
    }
    return { widthFt: maxX, depthFt: maxZ };
  }, [displayRooms]);

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
    mutationFn: ({
      roomId,
      layoutX,
      layoutZ,
    }: {
      roomId: string;
      layoutX: number;
      layoutZ: number;
    }) => updateRoom(roomId, { layoutX, layoutZ }),
    onSuccess: ({ room, adjustedRooms }) => {
      const touched = new Map<string, Room>([[room.roomId, room]]);
      for (const adjusted of adjustedRooms) {
        touched.set(adjusted.roomId, adjusted);
      }
      queryClient.setQueryData<Room[] | undefined>(['rooms', projectId], (prev) =>
        prev?.map((r) => touched.get(r.roomId) ?? r),
      );
      setLayoutOverrides((prev) => {
        const next = { ...prev };
        delete next[room.roomId];
        return next;
      });
    },
    onError: (_err, vars) => {
      // Keep the override visible so the room doesn't snap back on failure.
      setLayoutOverrides((prev) => ({
        ...prev,
        [vars.roomId]: { layoutX: vars.layoutX, layoutZ: vars.layoutZ },
      }));
    },
  });

  const connectionsMutation = useMutation({
    mutationFn: (next: RoomConnection[]) => saveConnections(projectId, next),
    onSuccess: (saved) => {
      queryClient.setQueryData(['connections', projectId], saved);
    },
  });

  // Reset connection picker when leaving connect mode
  useEffect(() => {
    if (mode !== 'connect') setConnectPick(null);
  }, [mode]);

  const toggleConnection = (
    roomA: Room,
    roomB: Room,
    kind: RoomConnection['kind'],
  ) => {
    const roomAId = roomA.roomId;
    const roomBId = roomB.roomId;
    const existing = findConnection(connections, roomAId, roomBId);
    let next: RoomConnection[];
    if (existing && existing.kind === kind) {
      next = connections.filter((c) => c.connectionId !== existing.connectionId);
    } else if (existing) {
      next = connections.map((c) =>
        c.connectionId === existing.connectionId ? { ...c, kind } : c,
      );
    } else {
      const edge = sharedEdge(roomRect(roomA), roomRect(roomB));
      next = [
        ...connections,
        {
          connectionId: `conn-${crypto.randomUUID()}`,
          projectId,
          roomAId,
          roomBId,
          kind,
          sideA: edge?.side,
          sideB: edge ? oppositeWallSide(edge.side) : undefined,
        },
      ];
    }
    connectionsMutation.mutate(next);
  };

  const onPickForConnect = (roomId: string) => {
    if (!connectPick) {
      setConnectPick(roomId);
      return;
    }
    if (connectPick === roomId) {
      setConnectPick(null);
      return;
    }
    const a = rooms.find((r) => r.roomId === connectPick);
    const b = rooms.find((r) => r.roomId === roomId);
    if (a && b && roomsAreAdjacent(a, b)) {
      // Toggle through: no connection -> open -> door -> no connection
      const existing = findConnection(connections, a.roomId, b.roomId);
      const nextKind: RoomConnection['kind'] | null = !existing
        ? 'open'
        : existing.kind === 'open'
          ? 'door'
          : null;
      if (nextKind) {
        toggleConnection(a, b, nextKind);
      } else {
        connectionsMutation.mutate(
          connections.filter((c) => c.connectionId !== existing!.connectionId),
        );
      }
    }
    setConnectPick(null);
  };

  const canvasW = bounds.widthFt * PLAN_SCALE;
  const canvasH = bounds.depthFt * PLAN_SCALE;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-1.5 rounded-full bg-stone-100 p-1 text-xs">
            <ModeButton active={mode === 'arrange'} onClick={() => setMode('arrange')}>
              Arrange
            </ModeButton>
            <ModeButton active={mode === 'connect'} onClick={() => setMode('connect')}>
              Connect rooms
            </ModeButton>
          </div>
          <p className="text-xs text-stone-500">
            {mode === 'arrange'
              ? 'Drag rooms to lay out your home. Open the 3D view from each block.'
              : connectPick
                ? 'Click an adjacent room to toggle: open → door → none.'
                : 'Click a room to start, then click another adjacent room to connect.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/projects/${projectId}/3d`}
            className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:border-[var(--sage-600)]"
          >
            View whole home in 3D →
          </Link>
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="btn-primary text-sm"
          >
            + Add room
          </button>
        </div>
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
            <pattern
              id="planGrid"
              width={PLAN_SCALE}
              height={PLAN_SCALE}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M ${PLAN_SCALE} 0 L 0 0 0 ${PLAN_SCALE}`}
                fill="none"
                stroke="#d6d3d1"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width={canvasW} height={canvasH} fill="url(#planGrid)" />

          {displayRooms.map((room) => (
            <RoomBlock
              key={room.roomId}
              room={room}
              mode={mode}
              isDragging={draggingId === room.roomId}
              isConnectPick={connectPick === room.roomId}
              projectId={projectId}
              onConnect={onPickForConnect}
              onDragStart={() => setDraggingId(room.roomId)}
              onDragMove={(layoutX, layoutZ) =>
                setLayoutOverrides((prev) => ({
                  ...prev,
                  [room.roomId]: { layoutX, layoutZ },
                }))
              }
              onDragEnd={(layoutX, layoutZ) => {
                setDraggingId(null);
                // Compare against the committed server position, not displayRooms
                // (which already includes the drag override).
                const committed = rooms.find((r) => r.roomId === room.roomId);
                const committedX = committed?.layoutX ?? 0;
                const committedZ = committed?.layoutZ ?? 0;
                if (
                  Math.abs(committedX - layoutX) < 0.01 &&
                  Math.abs(committedZ - layoutZ) < 0.01
                ) {
                  setLayoutOverrides((prev) => {
                    const next = { ...prev };
                    delete next[room.roomId];
                    return next;
                  });
                  return;
                }
                layoutMutation.mutate({
                  roomId: room.roomId,
                  layoutX,
                  layoutZ,
                });
              }}
            />
          ))}

          {/* Connection labels on shared walls */}
          {connections.flatMap((conn) => {
            const a = displayRooms.find((r) => r.roomId === conn.roomAId);
            const b = displayRooms.find((r) => r.roomId === conn.roomBId);
            if (!a || !b) return [];

            return ([
              { room: a, other: b },
              { room: b, other: a },
            ] as const).flatMap(({ room, other }) => {
              const edge = sharedEdge(roomRect(room), roomRect(other));
              if (!edge) return [];
              const pos = connectionLabelPosition(room, edge);
              const stroke = conn.kind === 'open' ? '#5c7a6a' : '#a78bfa';
              const fill = conn.kind === 'open' ? '#3f5b4d' : '#7c3aed';
              const label = `${conn.kind === 'open' ? '↔' : 'door'} ${edgeSideLabel(edge.side)} · ${other.name}`;

              return [
                <g key={`${conn.connectionId}-${room.roomId}`} className="pointer-events-none">
                  <rect
                    x={pos.x - label.length * 2.8}
                    y={pos.y - 9}
                    width={label.length * 5.6}
                    height={16}
                    rx={4}
                    fill="white"
                    stroke={stroke}
                    strokeWidth={1}
                    opacity={0.95}
                  />
                  <text
                    x={pos.x}
                    y={pos.y + 3}
                    textAnchor="middle"
                    style={{ fontSize: 9, fontWeight: 700 }}
                    fill={fill}
                  >
                    {label}
                  </text>
                </g>,
              ];
            });
          })}
        </svg>
      </div>

      {connections.length > 0 && (
        <div className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-600">
          <p className="mb-1 font-semibold text-stone-700">Open connections</p>
          <ul className="space-y-1">
            {connections.map((conn) => {
              const a = rooms.find((r) => r.roomId === conn.roomAId);
              const b = rooms.find((r) => r.roomId === conn.roomBId);
              if (!a || !b) return null;
              return (
                <li
                  key={conn.connectionId}
                  className="flex items-center justify-between"
                >
                  <span>
                    {a.name} ↔ {b.name}{' '}
                    <span
                      className={clsx(
                        'ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase',
                        conn.kind === 'open'
                          ? 'bg-[var(--sage-100)] text-[var(--sage-800)]'
                          : 'bg-violet-100 text-violet-700',
                      )}
                    >
                      {conn.kind}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      connectionsMutation.mutate(
                        connections.filter(
                          (c) => c.connectionId !== conn.connectionId,
                        ),
                      )
                    }
                    className="text-[11px] text-stone-500 hover:text-stone-800"
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

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
                  {preset.hasCatalogPricing
                    ? ' · catalog pricing'
                    : ' · custom blocks only'}
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

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'rounded-full px-3 py-1 font-semibold transition',
        active
          ? 'bg-white text-stone-800 shadow-sm'
          : 'text-stone-500 hover:text-stone-700',
      )}
    >
      {children}
    </button>
  );
}

function RoomBlock({
  room,
  mode,
  isDragging,
  isConnectPick,
  projectId,
  onConnect,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  room: Room;
  mode: Mode;
  isDragging: boolean;
  isConnectPick: boolean;
  projectId: string;
  onConnect: (roomId: string) => void;
  onDragStart: () => void;
  onDragMove: (layoutX: number, layoutZ: number) => void;
  onDragEnd: (layoutX: number, layoutZ: number) => void;
}) {
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
          : room.type === 'hallway'
            ? '#d4cfc7'
            : '#e7e5e4';

  // Drag state lives in refs so pointermove handler stays stable & cheap.
  const dragRef = useRef<{
    startClientX: number;
    startClientY: number;
    startLayoutX: number;
    startLayoutZ: number;
    moved: boolean;
  } | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const beginDrag = (e: React.PointerEvent<SVGRectElement>) => {
    if (mode !== 'arrange') return;
    e.preventDefault();
    (e.currentTarget as SVGRectElement).setPointerCapture?.(e.pointerId);
    dragRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      startLayoutX: lx,
      startLayoutZ: lz,
      moved: false,
    };
    onDragStart();
  };

  const onPointerMove = (e: React.PointerEvent<SVGRectElement>) => {
    const state = dragRef.current;
    if (!state) return;
    const dx = (e.clientX - state.startClientX) / PLAN_SCALE;
    const dz = (e.clientY - state.startClientY) / PLAN_SCALE;
    const newX = Math.max(0, Math.round((state.startLayoutX + dx) * 2) / 2);
    const newZ = Math.max(0, Math.round((state.startLayoutZ + dz) * 2) / 2);
    if (newX === lx && newZ === lz) return;
    state.moved = true;
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      onDragMove(newX, newZ);
    });
  };

  const finishDrag = (e: React.PointerEvent<SVGRectElement>) => {
    const state = dragRef.current;
    if (!state) return;
    (e.currentTarget as SVGRectElement).releasePointerCapture?.(e.pointerId);
    dragRef.current = null;
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    // Compute final position from drag delta — don't rely on render-time lx/lz
    // which may be stale if the last rAF hasn't flushed yet.
    const dx = (e.clientX - state.startClientX) / PLAN_SCALE;
    const dz = (e.clientY - state.startClientY) / PLAN_SCALE;
    const finalX = Math.max(0, Math.round((state.startLayoutX + dx) * 2) / 2);
    const finalZ = Math.max(0, Math.round((state.startLayoutZ + dz) * 2) / 2);
    onDragEnd(finalX, finalZ);
  };

  const isInteractive = mode === 'arrange' || mode === 'connect';
  const strokeColor = isConnectPick
    ? '#7c3aed'
    : isDragging
      ? '#5c7a6a'
      : '#78716c';
  const strokeWidth = isConnectPick ? 3 : isDragging ? 2.5 : 1.5;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={4}
        fill={fill}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        className={clsx(
          mode === 'arrange' && 'cursor-grab active:cursor-grabbing',
          mode === 'connect' && 'cursor-pointer',
        )}
        onPointerDown={(e) => {
          if (mode === 'connect') {
            onConnect(room.roomId);
            return;
          }
          beginDrag(e);
        }}
        onPointerMove={onPointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        style={{ touchAction: isInteractive ? 'none' : undefined }}
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
      <foreignObject x={x + 4} y={y + h - 22} width={Math.max(w - 8, 24)} height={18}>
        <Link
          href={`/planner/${projectId}/${room.roomId}`}
          className="block rounded bg-white/90 px-2 py-0.5 text-center text-[10px] font-semibold text-[var(--sage-800)] shadow hover:bg-white"
        >
          Open 3D →
        </Link>
      </foreignObject>
    </g>
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

function edgeSideLabel(side: 'back' | 'front' | 'left' | 'right'): string {
  switch (side) {
    case 'back':
      return 'Back';
    case 'front':
      return 'Front';
    case 'left':
      return 'Left';
    case 'right':
      return 'Right';
  }
}

function connectionLabelPosition(
  room: Room,
  edge: { side: 'back' | 'front' | 'left' | 'right'; start: number; end: number },
): { x: number; y: number } {
  const lx = room.layoutX ?? 0;
  const lz = room.layoutZ ?? 0;
  const mid = (edge.start + edge.end) / 2;

  switch (edge.side) {
    case 'back':
      return { x: mid * PLAN_SCALE, y: lz * PLAN_SCALE - 6 };
    case 'front':
      return { x: mid * PLAN_SCALE, y: (lz + room.depthFt) * PLAN_SCALE + 14 };
    case 'left':
      return { x: lx * PLAN_SCALE - 6, y: mid * PLAN_SCALE };
    case 'right':
      return { x: (lx + room.widthFt) * PLAN_SCALE + 6, y: mid * PLAN_SCALE };
  }
}
