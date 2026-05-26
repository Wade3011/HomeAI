'use client';

import { useEffect, useState } from 'react';
import {
  feetToFeetInches,
  formatFeetInches,
  parseFeetInchesInput,
} from '@/lib/imperialDimensions';

const DIMENSION_LABELS = {
  width: 'Width',
  depth: 'Depth',
  height: 'Height',
} as const;

export function RoomSettingsPanel({
  widthFt,
  depthFt,
  heightFt,
  onApply,
  isSaving,
  onDelete,
  isDeleting,
  roomName,
}: {
  widthFt: number;
  depthFt: number;
  heightFt: number;
  onApply: (dims: { widthFt: number; depthFt: number; heightFt: number }) => void;
  isSaving?: boolean;
  onDelete?: () => void;
  isDeleting?: boolean;
  roomName?: string;
}) {
  const [width, setWidth] = useState(() => feetToFeetInches(widthFt));
  const [depth, setDepth] = useState(() => feetToFeetInches(depthFt));
  const [height, setHeight] = useState(() => feetToFeetInches(heightFt));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setWidth(feetToFeetInches(widthFt));
    setDepth(feetToFeetInches(depthFt));
    setHeight(feetToFeetInches(heightFt));
    setError(null);
  }, [widthFt, depthFt, heightFt]);

  const handleApply = () => {
    const w = parseFeetInchesInput(String(width.feet), String(width.inches));
    const d = parseFeetInchesInput(String(depth.feet), String(depth.inches));
    const h = parseFeetInchesInput(String(height.feet), String(height.inches));

    if (w === null || d === null || h === null) {
      setError('Enter valid feet and inches (inches must be 0–11.9).');
      return;
    }

    const checks = [
      { key: 'width' as const, value: w },
      { key: 'depth' as const, value: d },
      { key: 'height' as const, value: h },
    ];

    for (const { key, value } of checks) {
      if (value <= 0) {
        setError(`${DIMENSION_LABELS[key]} must be greater than zero.`);
        return;
      }
    }

    setError(null);
    onApply({ widthFt: w, depthFt: d, heightFt: h });
  };

  return (
    <div className="p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        Room dimensions
      </p>
      <p className="mt-1 text-[11px] text-stone-500">
        Current: {formatFeetInches(widthFt)} × {formatFeetInches(depthFt)} ×{' '}
        {formatFeetInches(heightFt)}
      </p>
      <div className="mt-3 space-y-3">
        <DimensionField
          label={DIMENSION_LABELS.width}
          feet={width.feet}
          inches={width.inches}
          onFeetChange={(feet) => setWidth((prev) => ({ ...prev, feet }))}
          onInchesChange={(inches) => setWidth((prev) => ({ ...prev, inches }))}
        />
        <DimensionField
          label={DIMENSION_LABELS.depth}
          feet={depth.feet}
          inches={depth.inches}
          onFeetChange={(feet) => setDepth((prev) => ({ ...prev, feet }))}
          onInchesChange={(inches) => setDepth((prev) => ({ ...prev, inches }))}
        />
        <DimensionField
          label={DIMENSION_LABELS.height}
          feet={height.feet}
          inches={height.inches}
          onFeetChange={(feet) => setHeight((prev) => ({ ...prev, feet }))}
          onInchesChange={(inches) => setHeight((prev) => ({ ...prev, inches }))}
        />
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <button
        type="button"
        onClick={handleApply}
        disabled={isSaving}
        className="btn-primary mt-4 w-full disabled:opacity-50"
      >
        {isSaving ? 'Applying…' : 'Apply size'}
      </button>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className="mt-3 w-full rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:border-red-400 hover:bg-red-50 disabled:opacity-50"
        >
          {isDeleting ? 'Deleting…' : `Delete${roomName ? ` ${roomName}` : ' room'}`}
        </button>
      )}
    </div>
  );
}

function DimensionField({
  label,
  feet,
  inches,
  onFeetChange,
  onInchesChange,
}: {
  label: string;
  feet: number;
  inches: number;
  onFeetChange: (feet: number) => void;
  onInchesChange: (inches: number) => void;
}) {
  return (
    <fieldset>
      <legend className="text-xs font-medium text-stone-600">{label}</legend>
      <div className="mt-1 grid grid-cols-2 gap-2">
        <label className="block text-[11px] text-stone-500">
          Feet
          <input
            type="number"
            min={0}
            step={1}
            value={feet}
            onChange={(e) => onFeetChange(Number(e.target.value))}
            className="input-modern"
          />
        </label>
        <label className="block text-[11px] text-stone-500">
          Inches
          <input
            type="number"
            min={0}
            max={11.875}
            step={0.125}
            value={inches}
            onChange={(e) => onInchesChange(Number(e.target.value))}
            className="input-modern"
          />
        </label>
      </div>
    </fieldset>
  );
}
