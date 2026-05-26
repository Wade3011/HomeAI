'use client';

import clsx from 'clsx';
import {
  CUSTOM_ITEM_TEMPLATES,
  templatesForRoomType,
  type CustomItemTemplate,
} from '@/config/roomTypes';
import { formatFeetInches } from '@/lib/imperialDimensions';
import { customDragFromTemplate } from '@/lib/customItems';
import { sectionalShapeLabel } from '@/lib/sectionalGeometry';
import type { CustomDragTemplate } from '@/lib/customItems';
import type { RoomType } from '@/types';

export function CustomItemsPanel({
  roomType,
  activeTemplateId,
  onPick,
}: {
  roomType: RoomType;
  activeTemplateId: string | null;
  onPick: (template: CustomDragTemplate) => void;
}) {
  const templates = templatesForRoomType(roomType);

  return (
    <div className="flex flex-col gap-2 p-2">
      <p className="px-1 text-xs leading-snug text-stone-500">
        Place custom furniture blocks. After placing, edit shape and size in the selection panel.
        No catalog pricing — layout only.
      </p>
      <div className="grid gap-1.5">
        {templates.map((t) => (
          <TemplateRow
            key={t.id}
            template={t}
            active={activeTemplateId === t.id}
            onPick={() => onPick(customDragFromTemplate(t))}
          />
        ))}
      </div>
    </div>
  );
}

function TemplateRow({
  template,
  active,
  onPick,
}: {
  template: CustomItemTemplate;
  active: boolean;
  onPick: () => void;
}) {
  const shapeLabel = sectionalShapeLabel(template.shape);
  const w = template.widthIn / 12;
  const d = template.depthIn / 12;
  const h = template.heightIn / 12;
  const dimNote =
    template.shape === 'sectional-l' ||
    template.shape === 'sectional-chase' ||
    template.shape === 'sectional-u'
      ? `${formatDim(w)} main + ${formatDim((template.sectionalRunIn ?? 68) / 12)} run`
      : `${formatDim(w)} × ${formatDim(d)} × ${formatDim(h)} (default)`;

  return (
    <button
      type="button"
      onClick={onPick}
      className={clsx(
        'w-full rounded-xl border px-3 py-2.5 text-left text-sm transition',
        active
          ? 'border-[var(--sage-600)] bg-[var(--sage-50)] ring-1 ring-[var(--sage-600)]'
          : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold text-stone-800">{template.label}</span>
        <span className="shrink-0 rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-stone-500">
          {shapeLabel}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-stone-500">{dimNote}</p>
    </button>
  );
}

function formatDim(ft: number) {
  return formatFeetInches(ft);
}

/** All templates (for reference / tests) */
export { CUSTOM_ITEM_TEMPLATES };
