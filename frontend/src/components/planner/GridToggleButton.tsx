'use client';

import clsx from 'clsx';

export function GridToggleButton({
  showGrid,
  onToggle,
  className,
}: {
  showGrid: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={showGrid}
      title={showGrid ? 'Hide grid' : 'Show grid'}
      className={clsx(
        'pointer-events-auto rounded-xl border px-3 py-1.5 text-xs font-semibold shadow-lg backdrop-blur-sm transition',
        showGrid
          ? 'border-white/50 bg-slate-900/75 text-slate-100 hover:bg-slate-900/90'
          : 'border-[var(--sage-600)] bg-[var(--sage-50)] text-[var(--sage-800)] hover:bg-white',
        className,
      )}
    >
      {showGrid ? 'Hide grid' : 'Show grid'}
    </button>
  );
}
