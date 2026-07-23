'use client';

import clsx from 'clsx';
import { useState } from 'react';
import {
  buildAddedStory,
  canRemoveStory,
  normalizeStories,
  type AddableStoryKind,
} from '@/lib/stories';
import type { Room, StoryDef } from '@/types';

const ADD_OPTIONS: { kind: AddableStoryKind; label: string; hint: string }[] = [
  { kind: 'basement', label: 'Basement', hint: 'Full level below grade' },
  { kind: 'upper', label: 'Upper floor', hint: 'Full (or near-full) floor plate' },
  { kind: 'loft', label: 'Loft', hint: 'Partial footprint over part of the house' },
  { kind: 'attic', label: 'Attic', hint: 'Partial upper storage / bonus space' },
];

export function StoryLevelBar({
  stories,
  rooms,
  activeStoryIndex,
  busy,
  onSelectStory,
  onChangeStories,
}: {
  stories: StoryDef[] | undefined;
  rooms: Room[];
  activeStoryIndex: number;
  busy?: boolean;
  onSelectStory: (storyIndex: number) => void;
  onChangeStories: (next: StoryDef[]) => void;
}) {
  const list = normalizeStories(stories);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = list.find((s) => s.storyIndex === activeStoryIndex) ?? list[0];

  const addStory = (kind: AddableStoryKind) => {
    const nextStory = buildAddedStory(list, kind);
    onChangeStories([...list, nextStory]);
    onSelectStory(nextStory.storyIndex);
    setMenuOpen(false);
    setError(null);
  };

  const removeActive = () => {
    const check = canRemoveStory(list, activeStoryIndex, rooms);
    if (!check.ok) {
      setError(check.reason);
      return;
    }
    const next = list.filter((s) => s.storyIndex !== activeStoryIndex);
    onChangeStories(next);
    onSelectStory(0);
    setError(null);
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Stories</p>
          <p className="mt-0.5 text-[11px] text-stone-500">
            Edit one level at a time. Lofts &amp; attics can be a partial footprint — main outline
            ghosts underneath.
          </p>
        </div>
        <div className="relative">
          <button
            type="button"
            disabled={busy}
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:border-[var(--sage-600)] disabled:opacity-50"
          >
            + Add level
          </button>
          {menuOpen && (
            <div className="absolute right-0 z-30 mt-1 w-64 rounded-xl border border-stone-200 bg-white p-1.5 shadow-lg">
              {ADD_OPTIONS.map((opt) => (
                <button
                  key={opt.kind}
                  type="button"
                  disabled={busy}
                  onClick={() => addStory(opt.kind)}
                  className="block w-full rounded-lg px-2.5 py-2 text-left hover:bg-stone-50"
                >
                  <span className="block text-xs font-semibold text-stone-800">{opt.label}</span>
                  <span className="block text-[11px] text-stone-500">{opt.hint}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {list.map((story) => {
          const selected = story.storyIndex === active.storyIndex;
          return (
            <button
              key={story.storyIndex}
              type="button"
              disabled={busy}
              onClick={() => {
                onSelectStory(story.storyIndex);
                setError(null);
              }}
              className={clsx(
                'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                selected
                  ? 'bg-stone-900 text-white'
                  : 'border border-stone-300 bg-white text-stone-700 hover:border-stone-500',
              )}
              title={
                story.partialFootprint
                  ? `${story.label} (partial footprint)`
                  : story.label
              }
            >
              {story.label}
              {story.partialFootprint ? ' · partial' : ''}
            </button>
          );
        })}
        {active.storyIndex !== 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={removeActive}
            className="ml-1 text-[11px] font-semibold text-stone-500 hover:text-red-600 disabled:opacity-50"
          >
            Remove {active.label}
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-[11px] text-red-600">{error}</p>}
    </div>
  );
}
