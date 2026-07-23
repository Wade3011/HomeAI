'use client';

import clsx from 'clsx';
import { useRef, useState } from 'react';
import { ROOM_TYPE_PRESETS, ROOM_TYPES } from '@/config/roomTypes';
import {
  applyImportLayout,
  defaultUnderlayFromImage,
  IMPORT_LAYOUT_EXAMPLE,
  parseImportLayoutJson,
  type PlanUnderlay,
} from '@/lib/importFloorPlan';
import { createRoom, saveConnections } from '@/lib/api';
import type { RoomConnection, RoomType } from '@/types';
import { formatFeetInches } from '@/lib/imperialDimensions';

export type ImportTool = 'off' | 'calibrate' | 'trace';

export function ImportFloorPlanPanel({
  projectId,
  underlay,
  importTool,
  calibratePickCount,
  knownFeetInput,
  traceRoomType,
  calibratedDistanceFt,
  onUnderlayChange,
  onImportToolChange,
  onKnownFeetInputChange,
  onTraceRoomTypeChange,
  onApplyCalibration,
  onClearCalibrationPicks,
  existingConnections,
  onLayoutImported,
  defaultStoryIndex = 0,
}: {
  projectId: string;
  underlay: PlanUnderlay | null;
  importTool: ImportTool;
  calibratePickCount: number;
  knownFeetInput: string;
  traceRoomType: RoomType;
  calibratedDistanceFt: number | null;
  onUnderlayChange: (next: PlanUnderlay | null) => void;
  onImportToolChange: (tool: ImportTool) => void;
  onKnownFeetInputChange: (value: string) => void;
  onTraceRoomTypeChange: (type: RoomType) => void;
  onApplyCalibration: () => void;
  onClearCalibrationPicks: () => void;
  existingConnections: RoomConnection[];
  onLayoutImported: () => void;
  defaultStoryIndex?: number;
}) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'image' | 'json'>('image');
  const [error, setError] = useState<string | null>(null);
  const [jsonBusy, setJsonBusy] = useState(false);
  const [jsonText, setJsonText] = useState('');

  const loadImageFile = (file: File) => {
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('Use a PNG or JPG of the plan (export PDF pages as images first).');
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (underlay?.url.startsWith('blob:')) URL.revokeObjectURL(underlay.url);
      onUnderlayChange(
        defaultUnderlayFromImage(url, file.name, img.naturalWidth, img.naturalHeight),
      );
      onImportToolChange('calibrate');
      setOpen(true);
      setTab('image');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError('Could not read that image.');
    };
    img.src = url;
  };

  const importJson = async (raw: string) => {
    setError(null);
    setJsonBusy(true);
    try {
      const layout = parseImportLayoutJson(raw);
      await applyImportLayout({
        projectId,
        layout,
        createRoom,
        saveConnections,
        existingConnections,
        defaultStoryIndex,
      });
      onLayoutImported();
      setJsonText('');
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setJsonBusy(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
          underlay || open
            ? 'border-[var(--sage-600)] bg-[var(--sage-50,#f0f4f1)] text-stone-800'
            : 'border-stone-300 bg-white text-stone-700 hover:border-[var(--sage-600)]',
        )}
        title="Import a floor plan image or JSON layout"
      >
        Import plan
      </button>

      {open && (
          <div className="absolute right-0 z-20 mt-1 w-[22rem] rounded-2xl border border-stone-200 bg-white p-3 shadow-xl">
            <div className="mb-2 flex gap-1 rounded-full bg-stone-100 p-0.5 text-xs">
              <TabChip active={tab === 'image'} onClick={() => setTab('image')}>
                Blueprint image
              </TabChip>
              <TabChip active={tab === 'json'} onClick={() => setTab('json')}>
                JSON layout
              </TabChip>
            </div>

            {tab === 'image' ? (
              <div className="space-y-3 text-xs text-stone-600">
                <p>
                  Upload a plan image, set scale with a known wall length, then drag rectangles to
                  create rooms. No AI — you trace the rooms.
                </p>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) loadImageFile(file);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="btn-primary w-full text-xs"
                >
                  {underlay ? 'Replace image…' : 'Upload plan image…'}
                </button>

                {underlay && (
                  <>
                    <p className="truncate text-[11px] text-stone-500">
                      {underlay.fileName}
                      {underlay.calibrated ? ' · calibrated' : ' · not calibrated yet'}
                    </p>
                    <label className="flex items-center justify-between gap-2">
                      <span>Underlay opacity</span>
                      <input
                        type="range"
                        min={0.15}
                        max={0.85}
                        step={0.05}
                        value={underlay.opacity}
                        onChange={(e) =>
                          onUnderlayChange({
                            ...underlay,
                            opacity: Number(e.target.value),
                          })
                        }
                        className="w-32"
                      />
                    </label>

                    <div className="flex flex-wrap gap-1.5">
                      <ToolChip
                        active={importTool === 'calibrate'}
                        onClick={() => {
                          onClearCalibrationPicks();
                          onImportToolChange('calibrate');
                        }}
                      >
                        1. Set scale
                      </ToolChip>
                      <ToolChip
                        active={importTool === 'trace'}
                        onClick={() => onImportToolChange('trace')}
                      >
                        2. Trace rooms
                      </ToolChip>
                      <ToolChip
                        active={importTool === 'off'}
                        onClick={() => onImportToolChange('off')}
                      >
                        Done
                      </ToolChip>
                    </div>

                    {importTool === 'calibrate' && (
                      <div className="space-y-2 rounded-xl bg-stone-50 p-2">
                        <p>
                          Click two ends of a wall on the plan
                          {calibratePickCount === 0
                            ? ' (first point)…'
                            : calibratePickCount === 1
                              ? ' (second point)…'
                              : calibratedDistanceFt != null
                                ? ` — current length ${formatFeetInches(calibratedDistanceFt)}`
                                : ''}
                        </p>
                        {calibratePickCount >= 2 && (
                          <div className="flex items-end gap-2">
                            <label className="flex-1">
                              <span className="text-[11px] font-semibold text-stone-500">
                                Real length (ft)
                              </span>
                              <input
                                type="number"
                                min={1}
                                step={0.5}
                                value={knownFeetInput}
                                onChange={(e) => onKnownFeetInputChange(e.target.value)}
                                className="mt-0.5 w-full rounded-lg border border-stone-300 px-2 py-1 text-sm"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={onApplyCalibration}
                              className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white"
                            >
                              Apply
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {importTool === 'trace' && (
                      <div className="space-y-2 rounded-xl bg-stone-50 p-2">
                        <p>Drag on the plan to draw each room rectangle (min 3′ × 3′).</p>
                        <label className="block">
                          <span className="text-[11px] font-semibold text-stone-500">
                            Room type for next trace
                          </span>
                          <select
                            value={traceRoomType}
                            onChange={(e) =>
                              onTraceRoomTypeChange(e.target.value as RoomType)
                            }
                            className="mt-0.5 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
                          >
                            {ROOM_TYPES.map((type) => (
                              <option key={type} value={type}>
                                {ROOM_TYPE_PRESETS[type].label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        if (underlay.url.startsWith('blob:')) URL.revokeObjectURL(underlay.url);
                        onUnderlayChange(null);
                        onImportToolChange('off');
                      }}
                      className="text-[11px] font-semibold text-stone-500 hover:text-red-600"
                    >
                      Remove underlay
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-2 text-xs text-stone-600">
                <p>
                  Paste or upload a layout JSON with rooms (and optional connections). Keys match
                  connection roomA / roomB.
                </p>
                <textarea
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  rows={8}
                  spellCheck={false}
                  placeholder={IMPORT_LAYOUT_EXAMPLE}
                  className="w-full rounded-xl border border-stone-300 px-2 py-1.5 font-mono text-[11px] text-stone-800"
                />
                <input
                  ref={jsonInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const text = await file.text();
                    setJsonText(text);
                    e.target.value = '';
                  }}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => jsonInputRef.current?.click()}
                    className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold"
                  >
                    Load file…
                  </button>
                  <button
                    type="button"
                    disabled={jsonBusy || !jsonText.trim()}
                    onClick={() => void importJson(jsonText)}
                    className="btn-primary flex-1 text-xs disabled:opacity-50"
                  >
                    {jsonBusy ? 'Importing…' : 'Import rooms'}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setJsonText(IMPORT_LAYOUT_EXAMPLE)}
                  className="text-[11px] font-semibold text-stone-500 hover:text-stone-800"
                >
                  Insert example
                </button>
              </div>
            )}

            {error && <p className="mt-2 text-[11px] text-red-600">{error}</p>}
          </div>
      )}
    </div>
  );
}

function TabChip({
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
        'flex-1 rounded-full px-2 py-1 font-semibold transition',
        active ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500',
      )}
    >
      {children}
    </button>
  );
}

function ToolChip({
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
        'rounded-full px-2.5 py-1 text-[11px] font-semibold transition',
        active
          ? 'bg-stone-900 text-white'
          : 'border border-stone-300 bg-white text-stone-700 hover:border-stone-500',
      )}
    >
      {children}
    </button>
  );
}
