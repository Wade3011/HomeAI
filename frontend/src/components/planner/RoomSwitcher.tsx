'use client';

import Link from 'next/link';
import clsx from 'clsx';
import { ROOM_TYPE_PRESETS, normalizeRoomType } from '@/config/roomTypes';
import type { Room } from '@/types';

export function RoomSwitcher({
  projectId,
  rooms,
  currentRoomId,
}: {
  projectId: string;
  rooms: Room[];
  currentRoomId: string;
}) {
  const sorted = [...rooms].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Link
        href={`/projects/${projectId}`}
        className="rounded-lg border border-white/25 bg-white/10 px-2.5 py-1.5 text-xs font-medium backdrop-blur transition hover:bg-white/20"
      >
        Floor plan
      </Link>
      {sorted.map((room) => {
        const preset = ROOM_TYPE_PRESETS[normalizeRoomType(room.type)];
        const active = room.roomId === currentRoomId;
        return (
          <Link
            key={room.roomId}
            href={`/planner/${projectId}/${room.roomId}`}
            className={clsx(
              'rounded-lg px-2.5 py-1.5 text-xs font-semibold transition',
              active
                ? 'bg-white text-[var(--sage-800)] shadow-sm'
                : 'border border-white/25 bg-white/10 text-white backdrop-blur hover:bg-white/20',
            )}
            title={preset.description}
          >
            {room.name}
          </Link>
        );
      })}
    </div>
  );
}
