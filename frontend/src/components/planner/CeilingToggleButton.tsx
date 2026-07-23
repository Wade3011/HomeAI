'use client';

import clsx from 'clsx';

export function CeilingToggleButton({
  showCeilings,
  onToggle,
  className,
}: {
  showCeilings: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={showCeilings}
      title={showCeilings ? 'Hide ceilings' : 'Show ceilings'}
      className={clsx(
        'pointer-events-auto rounded-xl border px-3 py-1.5 text-xs font-semibold shadow-lg backdrop-blur-sm transition',
        showCeilings
          ? 'border-white/50 bg-slate-900/75 text-slate-100 hover:bg-slate-900/90'
          : 'border-[var(--sage-600)] bg-[var(--sage-50)] text-[var(--sage-800)] hover:bg-white',
        className,
      )}
    >
      {showCeilings ? 'Hide ceiling' : 'Show ceiling'}
    </button>
  );
}
