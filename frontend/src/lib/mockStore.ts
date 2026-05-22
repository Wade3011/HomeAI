import { getCatalogItem, getCatalogItems } from '@/lib/catalog';
import type { Placement, Project, Room } from '@/types';

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
    createdAt: now,
    updatedAt: now,
  },
];

let placements: Placement[] = [
  {
    placementId: 'place-1',
    roomId: DEV_ROOM_ID,
    catalogItemId: 'base-kraftmaid-30',
    positionX: 2,
    positionY: 0,
    positionZ: 3,
    rotationY: 0,
  },
  {
    placementId: 'place-2',
    roomId: DEV_ROOM_ID,
    catalogItemId: 'wall-kraftmaid-30',
    positionX: 2,
    positionY: 4.5,
    positionZ: 0,
    rotationY: 0,
  },
  {
    placementId: 'place-3',
    roomId: DEV_ROOM_ID,
    catalogItemId: 'counter-30',
    positionX: 2,
    positionY: 2.875,
    positionZ: 3,
    rotationY: 0,
  },
];

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
  const room: Room = {
    roomId: `room-${crypto.randomUUID()}`,
    projectId,
    type: input.type ?? 'kitchen',
    name: input.name ?? 'Kitchen',
    widthFt: input.widthFt ?? 14,
    depthFt: input.depthFt ?? 12,
    heightFt: input.heightFt ?? 9,
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
  patch: Partial<Pick<Room, 'name' | 'widthFt' | 'depthFt' | 'heightFt'>>,
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

export function getPlacements(roomId: string): Placement[] {
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
  const lineItems = roomPlacements.map((p) => {
    const item = getCatalogItem(p.catalogItemId);
    const price = item?.listPrice ?? 0;
    total += price;
    return {
      placementId: p.placementId,
      name: item?.name ?? p.catalogItemId,
      price,
    };
  });
  return { total, lineItems, source: 'catalog-mock' };
}
