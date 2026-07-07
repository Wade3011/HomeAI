import { KRAENZLEIN_7629_PRESET, type FloorPlanPresetDef } from '@/data/floorPlanPresets/kraenzlein-7629';
import { ROOM_GAP_FT } from '@/lib/floorPlanSnap';
import type { ExteriorDoor, Project, Room, RoomConnection } from '@/types';

export type { FloorPlanPresetDef } from '@/data/floorPlanPresets/kraenzlein-7629';

export const FLOOR_PLAN_PRESETS: FloorPlanPresetDef[] = [KRAENZLEIN_7629_PRESET];

export function getFloorPlanPreset(presetId: string): FloorPlanPresetDef | undefined {
  return FLOOR_PLAN_PRESETS.find((p) => p.id === presetId);
}

function roomIdForPreset(projectId: string, presetRoomKey: string): string {
  return `room-${presetRoomKey}-${projectId.slice(-8)}`;
}

/**
 * Preset rooms are laid out edge-to-edge using stud-face dimensions from the
 * blueprint. To make the shared walls visible on the floor plan we insert a
 * `ROOM_GAP_FT` (= wall thickness) gap at every interior wall by shifting
 * rooms outward.
 */
function expandWallGaps(
  defs: FloorPlanPresetDef['rooms'],
): FloorPlanPresetDef['rooms'] {
  const eps = 1e-6;
  const xEdges = Array.from(
    new Set(defs.flatMap((d) => [d.layoutX, d.layoutX + d.widthFt])),
  ).sort((a, b) => a - b);
  const sharedX = xEdges.filter(
    (x) =>
      defs.some((d) => Math.abs(d.layoutX - x) < eps) &&
      defs.some((d) => Math.abs(d.layoutX + d.widthFt - x) < eps),
  );

  const zEdges = Array.from(
    new Set(defs.flatMap((d) => [d.layoutZ, d.layoutZ + d.depthFt])),
  ).sort((a, b) => a - b);
  const sharedZ = zEdges.filter(
    (z) =>
      defs.some((d) => Math.abs(d.layoutZ - z) < eps) &&
      defs.some((d) => Math.abs(d.layoutZ + d.depthFt - z) < eps),
  );

  return defs.map((d) => {
    const xShift =
      sharedX.filter((x) => d.layoutX > x - eps).length * ROOM_GAP_FT;
    const zShift =
      sharedZ.filter((z) => d.layoutZ > z - eps).length * ROOM_GAP_FT;
    return {
      ...d,
      layoutX: d.layoutX + xShift,
      layoutZ: d.layoutZ + zShift,
    };
  });
}

export function buildRoomsFromPreset(projectId: string, preset: FloorPlanPresetDef): Room[] {
  const t = new Date().toISOString();
  const defs = expandWallGaps(preset.rooms);
  return defs.map((def) => ({
    roomId: roomIdForPreset(projectId, def.key),
    projectId,
    type: def.type,
    name: def.name,
    widthFt: def.widthFt,
    depthFt: def.depthFt,
    heightFt: def.heightFt ?? 9,
    layoutX: def.layoutX,
    layoutZ: def.layoutZ,
    createdAt: t,
    updatedAt: t,
  }));
}

export function buildConnectionsFromPreset(
  projectId: string,
  preset: FloorPlanPresetDef,
): RoomConnection[] {
  return preset.connections.map((c, i) => ({
    connectionId: `conn-${preset.id}-${i}-${projectId.slice(-8)}`,
    projectId,
    roomAId: roomIdForPreset(projectId, c.roomA),
    roomBId: roomIdForPreset(projectId, c.roomB),
    kind: c.kind,
  }));
}

export function buildExteriorDoorsFromPreset(
  projectId: string,
  preset: FloorPlanPresetDef,
): ExteriorDoor[] {
  return preset.exteriorDoors.map((d, i) => ({
    doorId: `ext-${preset.id}-${i}-${projectId.slice(-8)}`,
    projectId,
    roomId: roomIdForPreset(projectId, d.room),
    side: d.side,
    offsetFt: d.offsetFt,
    widthFt: d.widthFt,
  }));
}

export interface ProjectFromPresetResult {
  project: Project;
  rooms: Room[];
  connections: RoomConnection[];
  exteriorDoors: ExteriorDoor[];
}
