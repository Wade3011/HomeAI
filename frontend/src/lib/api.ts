import type {
  CatalogItem,
  Placement,
  PriceEstimate,
  Project,
  Room,
  RoomEstimate,
} from '@/types';

async function parseJson<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    const message = (data as { message?: string }).message ?? response.statusText;
    throw new Error(message);
  }
  return data as T;
}

export async function fetchCatalog(category?: string): Promise<CatalogItem[]> {
  const qs = category ? `?category=${encodeURIComponent(category)}` : '';
  const res = await fetch(`/api/catalog${qs}`, { credentials: 'include' });
  const data = await parseJson<{ items: CatalogItem[] }>(res);
  return category
    ? data.items.filter((i) => i.category === category)
    : data.items;
}

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch('/api/projects', { credentials: 'include' });
  const data = await parseJson<{ projects: Project[] }>(res);
  return data.projects;
}

export async function fetchProject(projectId: string): Promise<Project> {
  const res = await fetch(`/api/projects/${projectId}`, { credentials: 'include' });
  const data = await parseJson<{ project: Project }>(res);
  return data.project;
}

export async function createProject(name: string): Promise<Project> {
  const res = await fetch('/api/projects', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const data = await parseJson<{ project: Project }>(res);
  return data.project;
}

export async function fetchProjectRooms(projectId: string): Promise<Room[]> {
  const res = await fetch(`/api/projects/${projectId}/rooms`, { credentials: 'include' });
  const data = await parseJson<{ rooms: Room[] }>(res);
  return data.rooms;
}

export async function createRoom(
  projectId: string,
  input: Partial<Room>,
): Promise<Room> {
  const res = await fetch(`/api/projects/${projectId}/rooms`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await parseJson<{ room: Room }>(res);
  return data.room;
}

export async function fetchRoom(roomId: string): Promise<Room> {
  const res = await fetch(`/api/rooms/${roomId}`, { credentials: 'include' });
  const data = await parseJson<{ room: Room }>(res);
  return data.room;
}

export async function updateRoom(
  roomId: string,
  patch: Partial<Pick<Room, 'name' | 'widthFt' | 'depthFt' | 'heightFt' | 'layoutX' | 'layoutZ'>>,
): Promise<Room> {
  const res = await fetch(`/api/rooms/${roomId}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  const data = await parseJson<{ room: Room }>(res);
  return data.room;
}

export async function fetchPlacements(roomId: string): Promise<Placement[]> {
  const res = await fetch(`/api/rooms/${roomId}/placements`, { credentials: 'include' });
  const data = await parseJson<{ placements: Placement[] }>(res);
  return data.placements;
}

export async function savePlacements(
  roomId: string,
  placements: Placement[],
): Promise<Placement[]> {
  const res = await fetch(`/api/rooms/${roomId}/placements`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ placements }),
  });
  const data = await parseJson<{ placements: Placement[] }>(res);
  return data.placements;
}

export async function estimateItem(catalogItemId: string): Promise<PriceEstimate> {
  const res = await fetch('/api/pricing/estimate', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ catalogItemId }),
  });
  const data = await parseJson<{ estimate: PriceEstimate }>(res);
  return data.estimate;
}

export async function estimateRoom(roomId: string): Promise<RoomEstimate> {
  const res = await fetch('/api/pricing/estimate-room', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId }),
  });
  return parseJson<RoomEstimate>(res);
}
