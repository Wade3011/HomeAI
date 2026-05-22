'use client';

import { useEffect, useState } from 'react';

export function RoomSettingsPanel({
  widthFt,
  depthFt,
  heightFt,
  onApply,
  isSaving,
}: {
  widthFt: number;
  depthFt: number;
  heightFt: number;
  onApply: (dims: { widthFt: number; depthFt: number; heightFt: number }) => void;
  isSaving?: boolean;
}) {
  const [width, setWidth] = useState(String(widthFt));
  const [depth, setDepth] = useState(String(depthFt));
  const [height, setHeight] = useState(String(heightFt));

  useEffect(() => {
    setWidth(String(widthFt));
    setDepth(String(depthFt));
    setHeight(String(heightFt));
  }, [widthFt, depthFt, heightFt]);

  const handleApply = () => {
    const w = Number(width);
    const d = Number(depth);
    const h = Number(height);
    if (w >= 6 && w <= 60 && d >= 6 && d <= 60 && h >= 7 && h <= 20) {
      onApply({ widthFt: w, depthFt: d, heightFt: h });
    }
  };

  return (
    <div className="p-4">
      <p className="text-xs text-zinc-500">Dimensions in feet</p>
      <div className="mt-3 space-y-2">
        <label className="block text-xs text-zinc-600">
          Width
          <input
            type="number"
            min={6}
            max={60}
            value={width}
            onChange={(e) => setWidth(e.target.value)}
            className="mt-0.5 w-full rounded border border-zinc-200 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="block text-xs text-zinc-600">
          Depth
          <input
            type="number"
            min={6}
            max={60}
            value={depth}
            onChange={(e) => setDepth(e.target.value)}
            className="mt-0.5 w-full rounded border border-zinc-200 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="block text-xs text-zinc-600">
          Height
          <input
            type="number"
            min={7}
            max={20}
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            className="mt-0.5 w-full rounded border border-zinc-200 px-2 py-1.5 text-sm"
          />
        </label>
      </div>
      <button
        type="button"
        onClick={handleApply}
        disabled={isSaving}
        className="mt-3 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 disabled:opacity-50"
      >
        {isSaving ? 'Applying…' : 'Apply size'}
      </button>
    </div>
  );
}
