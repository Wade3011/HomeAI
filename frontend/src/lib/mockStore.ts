import { getCatalogItem, getCatalogItems } from '@/lib/catalog';
import { computeConnectedLayoutPatches, enrichConnectionSides } from '@/lib/homeLayout';
import {
  buildConnectionsFromPreset,
  buildExteriorDoorsFromPreset,
  buildRoomsFromPreset,
  getFloorPlanPreset,
  type ProjectFromPresetResult,
} from '@/lib/floorPlanPresets';
import { KRAENZLEIN_7629_PRESET } from '@/data/floorPlanPresets/kraenzlein-7629';
import type { ExteriorDoor, Placement, Project, Room, RoomConnection } from '@/types';
import { ROOM_TYPE_PRESETS, normalizeRoomType } from '@/config/roomTypes';

export const DEV_PROJECT_ID = 'dev-project-1';
export const DEV_ROOM_ID = 'dev-room-kitchen';
export const KRAENZLEIN_PROJECT_ID = 'kraenzlein-7629';
export const KRAENZLEIN_PRESET_VERSION = KRAENZLEIN_7629_PRESET.version;
export const KRAENZLEIN_KITCHEN_ROOM_ID = `room-kitchen-${KRAENZLEIN_PROJECT_ID.slice(-8)}`;

const now = new Date().toISOString();

let projects: Project[] = [
  {
    projectId: DEV_PROJECT_ID,
    ownerUserId: 'dev-user',
    name: 'Demo Home',
    unitSystem: 'imperial',
    createdAt: now,
    updatedAt: now,
  },
];

let rooms: Room[] = [
  {
    roomId: DEV_ROOM_ID,
    projectId: DEV_PROJECT_ID,
    type: 'kitchen',
    name: 'Kitchen',
    widthFt: 14,
    depthFt: 12,
    heightFt: 9,
    layoutX: 0,
    layoutZ: 0,
    createdAt: now,
    updatedAt: now,
  },
  {
    roomId: 'dev-room-bathroom',
    projectId: DEV_PROJECT_ID,
    type: 'bathroom',
    name: 'Bathroom',
    widthFt: 8,
    depthFt: 8,
    heightFt: 9,
    layoutX: 16,
    layoutZ: 0,
    createdAt: now,
    updatedAt: now,
  },
  {
    roomId: 'dev-room-living',
    projectId: DEV_PROJECT_ID,
    type: 'living',
    name: 'Living Room',
    widthFt: 16,
    depthFt: 14,
    heightFt: 9,
    layoutX: 0,
    layoutZ: 12,
    createdAt: now,
    updatedAt: now,
  },
];

let placements: Placement[] = [];

let connections: RoomConnection[] = [
  {
    connectionId: 'conn-demo-kitchen-living',
    projectId: DEV_PROJECT_ID,
    roomAId: DEV_ROOM_ID,
    roomBId: 'dev-room-living',
    kind: 'open',
    sideA: 'front',
    sideB: 'back',
  },
];

let exteriorDoors: ExteriorDoor[] = [];

function applyPresetToStore(result: ProjectFromPresetResult): ProjectFromPresetResult {
  projects = [...projects, result.project];
  rooms = [...rooms, ...result.rooms];
  connections = [...connections, ...result.connections];
  exteriorDoors = [...exteriorDoors, ...result.exteriorDoors];
  return result;
}

function buildPresetProject(
  presetId: string,
  projectId: string,
  projectName: string,
): ProjectFromPresetResult | undefined {
  const preset = getFloorPlanPreset(presetId);
  if (!preset) return undefined;
  const t = new Date().toISOString();
  const project: Project = {
    projectId,
    ownerUserId: 'dev-user',
    name: projectName,
    unitSystem: 'imperial',
    createdAt: t,
    updatedAt: t,
  };
  const presetRooms = buildRoomsFromPreset(projectId, preset);
  const roomsById = new Map(presetRooms.map((r) => [r.roomId, r]));
  const presetConnections = buildConnectionsFromPreset(projectId, preset).map((c) =>
    enrichConnectionSides(c, roomsById),
  );
  return {
    project,
    rooms: presetRooms,
    connections: presetConnections,
    exteriorDoors: buildExteriorDoorsFromPreset(projectId, preset),
  };
}

function wipeProject(projectId: string): void {
  const roomIds = new Set(
    rooms.filter((r) => r.projectId === projectId).map((r) => r.roomId),
  );
  projects = projects.filter((p) => p.projectId !== projectId);
  rooms = rooms.filter((r) => r.projectId !== projectId);
  connections = connections.filter((c) => c.projectId !== projectId);
  exteriorDoors = exteriorDoors.filter((d) => d.projectId !== projectId);
  placements = placements.filter((p) => !roomIds.has(p.roomId));
}

function seedKraenzleinProject(): void {
  wipeProject(KRAENZLEIN_PROJECT_ID);
  applyPresetToStore(
    buildPresetProject(
      'kraenzlein-7629',
      KRAENZLEIN_PROJECT_ID,
      '7629 Kraenzlein Rd',
    )!,
  );
}

let kraenzleinAppliedVersion = -1;
if (kraenzleinAppliedVersion !== KRAENZLEIN_PRESET_VERSION) {
  seedKraenzleinProject();
  kraenzleinAppliedVersion = KRAENZLEIN_PRESET_VERSION;
}

export function createProjectFromPreset(
  presetId: string,
  name?: string,
): ProjectFromPresetResult | undefined {
  const preset = getFloorPlanPreset(presetId);
  if (!preset) return undefined;
  const projectId = `proj-${crypto.randomUUID()}`;
  const result = buildPresetProject(presetId, projectId, name ?? preset.name);
  if (!result) return undefined;
  return applyPresetToStore(result);
}

export interface UpdateRoomResult {
  room: Room;
  /** Rooms whose floor-plan position shifted to preserve connections. */
  adjustedRooms: Room[];
}

export function getCatalog() {
  return getCatalogItems();
}

export { getCatalogItem };

export function getProjects(): Project[] {
  return projects;
}

export function createProject(name: string): Project {
  const t = new Date().toISOString();
  const project: Project = {
    projectId: `proj-${crypto.randomUUID()}`,
    ownerUserId: 'dev-user',
    name,
    unitSystem: 'imperial',
    createdAt: t,
    updatedAt: t,
  };
  projects = [...projects, project];
  return project;
}

export function getProject(projectId: string): Project | undefined {
  return projects.find((p) => p.projectId === projectId);
}

/**
 * Self-heal projects orphaned by a dev-server restart (which wipes in-memory state).
 * If a request comes in for a `proj-*` ID we don't know about, materialize an empty
 * project so the user's browser URL keeps working instead of getting 404s.
 */
export function ensureProject(projectId: string): Project | undefined {
  const existing = projects.find((p) => p.projectId === projectId);
  if (existing) return existing;
  if (!projectId.startsWith('proj-')) return undefined;
  const t = new Date().toISOString();
  const project: Project = {
    projectId,
    ownerUserId: 'dev-user',
    name: 'My Home',
    unitSystem: 'imperial',
    createdAt: t,
    updatedAt: t,
  };
  projects = [...projects, project];
  return project;
}

export function getRoomsForProject(projectId: string): Room[] {
  return rooms.filter((r) => r.projectId === projectId);
}

export function createRoom(projectId: string, input: Partial<Room>): Room {
  const t = new Date().toISOString();
  const type = normalizeRoomType(input.type as string | undefined);
  const preset = ROOM_TYPE_PRESETS[type];
  const room: Room = {
    roomId: `room-${crypto.randomUUID()}`,
    projectId,
    type,
    name: input.name ?? preset.name,
    widthFt: input.widthFt ?? preset.widthFt,
    depthFt: input.depthFt ?? preset.depthFt,
    heightFt: input.heightFt ?? preset.heightFt,
    layoutX: input.layoutX ?? 0,
    layoutZ: input.layoutZ ?? 0,
    createdAt: t,
    updatedAt: t,
  };
  rooms = [...rooms, room];
  return room;
}

export function getRoom(roomId: string): Room | undefined {
  return rooms.find((r) => r.roomId === roomId);
}

export function updateRoom(
  roomId: string,
  patch: Partial<
    Pick<Room, 'name' | 'type' | 'widthFt' | 'depthFt' | 'heightFt' | 'layoutX' | 'layoutZ'>
  >,
): UpdateRoomResult | undefined {
  const idx = rooms.findIndex((r) => r.roomId === roomId);
  if (idx < 0) return undefined;
  const previous = rooms[idx];
  const updated: Room = {
    ...previous,
    ...patch,
    ...(patch.type !== undefined ? { type: normalizeRoomType(String(patch.type)) } : {}),
    updatedAt: new Date().toISOString(),
  };

  const dimsChanged =
    (patch.widthFt !== undefined && patch.widthFt !== previous.widthFt) ||
    (patch.depthFt !== undefined && patch.depthFt !== previous.depthFt);

  const layoutPatches =
    dimsChanged && (patch.widthFt !== undefined || patch.depthFt !== undefined)
      ? computeConnectedLayoutPatches(
          rooms.filter((r) => r.projectId === previous.projectId),
          getConnections(previous.projectId),
          roomId,
          previous,
          updated,
        )
      : [];

  const patchByRoomId = new Map(layoutPatches.map((p) => [p.roomId, p]));
  const touchedAt = updated.updatedAt;

  rooms = rooms.map((r) => {
    if (r.roomId === roomId) return updated;
    const layoutPatch = patchByRoomId.get(r.roomId);
    if (!layoutPatch) return r;
    return {
      ...r,
      layoutX: layoutPatch.layoutX,
      layoutZ: layoutPatch.layoutZ,
      updatedAt: touchedAt,
    };
  });

  const adjustedRooms = layoutPatches
    .map((p) => rooms.find((r) => r.roomId === p.roomId))
    .filter((r): r is Room => r !== undefined);

  return { room: updated, adjustedRooms };
}

export function deleteRoom(roomId: string): { projectId: string } | undefined {
  const room = getRoom(roomId);
  if (!room) return undefined;

  const { projectId } = room;
  rooms = rooms.filter((r) => r.roomId !== roomId);
  placements = placements.filter((p) => p.roomId !== roomId);
  connections = connections.filter(
    (c) => c.roomAId !== roomId && c.roomBId !== roomId,
  );
  exteriorDoors = exteriorDoors.filter((d) => d.roomId !== roomId);

  return { projectId };
}

const LEGACY_DEMO_PLACEMENT_IDS = new Set(['place-1', 'place-2', 'place-3']);

export function getPlacements(roomId: string): Placement[] {
  if (roomId === DEV_ROOM_ID) {
    const legacy = placements.some((p) => LEGACY_DEMO_PLACEMENT_IDS.has(p.placementId));
    if (legacy) {
      placements = placements.filter((p) => p.roomId !== DEV_ROOM_ID);
    }
  }
  return placements.filter((p) => p.roomId === roomId);
}

export function savePlacements(roomId: string, next: Placement[]): Placement[] {
  placements = placements.filter((p) => p.roomId !== roomId).concat(next);
  return getPlacements(roomId);
}

export function getConnections(projectId: string): RoomConnection[] {
  const roomsById = new Map(getRoomsForProject(projectId).map((r) => [r.roomId, r]));
  return connections
    .filter((c) => c.projectId === projectId)
    .map((c) => enrichConnectionSides(c, roomsById));
}

export function setConnections(
  projectId: string,
  next: RoomConnection[],
): RoomConnection[] {
  const roomsById = new Map(getRoomsForProject(projectId).map((r) => [r.roomId, r]));
  const enriched = next.map((c) => enrichConnectionSides({ ...c, projectId }, roomsById));
  connections = connections.filter((c) => c.projectId !== projectId).concat(enriched);
  return getConnections(projectId);
}

export function getExteriorDoors(projectId: string): ExteriorDoor[] {
  return exteriorDoors.filter((d) => d.projectId === projectId);
}

export function setExteriorDoors(
  projectId: string,
  next: ExteriorDoor[],
): ExteriorDoor[] {
  exteriorDoors = exteriorDoors
    .filter((d) => d.projectId !== projectId)
    .concat(next.map((d) => ({ ...d, projectId })));
  return getExteriorDoors(projectId);
}

export function estimateRoomTotal(roomId: string): {
  total: number;
  lineItems: { placementId: string; name: string; price: number }[];
  source: string;
} {
  const roomPlacements = getPlacements(roomId);
  let total = 0;
  const lineItems = roomPlacements.flatMap((p) => {
    if (p.customItem) return [];
    const item = getCatalogItem(p.catalogItemId ?? '');
    if (!item) return [];
    const price = item.listPrice;
    total += price;
    return [
      {
        placementId: p.placementId,
        name: item.name,
        price,
      },
    ];
  });
  return { total, lineItems, source: 'catalog-mock' };
}
