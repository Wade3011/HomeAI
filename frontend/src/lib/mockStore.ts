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
import type {
  ExteriorDoor,
  Placement,
  Project,
  Room,
  RoomConnection,
  SiteSettings,
  SiteStructure,
  SiteStructureKind,
  StoryDef,
  StylePackId,
} from '@/types';
import { defaultFloorFinishId } from '@/config/floorFinishes';
import { getSiteStructurePreset, hasStructureHeight, isBuildingKind } from '@/config/siteStructurePresets';
import { floorFinishForStylePack, getStylePack } from '@/config/stylePacks';
import { defaultSiteSettings, findNearestDrivewaySnapTarget, rectToPolygon, roomTypeForSiteStructure, snapDrivewayToExteriorDoor, structureBounds } from '@/lib/siteLayout';
import { ROOM_TYPE_PRESETS, normalizeRoomType } from '@/config/roomTypes';
import { DEFAULT_MAIN_STORY, getStory, normalizeStories } from '@/lib/stories';

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
    stories: [{ ...DEFAULT_MAIN_STORY }],
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
    storyIndex: 0,
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
    storyIndex: 0,
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
    storyIndex: 0,
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

let siteSettingsByProject = new Map<string, SiteSettings>();
let siteStructures: SiteStructure[] = [];

function initSiteForProject(projectId: string): SiteSettings {
  const existing = siteSettingsByProject.get(projectId);
  if (existing) return existing;
  const site = defaultSiteSettings(projectId);
  siteSettingsByProject = new Map(siteSettingsByProject).set(projectId, site);
  return site;
}

function applyPresetToStore(result: ProjectFromPresetResult): ProjectFromPresetResult {
  projects = [...projects, result.project];
  rooms = [...rooms, ...result.rooms];
  connections = [...connections, ...result.connections];
  exteriorDoors = [...exteriorDoors, ...result.exteriorDoors];
  initSiteForProject(result.project.projectId);
  return result;
}

function buildPresetProject(
  presetId: string,
  projectId: string,
  projectName: string,
  stylePackId: StylePackId = 'farmhouse',
): ProjectFromPresetResult | undefined {
  const preset = getFloorPlanPreset(presetId);
  const pack = getStylePack(stylePackId);
  if (!preset || !pack) return undefined;
  const t = new Date().toISOString();
  const project: Project = {
    projectId,
    ownerUserId: 'dev-user',
    name: projectName,
    unitSystem: 'imperial',
    stylePackId,
    stories: normalizeStories(preset.stories),
    createdAt: t,
    updatedAt: t,
  };
  const presetRooms = buildRoomsFromPreset(projectId, preset).map((room) => ({
    ...room,
    floorFinishId: floorFinishForStylePack(pack, room.type),
    storyIndex: room.storyIndex ?? 0,
  }));
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
  siteSettingsByProject.delete(projectId);
  siteStructures = siteStructures.filter((s) => s.projectId !== projectId);
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

initSiteForProject(DEV_PROJECT_ID);
initSiteForProject(KRAENZLEIN_PROJECT_ID);

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
    stories: [{ ...DEFAULT_MAIN_STORY }],
    createdAt: t,
    updatedAt: t,
  };
  projects = [...projects, project];
  initSiteForProject(project.projectId);
  return project;
}

export function getProject(projectId: string): Project | undefined {
  const project = projects.find((p) => p.projectId === projectId);
  if (!project) return undefined;
  if (project.stories?.length) return project;
  const withStories: Project = {
    ...project,
    stories: [{ ...DEFAULT_MAIN_STORY }],
  };
  projects = projects.map((p) => (p.projectId === projectId ? withStories : p));
  return withStories;
}

export function updateProject(
  projectId: string,
  patch: Partial<Pick<Project, 'name' | 'stories'>>,
): Project | undefined {
  const project = ensureProject(projectId) ?? getProject(projectId);
  if (!project) return undefined;
  const t = new Date().toISOString();
  const updated: Project = {
    ...project,
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.stories !== undefined
      ? { stories: normalizeStories(patch.stories as StoryDef[]) }
      : {}),
    updatedAt: t,
  };
  projects = projects.map((p) => (p.projectId === projectId ? updated : p));
  return updated;
}

/** Apply a style pack’s flooring defaults to every room in the project. */
export function applyStylePackToProject(
  projectId: string,
  stylePackId: StylePackId,
): { project: Project; rooms: Room[] } | undefined {
  const project = ensureProject(projectId) ?? getProject(projectId);
  const pack = getStylePack(stylePackId);
  if (!project || !pack) return undefined;

  const t = new Date().toISOString();
  const updatedProject: Project = {
    ...project,
    stylePackId,
    updatedAt: t,
  };
  projects = projects.map((p) => (p.projectId === projectId ? updatedProject : p));

  rooms = rooms.map((room) => {
    if (room.projectId !== projectId) return room;
    return {
      ...room,
      floorFinishId: floorFinishForStylePack(pack, room.type),
      updatedAt: t,
    };
  });

  return { project: updatedProject, rooms: getRoomsForProject(projectId) };
}

/**
 * Self-heal projects orphaned by a dev-server restart (which wipes in-memory state).
 * If a request comes in for a `proj-*` ID we don't know about, materialize an empty
 * project so the user's browser URL keeps working instead of getting 404s.
 */
export function ensureProject(projectId: string): Project | undefined {
  const existing = projects.find((p) => p.projectId === projectId);
  if (existing) {
    return getProject(projectId);
  }
  if (!projectId.startsWith('proj-')) return undefined;
  const t = new Date().toISOString();
  const project: Project = {
    projectId,
    ownerUserId: 'dev-user',
    name: 'My Home',
    unitSystem: 'imperial',
    stories: [{ ...DEFAULT_MAIN_STORY }],
    createdAt: t,
    updatedAt: t,
  };
  projects = [...projects, project];
  initSiteForProject(projectId);
  return project;
}

export function getRoomsForProject(projectId: string): Room[] {
  return rooms.filter((r) => r.projectId === projectId);
}

export function createRoom(projectId: string, input: Partial<Room>): Room {
  const t = new Date().toISOString();
  const type = normalizeRoomType(input.type as string | undefined);
  const preset = ROOM_TYPE_PRESETS[type];
  const project = getProject(projectId);
  const pack = project?.stylePackId ? getStylePack(project.stylePackId) : null;
  const floorFinishId =
    input.floorFinishId ??
    (pack ? floorFinishForStylePack(pack, type) : defaultFloorFinishId(type));
  const storyIndex = input.storyIndex ?? 0;
  const story = getStory(project?.stories, storyIndex);
  const room: Room = {
    roomId: `room-${crypto.randomUUID()}`,
    projectId,
    type,
    name: input.name ?? preset.name,
    widthFt: input.widthFt ?? preset.widthFt,
    depthFt: input.depthFt ?? preset.depthFt,
    heightFt: input.heightFt ?? story?.defaultHeightFt ?? preset.heightFt,
    ceilingType: input.ceilingType,
    peakHeightFt: input.peakHeightFt,
    ridgeAxis: input.ridgeAxis,
    floorFinishId,
    storyIndex,
    layoutX: input.layoutX ?? 0,
    layoutZ: input.layoutZ ?? 0,
    linkedSiteStructureId: input.linkedSiteStructureId,
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
  // Flat ceilings clear cathedral-only fields (JSON omits `undefined` on the wire).
  if (patch.ceilingType === 'flat') {
    delete updated.peakHeightFt;
    delete updated.ridgeAxis;
  }

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

export function getSiteSettings(projectId: string): SiteSettings {
  return initSiteForProject(projectId);
}

export function setSiteSettings(projectId: string, patch: Partial<SiteSettings>): SiteSettings {
  const current = initSiteForProject(projectId);
  const updated: SiteSettings = {
    ...current,
    ...patch,
    projectId,
    lotWidthFt: patch.lotWidthFt ?? current.lotWidthFt,
    lotDepthFt: patch.lotDepthFt ?? current.lotDepthFt,
  };
  siteSettingsByProject = new Map(siteSettingsByProject).set(projectId, updated);
  return updated;
}

export function getSiteStructures(projectId: string): SiteStructure[] {
  initSiteForProject(projectId);
  return siteStructures.filter((s) => s.projectId === projectId);
}

export function getSiteStructure(structureId: string): SiteStructure | undefined {
  return siteStructures.find((s) => s.structureId === structureId);
}

export function setSiteStructures(
  projectId: string,
  next: SiteStructure[],
): SiteStructure[] {
  initSiteForProject(projectId);
  const t = new Date().toISOString();
  const normalized = next.map((s) => ({
    ...s,
    projectId,
    updatedAt: t,
  }));
  siteStructures = siteStructures.filter((s) => s.projectId !== projectId).concat(normalized);
  for (const structure of normalized) {
    if (structure.linkedRoomId && isBuildingKind(structure.kind)) {
      syncLinkedPlannerRoom(structure);
    }
  }
  return getSiteStructures(projectId);
}

function syncLinkedPlannerRoom(structure: SiteStructure) {
  if (!structure.linkedRoomId) return;
  const room = getRoom(structure.linkedRoomId);
  if (!room) return;
  const b = structureBounds(structure);
  if (!b) return;
  const widthFt = structure.widthFt ?? b.widthFt;
  const depthFt = structure.depthFt ?? b.depthFt;
  const centerX = structure.centerX ?? b.centerX;
  const centerZ = structure.centerZ ?? b.centerZ;
  updateRoom(structure.linkedRoomId, {
    name: `${structure.name} (interior)`,
    widthFt,
    depthFt,
    heightFt: structure.heightFt ?? room.heightFt,
    layoutX: centerX - widthFt / 2,
    layoutZ: centerZ - depthFt / 2,
  });
}

export function linkSiteStructurePlannerRoom(
  structureId: string,
): { structure: SiteStructure; room: Room } | undefined {
  const structure = getSiteStructure(structureId);
  if (!structure || !isBuildingKind(structure.kind)) return undefined;

  if (structure.linkedRoomId) {
    const existing = getRoom(structure.linkedRoomId);
    if (existing) {
      syncLinkedPlannerRoom(structure);
      return { structure: getSiteStructure(structureId)!, room: getRoom(structure.linkedRoomId)! };
    }
  }

  const b = structureBounds(structure);
  if (!b) return undefined;
  const widthFt = structure.widthFt ?? b.widthFt;
  const depthFt = structure.depthFt ?? b.depthFt;
  const centerX = structure.centerX ?? b.centerX;
  const centerZ = structure.centerZ ?? b.centerZ;

  const room = createRoom(structure.projectId, {
    type: roomTypeForSiteStructure(structure.kind),
    name: `${structure.name} (interior)`,
    widthFt,
    depthFt,
    heightFt: structure.heightFt ?? getSiteStructurePreset(structure.kind).heightFt ?? 10,
    layoutX: centerX - widthFt / 2,
    layoutZ: centerZ - depthFt / 2,
    linkedSiteStructureId: structure.structureId,
  });

  const t = new Date().toISOString();
  const updated: SiteStructure = {
    ...structure,
    linkedRoomId: room.roomId,
    updatedAt: t,
  };
  siteStructures = siteStructures.map((s) =>
    s.structureId === structureId ? updated : s,
  );
  return { structure: updated, room };
}

export interface CreateSiteStructureInput {
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
}

export function createSiteStructure(
  projectId: string,
  input: CreateSiteStructureInput,
): SiteStructure {
  initSiteForProject(projectId);
  const preset = getSiteStructurePreset(input.kind);
  const site = getSiteSettings(projectId);
  const widthFt = input.widthFt ?? preset.widthFt;
  const depthFt = input.depthFt ?? preset.depthFt;
  const heightFt = input.heightFt ?? preset.heightFt;

  let centerX = input.centerX ?? site.lotWidthFt / 2 + (site.houseOffsetX ?? 0);
  let centerZ = input.centerZ ?? site.lotDepthFt * 0.75 + (site.houseOffsetZ ?? 0);

  if (input.kind === 'driveway' && input.snapToDoors !== false) {
    const rooms = getRoomsForProject(projectId);
    const doors = getExteriorDoors(projectId);
    const target = findNearestDrivewaySnapTarget(rooms, doors, centerX, centerZ);
    if (target) {
      const snapped = snapDrivewayToExteriorDoor(
        target.room,
        target.door,
        widthFt,
        depthFt,
      );
      centerX = snapped.centerX;
      centerZ = snapped.centerZ;
    }
  }

  const rotationY = input.rotationY ?? 0;
  const keepRotation =
    isBuildingKind(input.kind) || input.kind === 'fence' || input.kind === 'breezeway';
  const t = new Date().toISOString();
  const structure: SiteStructure = {
    structureId: `site-${crypto.randomUUID()}`,
    projectId,
    kind: input.kind,
    name: input.name ?? preset.name,
    points: rectToPolygon(centerX, centerZ, widthFt, depthFt, rotationY),
    centerX,
    centerZ,
    widthFt,
    depthFt,
    rotationY: keepRotation ? rotationY : undefined,
    heightFt: hasStructureHeight(input.kind) ? heightFt : undefined,
    material: input.kind === 'driveway' ? (input.material ?? preset.material) : undefined,
    fenceStyle: input.kind === 'fence' ? (input.fenceStyle ?? preset.fenceStyle) : undefined,
    doorSide: isBuildingKind(input.kind) ? (input.doorSide ?? preset.doorSide) : undefined,
    createdAt: t,
    updatedAt: t,
  };
  siteStructures = [...siteStructures, structure];
  return structure;
}

export function deleteSiteStructure(structureId: string): { projectId: string } | undefined {
  const structure = getSiteStructure(structureId);
  if (!structure) return undefined;
  if (structure.linkedRoomId) {
    deleteRoom(structure.linkedRoomId);
  }
  siteStructures = siteStructures.filter((s) => s.structureId !== structureId);
  return { projectId: structure.projectId };
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
