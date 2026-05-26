import { getCatalogItem, getCatalogItems } from '@/lib/catalog';
import type { Placement, Project, Room } from '@/types';
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
    layoutZ: 14,
    createdAt: now,
    updatedAt: now,
  },
];

let placements: Placement[] = [];

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
): Room | undefined {
  const idx = rooms.findIndex((r) => r.roomId === roomId);
  if (idx < 0) return undefined;
  const updated: Room = {
    ...rooms[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  rooms = rooms.map((r) => (r.roomId === roomId ? updated : r));
  return updated;
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
