'use client';

import type { CustomItemShape, CustomItemSpec } from '@/types';
import { isSectionalShape, sectionalDefaults, sectionalShapeLabel } from '@/lib/sectionalGeometry';

const SHAPES: { id: CustomItemShape; label: string }[] = [
  { id: 'box', label: 'Box' },
  { id: 'round', label: 'Round' },
  { id: 'sectional-l', label: 'L-sectional' },
  { id: 'sectional-chase', label: 'Chaise' },
  { id: 'sectional-u', label: 'U-sectional' },
];

export function CustomPlacementEditor({
  customItem,
  onChange,
}: {
  customItem: CustomItemSpec;
  onChange: (patch: Partial<CustomItemSpec>) => void;
}) {
  return (
    <div className="mt-3 space-y-2 border-t border-stone-100 pt-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
        Custom item (editable)
      </p>
      <label className="block text-[11px] text-stone-600">
        Label
        <input
          type="text"
          value={customItem.label}
          onChange={(e) => onChange({ label: e.target.value })}
          className="input-modern mt-1 w-full py-1.5 text-xs"
        />
      </label>
      <fieldset>
        <legend className="text-[11px] text-stone-600">Shape</legend>
        <div className="mt-1 flex flex-wrap gap-1">
          {SHAPES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                const patch: Partial<CustomItemSpec> = { shape: s.id };
                if (isSectionalShape(s.id)) {
                  const defaults = sectionalDefaults(s.id);
                  patch.sectionalRunIn = customItem.sectionalRunIn ?? defaults.sectionalRunIn;
                  patch.sectionalArmDepthIn =
                    customItem.sectionalArmDepthIn ?? defaults.sectionalArmDepthIn;
                }
                onChange(patch);
              }}
              className={`rounded-lg border px-2 py-1.5 text-[10px] font-medium transition ${
                customItem.shape === s.id
                  ? 'border-[var(--sage-600)] bg-[var(--sage-50)] text-[var(--sage-800)]'
                  : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </fieldset>
      {isSectionalShape(customItem.shape) ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-1.5">
            <DimField
              label="Main width"
              inches={customItem.widthIn}
              onChange={(widthIn) => onChange({ widthIn })}
            />
            <DimField
              label="Seat depth"
              inches={customItem.depthIn}
              onChange={(depthIn) => onChange({ depthIn })}
            />
            <DimField
              label={customItem.shape === 'sectional-u' ? 'Arm run' : 'Chaise run'}
              inches={customItem.sectionalRunIn ?? sectionalDefaults(customItem.shape).sectionalRunIn}
              onChange={(sectionalRunIn) => onChange({ sectionalRunIn })}
            />
            <DimField
              label={customItem.shape === 'sectional-u' ? 'Arm width' : 'Chaise width'}
              inches={
                customItem.sectionalArmDepthIn ??
                sectionalDefaults(customItem.shape).sectionalArmDepthIn
              }
              onChange={(sectionalArmDepthIn) => onChange({ sectionalArmDepthIn })}
            />
          </div>
          <DimField
            label="Height"
            inches={customItem.heightIn}
            onChange={(heightIn) => onChange({ heightIn })}
          />
          <p className="text-[10px] text-stone-400">
            {sectionalShapeLabel(customItem.shape)} · sizes in inches
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          <DimField
            label="Width"
            inches={customItem.widthIn}
            onChange={(widthIn) => onChange({ widthIn })}
          />
          <DimField
            label="Depth"
            inches={customItem.depthIn}
            onChange={(depthIn) => onChange({ depthIn })}
          />
          <DimField
            label="Height"
            inches={customItem.heightIn}
            onChange={(heightIn) => onChange({ heightIn })}
          />
        </div>
      )}
      {!isSectionalShape(customItem.shape) && (
        <p className="text-[10px] text-stone-400">Sizes in inches. No catalog pricing.</p>
      )}
    </div>
  );
}

function DimField({
  label,
  inches,
  onChange,
}: {
  label: string;
  inches: number;
  onChange: (inches: number) => void;
}) {
  return (
    <label className="block text-[10px] text-stone-500">
      {label} (in)
      <input
        type="number"
        min={6}
        max={240}
        step={1}
        value={Math.round(inches)}
        onChange={(e) => onChange(Math.max(6, Number(e.target.value) || 6))}
        className="input-modern mt-0.5 w-full py-1 text-xs"
      />
    </label>
  );
}
