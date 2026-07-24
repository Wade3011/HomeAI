'use client';

import clsx from 'clsx';

export function WalkModeToggleButton({
  walkMode,
  onToggle,
}: {
  walkMode: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={walkMode}
      title={walkMode ? 'Exit walk mode' : 'Walk through the room'}
      className={clsx(
        'rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur transition',
        walkMode
          ? 'border-stone-800 bg-stone-900 text-white'
          : 'border-stone-300 bg-white/95 text-stone-700 hover:border-stone-500',
      )}
    >
      {walkMode ? 'Exit walk' : 'Walk'}
    </button>
  );
}

export function WalkModeHint({
  walkMode,
  locked,
}: {
  walkMode: boolean;
  locked: boolean;
}) {
  if (!walkMode) return null;
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-10 max-w-md rounded-xl border border-white/50 bg-slate-900/80 px-3 py-2 text-xs text-slate-100 shadow-lg backdrop-blur-sm">
      {!locked ? (
        <p>
          <strong>Click</strong> the view to look around · <strong>Esc</strong> or{' '}
          <strong>Exit walk</strong> to leave
        </p>
      ) : (
        <p>
          <strong>↑↓←→</strong> or <strong>WASD</strong> move · mouse look · walls stop you ·
          furniture is walk-through (eye height) · <strong>Esc</strong> release mouse
        </p>
      )}
    </div>
  );
}
