import { describe, expect, it } from 'vitest';
import {
  buildFloorPlanExportSvg,
  floorPlanExportFilename,
} from '@/lib/exportFloorPlan';
import type { Room } from '@/types';

function room(partial: Partial<Room> & Pick<Room, 'roomId' | 'name' | 'type'>): Room {
  const t = new Date().toISOString();
  return {
    projectId: 'proj-1',
    widthFt: 12,
    depthFt: 10,
    heightFt: 9,
    layoutX: 0,
    layoutZ: 0,
    createdAt: t,
    updatedAt: t,
    ...partial,
  };
}

describe('exportFloorPlan', () => {
  it('includes project title, house size, room dims, and schedule', () => {
    const rooms: Room[] = [
      room({
        roomId: 'r1',
        name: 'Kitchen',
        type: 'kitchen',
        widthFt: 14,
        depthFt: 12,
        layoutX: 0,
        layoutZ: 0,
      }),
      room({
        roomId: 'r2',
        name: 'Living',
        type: 'living',
        widthFt: 18,
        depthFt: 16,
        layoutX: 14.5,
        layoutZ: 0,
      }),
    ];

    const svg = buildFloorPlanExportSvg({ projectName: 'Demo Home', rooms });

    expect(svg).toContain('Demo Home');
    expect(svg).toContain('House size:');
    expect(svg).toContain('Total area:');
    expect(svg).toContain('ROOM SCHEDULE');
    expect(svg).toContain('Kitchen');
    expect(svg).toContain('Living');
    expect(svg).toContain('wide');
    expect(svg).toContain('long');
    // Feet marks are XML-escaped in the SVG payload
    expect(svg).toContain('14&apos;');
    expect(svg).toContain('12&apos;');
  });

  it('excludes linked site-structure rooms from house export', () => {
    const rooms: Room[] = [
      room({ roomId: 'r1', name: 'Bedroom', type: 'bedroom', widthFt: 12, depthFt: 11 }),
      room({
        roomId: 'r2',
        name: 'Detached Garage',
        type: 'garage',
        widthFt: 24,
        depthFt: 24,
        linkedSiteStructureId: 'site-1',
      }),
    ];

    const svg = buildFloorPlanExportSvg({ projectName: 'Lot', rooms });
    expect(svg).toContain('Bedroom');
    expect(svg).not.toContain('Detached Garage');
    expect(svg).toContain('Rooms: 1');
  });

  it('builds a stable filename slug', () => {
    expect(floorPlanExportFilename('7629 Kraenzlein Rd', 'svg')).toBe(
      '7629-kraenzlein-rd-floor-plan.svg',
    );
  });
});
