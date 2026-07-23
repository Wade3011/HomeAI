import { describe, expect, it, vi } from 'vitest';
import {
  applyImportLayout,
  defaultUnderlayFromImage,
  parseImportLayoutJson,
  rectToRoomLayout,
  rescaleUnderlayByCalibration,
  unionBoundsWithUnderlay,
} from '@/lib/importFloorPlan';
import type { Room } from '@/types';

describe('importFloorPlan', () => {
  it('places a default underlay at 60 ft wide', () => {
    const u = defaultUnderlayFromImage('blob:x', 'plan.png', 1200, 800);
    expect(u.widthFt).toBe(60);
    expect(u.heightFt).toBeCloseTo(40);
    expect(u.calibrated).toBe(false);
  });

  it('rescales underlay from a known length', () => {
    const u = defaultUnderlayFromImage('blob:x', 'plan.png', 1000, 1000);
    // Image is 60×60 ft; a segment 30 plan-ft long that should be 15 real ft → half scale
    const next = rescaleUnderlayByCalibration(u, { x: 0, z: 0 }, { x: 30, z: 0 }, 15);
    expect(next.widthFt).toBeCloseTo(30);
    expect(next.heightFt).toBeCloseTo(30);
    expect(next.calibrated).toBe(true);
    expect(next.originX).toBeCloseTo(0);
    expect(next.originZ).toBeCloseTo(0);
  });

  it('rejects tiny traced rooms', () => {
    expect(rectToRoomLayout(0, 0, 2, 2)).toBeNull();
    expect(rectToRoomLayout(0, 0, 10, 12)).toEqual({
      layoutX: 0,
      layoutZ: 0,
      widthFt: 10,
      depthFt: 12,
    });
  });

  it('expands canvas bounds with underlay', () => {
    const underlay = defaultUnderlayFromImage('blob:x', 'a.png', 100, 100);
    const bounds = unionBoundsWithUnderlay(
      { minX: 0, minZ: 0, maxX: 20, maxZ: 20, widthFt: 20, depthFt: 20 },
      underlay,
      0,
    );
    expect(bounds.widthFt).toBe(60);
  });

  it('parses layout JSON and applies rooms + connections', async () => {
    const layout = parseImportLayoutJson(`{
      "rooms": [
        { "key": "a", "name": "A", "type": "kitchen", "widthFt": 12, "depthFt": 10, "layoutX": 0, "layoutZ": 0 },
        { "key": "b", "name": "B", "type": "living", "widthFt": 14, "depthFt": 12, "layoutX": 12.5, "layoutZ": 0 }
      ],
      "connections": [{ "roomA": "a", "roomB": "b", "kind": "open" }]
    }`);

    let n = 0;
    const createRoom = vi.fn(async (_pid: string, input: Partial<Room>) => {
      n += 1;
      return {
        roomId: `room-${n}`,
        projectId: 'p1',
        type: input.type ?? 'other',
        name: input.name ?? 'Room',
        widthFt: input.widthFt ?? 10,
        depthFt: input.depthFt ?? 10,
        heightFt: 9,
        layoutX: input.layoutX,
        layoutZ: input.layoutZ,
        createdAt: '',
        updatedAt: '',
      } as Room;
    });
    const saveConnections = vi.fn(async (_pid, connections) => connections);

    const result = await applyImportLayout({
      projectId: 'p1',
      layout,
      createRoom,
      saveConnections,
    });

    expect(result.rooms).toHaveLength(2);
    expect(saveConnections).toHaveBeenCalledOnce();
    expect(result.connections[0]?.kind).toBe('open');
  });
});
