import type { Room, StoryDef, StoryKind } from '@/types';

export const MAIN_STORY_INDEX = 0;

export const DEFAULT_MAIN_STORY: StoryDef = {
  storyIndex: MAIN_STORY_INDEX,
  label: 'Main',
  kind: 'main',
  defaultHeightFt: 9,
};

/** Ensure every project has at least a Main story. */
export function normalizeStories(stories: StoryDef[] | undefined | null): StoryDef[] {
  if (!stories?.length) return [{ ...DEFAULT_MAIN_STORY }];
  const byIndex = new Map<number, StoryDef>();
  for (const s of stories) {
    if (!Number.isFinite(s.storyIndex)) continue;
    byIndex.set(s.storyIndex, {
      storyIndex: s.storyIndex,
      label: s.label?.trim() || defaultLabelForKind(s.kind, s.storyIndex),
      kind: s.kind ?? kindFromIndex(s.storyIndex),
      defaultHeightFt: Math.max(6, Number(s.defaultHeightFt) || 9),
      partialFootprint: Boolean(
        s.partialFootprint ?? (s.kind === 'loft' || s.kind === 'attic'),
      ),
    });
  }
  if (!byIndex.has(MAIN_STORY_INDEX)) {
    byIndex.set(MAIN_STORY_INDEX, { ...DEFAULT_MAIN_STORY });
  }
  return Array.from(byIndex.values()).sort((a, b) => a.storyIndex - b.storyIndex);
}

export function kindFromIndex(storyIndex: number): StoryKind {
  if (storyIndex < 0) return 'basement';
  if (storyIndex === 0) return 'main';
  return 'upper';
}

export function defaultLabelForKind(kind: StoryKind | undefined, storyIndex: number): string {
  switch (kind) {
    case 'basement':
      return storyIndex === -1 ? 'Basement' : `Basement ${Math.abs(storyIndex)}`;
    case 'main':
      return 'Main';
    case 'loft':
      return 'Loft';
    case 'attic':
      return 'Attic';
    case 'upper':
    default:
      return storyIndex === 1 ? 'Second' : `Level ${storyIndex + 1}`;
  }
}

export function resolveRoomStoryIndex(room: Pick<Room, 'storyIndex'>): number {
  return room.storyIndex ?? MAIN_STORY_INDEX;
}

export function roomsOnStory(
  rooms: Room[],
  storyIndex: number,
  opts?: { includeLinkedSite?: boolean },
): Room[] {
  return rooms.filter((r) => {
    if (!opts?.includeLinkedSite && r.linkedSiteStructureId) return false;
    return resolveRoomStoryIndex(r) === storyIndex;
  });
}

/** Site / lot footprint: main story house rooms only (partial lofts don't enlarge the lot pad). */
export function siteFootprintRooms(rooms: Room[]): Room[] {
  return roomsOnStory(rooms, MAIN_STORY_INDEX);
}

export function getStory(
  stories: StoryDef[] | undefined | null,
  storyIndex: number,
): StoryDef | undefined {
  return normalizeStories(stories).find((s) => s.storyIndex === storyIndex);
}

/**
 * Floor elevation (feet) for a story’s finish floor.
 * Main = 0; upper stories stack above; basements go below grade.
 */
export function storyFloorYFt(
  stories: StoryDef[] | undefined | null,
  storyIndex: number,
): number {
  const list = normalizeStories(stories);
  if (storyIndex === MAIN_STORY_INDEX) return 0;

  if (storyIndex > MAIN_STORY_INDEX) {
    let y = 0;
    for (const s of list) {
      if (s.storyIndex >= MAIN_STORY_INDEX && s.storyIndex < storyIndex) {
        y += s.defaultHeightFt;
      }
    }
    return y;
  }

  let y = 0;
  for (const s of list) {
    if (s.storyIndex >= storyIndex && s.storyIndex < MAIN_STORY_INDEX) {
      y -= s.defaultHeightFt;
    }
  }
  return y;
}

export type AddableStoryKind = 'basement' | 'upper' | 'loft' | 'attic';

/** Create the next basement / upper / loft / attic story definition. */
export function buildAddedStory(
  stories: StoryDef[] | undefined | null,
  kind: AddableStoryKind,
): StoryDef {
  const list = normalizeStories(stories);
  const indices = list.map((s) => s.storyIndex);

  if (kind === 'basement') {
    const nextIndex = Math.min(...indices, 0) - 1;
    return {
      storyIndex: nextIndex,
      label: defaultLabelForKind('basement', nextIndex),
      kind: 'basement',
      defaultHeightFt: 8,
      partialFootprint: false,
    };
  }

  const nextIndex = Math.max(...indices, 0) + 1;
  if (kind === 'loft' || kind === 'attic') {
    return {
      storyIndex: nextIndex,
      label: defaultLabelForKind(kind, nextIndex),
      kind,
      defaultHeightFt: kind === 'attic' ? 7 : 8,
      partialFootprint: true,
    };
  }

  return {
    storyIndex: nextIndex,
    label: defaultLabelForKind('upper', nextIndex),
    kind: 'upper',
    defaultHeightFt: 9,
    partialFootprint: false,
  };
}

export function canRemoveStory(
  stories: StoryDef[] | undefined | null,
  storyIndex: number,
  rooms: Room[],
): { ok: true } | { ok: false; reason: string } {
  if (storyIndex === MAIN_STORY_INDEX) {
    return { ok: false, reason: 'Main level cannot be removed' };
  }
  const list = normalizeStories(stories);
  if (!list.some((s) => s.storyIndex === storyIndex)) {
    return { ok: false, reason: 'Story not found' };
  }
  const count = roomsOnStory(rooms, storyIndex, { includeLinkedSite: true }).length;
  if (count > 0) {
    return {
      ok: false,
      reason: `Move or delete ${count} room${count === 1 ? '' : 's'} on this level first`,
    };
  }
  return { ok: true };
}

export function removeStoryFromList(
  stories: StoryDef[] | undefined | null,
  storyIndex: number,
): StoryDef[] {
  return normalizeStories(stories).filter((s) => s.storyIndex !== storyIndex);
}

/** Whether the floor-plan should ghost the main footprint under this story. */
export function shouldGhostMainFootprint(story: StoryDef | undefined): boolean {
  if (!story) return false;
  if (story.storyIndex === MAIN_STORY_INDEX) return false;
  return Boolean(story.partialFootprint || story.kind === 'loft' || story.kind === 'attic' || story.kind === 'upper' || story.kind === 'basement');
}
