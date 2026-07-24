import { describe, expect, it } from 'vitest';
import {
  resolveWalkPosition,
  wallSegmentsLocal,
} from '@/lib/walkCollision';
import type { RoomWallPlan } from '@/lib/homeLayout';

const closedBox: RoomWallPlan[] = [
  { side: 'back', length: 12, openings: [] },
  { side: 'front', length: 12, openings: [] },
  { side: 'left', length: 10, openings: [] },
  { side: 'right', length: 10, openings: [] },
];

describe('walkCollision', () => {
  it('builds four closed walls for a box room', () => {
    const segs = wallSegmentsLocal({ widthFt: 12, depthFt: 10 }, closedBox);
    expect(segs).toHaveLength(4);
  });

  it('leaves a gap for a door opening', () => {
    const plans: RoomWallPlan[] = [
      { side: 'back', length: 12, openings: [] },
      { side: 'front', length: 12, openings: [{ kind: 'door', start: 4.5, end: 7.5 }] },
      { side: 'left', length: 10, openings: [] },
      { side: 'right', length: 10, openings: [] },
    ];
    const segs = wallSegmentsLocal({ widthFt: 12, depthFt: 10 }, plans);
    const front = segs.filter((s) => s.z1 === 10 && s.z2 === 10);
    expect(front.length).toBe(2);
    // Center of doorway at (6, 10) should not push a circle sitting in the gap
    const mid = resolveWalkPosition(6, 10, 0.5, segs);
    expect(mid.z).toBeCloseTo(10, 1);
  });

  it('pushes the player off a solid wall', () => {
    const segs = wallSegmentsLocal({ widthFt: 12, depthFt: 10 }, closedBox);
    const resolved = resolveWalkPosition(6, 0.2, 0.85, segs);
    expect(resolved.z).toBeGreaterThanOrEqual(0.85 - 0.01);
  });
});
