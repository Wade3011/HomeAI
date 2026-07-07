'use client';

import clsx from 'clsx';

export function WallToggleButton({
  showWalls,
  onToggle,
  className,
}: {
  showWalls: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={showWalls}
      title={showWalls ? 'Hide walls' : 'Show walls'}
      className={clsx(
        'pointer-events-auto rounded-xl border px-3 py-1.5 text-xs font-semibold shadow-lg backdrop-blur-sm transition',
        showWalls
          ? 'border-white/50 bg-slate-900/75 text-slate-100 hover:bg-slate-900/90'
          : 'border-[var(--sage-600)] bg-[var(--sage-50)] text-[var(--sage-800)] hover:bg-white',
        className,
      )}
    >
      {showWalls ? 'Hide walls' : 'Show walls'}
    </button>
  );
}
