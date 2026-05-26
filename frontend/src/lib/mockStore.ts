import { getCatalogItem, getCatalogItems } from '@/lib/catalog';
import { computeConnectedLayoutPatches, enrichConnectionSides } from '@/lib/homeLayout';
import type { ExteriorDoor, Placement, Project, Room, RoomConnection } from '@/types';
import { ROOM_TYPE_PRESETS, normalizeRoomType } from '@/config/roomTypes';

export const DEV_PROJECT_ID = 'dev-project-1';
export const DEV_ROOM_ID = 'dev-room-kitchen';

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
    Pick<Room, 'name' | 'widthFt' | 'depthFt' | 'heightFt' | 'layoutX' | 'layoutZ'>
  >,
): UpdateRoomResult | undefined {
  const idx = rooms.findIndex((r) => r.roomId === roomId);
  if (idx < 0) return undefined;
  const previous = rooms[idx];
  const updated: Room = {
    ...previous,
    ...patch,
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
