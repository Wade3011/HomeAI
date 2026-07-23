'use client';

import { useEffect, useState } from 'react';
import { validateCathedralPeak } from '@/lib/ceilingGeometry';
import type { CeilingType, RidgeAxis, Room } from '@/types';

export type CeilingSettingsPatch = {
  ceilingType: CeilingType;
  peakHeightFt?: number;
  ridgeAxis?: RidgeAxis;
};

export function CeilingSettingsFields({
  room,
  disabled,
  onApply,
}: {
  room: Room;
  disabled?: boolean;
  onApply: (patch: CeilingSettingsPatch) => void;
}) {
  const [ceilingType, setCeilingType] = useState<CeilingType>(room.ceilingType ?? 'flat');
  const [peakHeightFt, setPeakHeightFt] = useState(
    () => room.peakHeightFt ?? room.heightFt + 3,
  );
  const [ridgeAxis, setRidgeAxis] = useState<RidgeAxis>(room.ridgeAxis ?? 'width');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCeilingType(room.ceilingType ?? 'flat');
    setPeakHeightFt(room.peakHeightFt ?? room.heightFt + 3);
    setRidgeAxis(room.ridgeAxis ?? 'width');
    setError(null);
  }, [room.roomId, room.ceilingType, room.peakHeightFt, room.ridgeAxis, room.heightFt]);

  const dirty =
    ceilingType !== (room.ceilingType ?? 'flat') ||
    (ceilingType === 'cathedral' &&
      (peakHeightFt !== (room.peakHeightFt ?? room.heightFt + 3) ||
        ridgeAxis !== (room.ridgeAxis ?? 'width')));

  const handleApply = () => {
    if (ceilingType === 'cathedral') {
      const msg = validateCathedralPeak(room.heightFt, peakHeightFt);
      if (msg) {
        setError(msg);
        return;
      }
      setError(null);
      onApply({ ceilingType, peakHeightFt, ridgeAxis });
      return;
    }
    setError(null);
    onApply({ ceilingType: 'flat', peakHeightFt: undefined, ridgeAxis: undefined });
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Ceiling</p>
      <p className="text-[11px] text-stone-500">
        Wall height stays the eave. Cathedral adds a peaked ceiling above that.
      </p>
      <label className="block text-xs text-stone-600">
        Type
        <select
          value={ceilingType}
          onChange={(e) => setCeilingType(e.target.value as CeilingType)}
          disabled={disabled}
          className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
        >
          <option value="flat">Flat</option>
          <option value="cathedral">Cathedral (vaulted)</option>
        </select>
      </label>
      {ceilingType === 'cathedral' && (
        <>
          <label className="block text-xs text-stone-600">
            Peak height (ft)
            <input
              type="number"
              min={room.heightFt + 1}
              step={0.5}
              value={peakHeightFt}
              onChange={(e) => setPeakHeightFt(Number(e.target.value))}
              disabled={disabled}
              className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block text-xs text-stone-600">
            Ridge runs along
            <select
              value={ridgeAxis}
              onChange={(e) => setRidgeAxis(e.target.value as RidgeAxis)}
              disabled={disabled}
              className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
            >
              <option value="width">Width (front–back slope)</option>
              <option value="depth">Depth (left–right slope)</option>
            </select>
          </label>
        </>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="button"
        onClick={handleApply}
        disabled={disabled || !dirty}
        className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700 transition hover:border-[var(--sage-600)] hover:bg-[var(--sage-50)] disabled:opacity-50"
      >
        Apply ceiling
      </button>
    </div>
  );
}
