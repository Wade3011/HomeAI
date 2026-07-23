import { describe, expect, it } from 'vitest';
import {
  buildAddedStory,
  canRemoveStory,
  normalizeStories,
  roomsOnStory,
  siteFootprintRooms,
  storyFloorYFt,
} from '@/lib/stories';
import type { Room, StoryDef } from '@/types';

function room(partial: Partial<Room> & Pick<Room, 'roomId'>): Room {
  return {
    projectId: 'p',
    type: 'bedroom',
    name: 'R',
    widthFt: 10,
    depthFt: 10,
    heightFt: 9,
    createdAt: '',
    updatedAt: '',
    ...partial,
  };
}

describe('stories', () => {
  it('defaults to Main when stories missing', () => {
    expect(normalizeStories(undefined)).toEqual([
      expect.objectContaining({ storyIndex: 0, kind: 'main', label: 'Main' }),
    ]);
  });

  it('stacks floor Y for basement, main, upper, loft', () => {
    const stories: StoryDef[] = [
      { storyIndex: -1, label: 'Basement', kind: 'basement', defaultHeightFt: 8 },
      { storyIndex: 0, label: 'Main', kind: 'main', defaultHeightFt: 9 },
      { storyIndex: 1, label: 'Second', kind: 'upper', defaultHeightFt: 9 },
      {
        storyIndex: 2,
        label: 'Loft',
        kind: 'loft',
        defaultHeightFt: 8,
        partialFootprint: true,
      },
    ];
    expect(storyFloorYFt(stories, -1)).toBe(-8);
    expect(storyFloorYFt(stories, 0)).toBe(0);
    expect(storyFloorYFt(stories, 1)).toBe(9);
    expect(storyFloorYFt(stories, 2)).toBe(18);
  });

  it('adds loft as partial upper story', () => {
    const loft = buildAddedStory([{ storyIndex: 0, label: 'Main', kind: 'main', defaultHeightFt: 9 }], 'loft');
    expect(loft.storyIndex).toBe(1);
    expect(loft.kind).toBe('loft');
    expect(loft.partialFootprint).toBe(true);
  });

  it('filters rooms per story and site footprint uses main only', () => {
    const rooms = [
      room({ roomId: 'm', storyIndex: 0, widthFt: 20, depthFt: 20 }),
      room({ roomId: 'l', storyIndex: 1, widthFt: 8, depthFt: 10, layoutX: 2, layoutZ: 2 }),
    ];
    expect(roomsOnStory(rooms, 1).map((r) => r.roomId)).toEqual(['l']);
    expect(siteFootprintRooms(rooms).map((r) => r.roomId)).toEqual(['m']);
  });

  it('blocks removing main or occupied stories', () => {
    const stories = normalizeStories([
      { storyIndex: 0, label: 'Main', kind: 'main', defaultHeightFt: 9 },
      { storyIndex: 1, label: 'Loft', kind: 'loft', defaultHeightFt: 8, partialFootprint: true },
    ]);
    expect(canRemoveStory(stories, 0, []).ok).toBe(false);
    expect(canRemoveStory(stories, 1, [room({ roomId: 'x', storyIndex: 1 })]).ok).toBe(false);
    expect(canRemoveStory(stories, 1, []).ok).toBe(true);
  });
});
