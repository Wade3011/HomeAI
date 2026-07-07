'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ROOM_TYPES, ROOM_TYPE_PRESETS, normalizeRoomType } from '@/config/roomTypes';
import { RoomSettingsPanel } from '@/components/planner/RoomSettingsPanel';
import type { Room, RoomType } from '@/types';

export function FloorPlanRoomPanel({
  room,
  projectId,
  onClose,
  onSaveDetails,
  onApplyDimensions,
  onDelete,
  isSavingDetails,
  isSavingDimensions,
  isDeleting,
}: {
  room: Room;
  projectId: string;
  onClose: () => void;
  onSaveDetails: (patch: { name: string; type: RoomType }) => void;
  onApplyDimensions: (dims: { widthFt: number; depthFt: number; heightFt: number }) => void;
  onDelete: () => void;
  isSavingDetails?: boolean;
  isSavingDimensions?: boolean;
  isDeleting?: boolean;
}) {
  const roomType = normalizeRoomType(room.type);
  const [name, setName] = useState(room.name);
  const [type, setType] = useState<RoomType>(roomType);

  useEffect(() => {
    setName(room.name);
    setType(normalizeRoomType(room.type));
  }, [room.roomId, room.name, room.type]);

  const detailsDirty = name.trim() !== room.name || type !== roomType;
  const preset = ROOM_TYPE_PRESETS[type];

  const handleSaveDetails = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSaveDetails({ name: trimmed, type });
  };

  return (
    <aside className="flex w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm lg:w-72">
      <div className="flex items-start justify-between gap-2 border-b border-stone-100 px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Edit room</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-stone-800">{room.name}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-lg leading-none text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div className="space-y-4 border-b border-stone-100 p-4">
        <label className="block">
          <span className="text-xs font-medium text-stone-600">Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-modern mt-1"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-stone-600">Type</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as RoomType)}
            className="input-modern mt-1"
          >
            {ROOM_TYPES.map((t) => (
              <option key={t} value={t}>
                {ROOM_TYPE_PRESETS[t].label}
              </option>
            ))}
          </select>
        </label>
        <p className="text-[11px] text-stone-500">{preset.description}</p>
        <button
          type="button"
          onClick={handleSaveDetails}
          disabled={!detailsDirty || !name.trim() || isSavingDetails}
          className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700 transition hover:border-[var(--sage-600)] hover:bg-[var(--sage-50)] disabled:opacity-50"
        >
          {isSavingDetails ? 'Saving…' : 'Save name & type'}
        </button>
      </div>

      <RoomSettingsPanel
        widthFt={room.widthFt}
        depthFt={room.depthFt}
        heightFt={room.heightFt}
        isSaving={isSavingDimensions}
        onApply={onApplyDimensions}
        roomName={room.name}
        onDelete={onDelete}
        isDeleting={isDeleting}
      />

      <div className="border-t border-stone-100 p-4">
        <Link
          href={`/planner/${projectId}/${room.roomId}`}
          className="btn-primary block w-full text-center text-sm"
        >
          Open in 3D planner →
        </Link>
      </div>
    </aside>
  );
}
