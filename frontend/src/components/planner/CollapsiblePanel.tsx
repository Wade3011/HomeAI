'use client';

import clsx from 'clsx';
import { ReactNode, useState } from 'react';

export function CollapsiblePanel({
  title,
  side = 'left',
  defaultOpen = false,
  widthClass = 'w-56',
  children,
}: {
  title: string;
  side?: 'left' | 'right';
  defaultOpen?: boolean;
  widthClass?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const borderClass = side === 'left' ? 'border-r' : 'border-l';
  const CollapseIcon = side === 'left' ? (open ? '‹' : '›') : open ? '›' : '‹';

  if (!open) {
    return (
      <aside
        className={clsx(
          'flex w-9 shrink-0 flex-col items-center border-zinc-200 bg-zinc-50',
          borderClass,
        )}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          title={`Show ${title}`}
          aria-expanded={false}
          aria-label={`Expand ${title}`}
          className="flex w-full items-center justify-center border-b border-zinc-200 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
        >
          {CollapseIcon}
        </button>
        <span
          className="mt-3 select-none px-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500"
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
        'flex shrink-0 flex-col border-zinc-200 bg-white',
        widthClass,
        borderClass,
      )}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 bg-zinc-50 px-2 py-1.5">
        <h2 className="truncate text-xs font-semibold uppercase tracking-wide text-zinc-600">
          {title}
        </h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          title={`Hide ${title}`}
          aria-expanded
          aria-label={`Collapse ${title}`}
          className="rounded px-1.5 py-0.5 text-sm text-zinc-500 hover:bg-zinc-200"
        >
          {CollapseIcon}
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </aside>
  );
}
