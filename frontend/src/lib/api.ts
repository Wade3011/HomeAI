import type {
  CatalogItem,
  ExteriorDoor,
  Placement,
  PriceEstimate,
  Project,
  Room,
  RoomConnection,
  RoomEstimate,
  SiteSettings,
  SiteStructure,
  SiteStructureKind,
  StylePackId,
} from '@/types';
import type { CatalogSectionId } from '@/config/catalogCategories';

async function parseJson<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    const message = (data as { message?: string }).message ?? response.statusText;
    throw new Error(message);
  }
  return data as T;
}

export async function fetchCatalog(opts?: {
  category?: string;
  sections?: CatalogSectionId[];
}): Promise<CatalogItem[]> {
  const qs = new URLSearchParams();
  if (opts?.category) qs.set('category', opts.category);
  if (opts?.sections?.length) qs.set('sections', opts.sections.join(','));
  const query = qs.toString();
  const res = await fetch(`/api/catalog${query ? `?${query}` : ''}`, {
    credentials: 'include',
  });
  const data = await parseJson<{ items: CatalogItem[] }>(res);
  return opts?.category
    ? data.items.filter((i) => i.category === opts.category)
    : data.items;
}

export async function fetchCatalogByIds(itemIds: string[]): Promise<CatalogItem[]> {
  if (itemIds.length === 0) return [];
  const qs = new URLSearchParams({ ids: itemIds.join(',') });
  const res = await fetch(`/api/catalog?${qs}`, { credentials: 'include' });
  const data = await parseJson<{ items: CatalogItem[] }>(res);
  return data.items;
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

export async function updateProject(
  projectId: string,
  patch: Partial<Pick<Project, 'name' | 'stories'>>,
): Promise<Project> {
  const res = await fetch(`/api/projects/${projectId}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  const data = await parseJson<{ project: Project }>(res);
  return data.project;
}

export async function createProject(
  name: string,
  opts?: { presetId?: string },
): Promise<Project> {
  const res = await fetch('/api/projects', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, presetId: opts?.presetId }),
  });
  const data = await parseJson<{ project: Project }>(res);
  return data.project;
}

export async function createProjectFromPreset(
  presetId: string,
  name?: string,
): Promise<Project> {
  return createProject(name ?? 'My Home', { presetId });
}

export async function applyStylePack(
  projectId: string,
  stylePackId: StylePackId,
): Promise<{ project: Project; rooms: Room[] }> {
  const res = await fetch(`/api/projects/${projectId}/style-pack`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stylePackId }),
  });
  return parseJson<{ project: Project; rooms: Room[] }>(res);
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

export interface UpdateRoomResult {
  room: Room;
  adjustedRooms: Room[];
}

export async function updateRoom(
  roomId: string,
  patch: Partial<
    Pick<
      Room,
      | 'name'
      | 'type'
      | 'widthFt'
      | 'depthFt'
      | 'heightFt'
      | 'ceilingType'
      | 'peakHeightFt'
      | 'ridgeAxis'
      | 'floorFinishId'
      | 'storyIndex'
      | 'layoutX'
      | 'layoutZ'
    >
  >,
): Promise<UpdateRoomResult> {
  const res = await fetch(`/api/rooms/${roomId}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  const data = await parseJson<{ room: Room; adjustedRooms?: Room[] }>(res);
  return { room: data.room, adjustedRooms: data.adjustedRooms ?? [] };
}

export async function deleteRoom(roomId: string): Promise<{ projectId: string }> {
  const res = await fetch(`/api/rooms/${roomId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return parseJson<{ projectId: string }>(res);
}

export async function fetchConnections(projectId: string): Promise<RoomConnection[]> {
  const res = await fetch(`/api/projects/${projectId}/connections`, {
    credentials: 'include',
  });
  const data = await parseJson<{ connections: RoomConnection[] }>(res);
  return data.connections;
}

export async function saveConnections(
  projectId: string,
  connections: RoomConnection[],
): Promise<RoomConnection[]> {
  const res = await fetch(`/api/projects/${projectId}/connections`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ connections }),
  });
  const data = await parseJson<{ connections: RoomConnection[] }>(res);
  return data.connections;
}

export async function fetchExteriorDoors(projectId: string): Promise<ExteriorDoor[]> {
  const res = await fetch(`/api/projects/${projectId}/exterior-doors`, {
    credentials: 'include',
  });
  const data = await parseJson<{ exteriorDoors: ExteriorDoor[] }>(res);
  return data.exteriorDoors;
}

export async function saveExteriorDoors(
  projectId: string,
  exteriorDoors: ExteriorDoor[],
): Promise<ExteriorDoor[]> {
  const res = await fetch(`/api/projects/${projectId}/exterior-doors`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ exteriorDoors }),
  });
  const data = await parseJson<{ exteriorDoors: ExteriorDoor[] }>(res);
  return data.exteriorDoors;
}

export interface SiteData {
  site: SiteSettings;
  structures: SiteStructure[];
}

export async function fetchSite(projectId: string): Promise<SiteData> {
  const res = await fetch(`/api/projects/${projectId}/site`, { credentials: 'include' });
  return parseJson<SiteData>(res);
}

export async function saveSiteSettings(
  projectId: string,
  site: SiteSettings,
): Promise<SiteSettings> {
  const res = await fetch(`/api/projects/${projectId}/site`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ site }),
  });
  const data = await parseJson<{ site: SiteSettings }>(res);
  return data.site;
}

export async function fetchSiteStructures(projectId: string): Promise<SiteStructure[]> {
  const res = await fetch(`/api/projects/${projectId}/site-structures`, {
    credentials: 'include',
  });
  const data = await parseJson<{ structures: SiteStructure[] }>(res);
  return data.structures;
}

export async function saveSiteStructures(
  projectId: string,
  structures: SiteStructure[],
): Promise<SiteStructure[]> {
  const res = await fetch(`/api/projects/${projectId}/site-structures`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ structures }),
  });
  const data = await parseJson<{ structures: SiteStructure[] }>(res);
  return data.structures;
}

export async function createSiteStructure(
  projectId: string,
  input: {
    kind: SiteStructureKind;
    name?: string;
    centerX?: number;
    centerZ?: number;
    widthFt?: number;
    depthFt?: number;
    heightFt?: number;
    rotationY?: number;
    material?: SiteStructure['material'];
    fenceStyle?: SiteStructure['fenceStyle'];
    doorSide?: SiteStructure['doorSide'];
    snapToDoors?: boolean;
  },
): Promise<SiteStructure> {
  const res = await fetch(`/api/projects/${projectId}/site-structures`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await parseJson<{ structure: SiteStructure }>(res);
  return data.structure;
}

export async function deleteSiteStructure(structureId: string): Promise<{ projectId: string }> {
  const res = await fetch(`/api/site-structures/${structureId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return parseJson<{ deleted: true; projectId: string }>(res);
}

export async function linkSiteStructurePlannerRoom(
  structureId: string,
): Promise<{ structure: SiteStructure; room: Room }> {
  const res = await fetch(`/api/site-structures/${structureId}/link-room`, {
    method: 'POST',
    credentials: 'include',
  });
  return parseJson<{ structure: SiteStructure; room: Room }>(res);
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
