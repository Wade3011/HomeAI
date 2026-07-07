'use client';

import clsx from 'clsx';
import { ReactNode, useState } from 'react';

export function CollapsiblePanel({
  title,
  side = 'left',
  defaultOpen = false,
  widthClass = 'w-56',
  onOpenChange,
  children,
}: {
  title: string;
  side?: 'left' | 'right';
  defaultOpen?: boolean;
  widthClass?: string;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const setPanelOpen = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  const borderClass = side === 'left' ? 'border-r' : 'border-l';
  const CollapseIcon = side === 'left' ? (open ? '‹' : '›') : open ? '›' : '‹';

  if (!open) {
    return (
      <aside
        className={clsx(
          'flex w-9 shrink-0 flex-col items-center border-stone-200 bg-stone-50',
          borderClass,
        )}
      >
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          title={`Show ${title}`}
          aria-expanded={false}
          aria-label={`Expand ${title}`}
          className="flex w-full items-center justify-center border-b border-stone-200 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100"
        >
          {CollapseIcon}
        </button>
        <span
          className="mt-3 select-none px-1 text-[10px] font-semibold uppercase tracking-wider text-stone-500"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        >
          {title}
        </span>
      </aside>
    );
  }

  return (
    <aside
      className={clsx(
        'flex shrink-0 flex-col border-stone-200 bg-white',
        widthClass,
        borderClass,
      )}
    >
      <div className="panel-header flex shrink-0 items-center justify-between px-2 py-2">
        <h2 className="truncate text-xs font-bold uppercase tracking-wide">{title}</h2>
        <button
          type="button"
          onClick={() => setPanelOpen(false)}
          title={`Hide ${title}`}
          aria-expanded
          aria-label={`Collapse ${title}`}
          className="rounded-md bg-white/15 px-1.5 py-0.5 text-sm transition hover:bg-white/25"
        >
          {CollapseIcon}
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-stone-50/40">{children}</div>
    </aside>
  );
}
