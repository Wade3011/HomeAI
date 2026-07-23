import { normalizeRoomType, ROOM_TYPES } from '@/config/roomTypes';
import { snapLayoutFt } from '@/lib/imperialDimensions';
import type { Room, RoomConnection, RoomType } from '@/types';

export interface PlanUnderlay {
  url: string;
  fileName: string;
  naturalWidth: number;
  naturalHeight: number;
  /** Top-left of image in plan feet */
  originX: number;
  originZ: number;
  widthFt: number;
  heightFt: number;
  opacity: number;
  calibrated: boolean;
}

export interface PlanPoint {
  x: number;
  z: number;
}

export interface ImportLayoutRoom {
  key: string;
  name: string;
  type: RoomType | string;
  widthFt: number;
  depthFt: number;
  layoutX: number;
  layoutZ: number;
  heightFt?: number;
  /** Defaults to Main (0), or the active story when tracing. */
  storyIndex?: number;
}

export interface ImportLayoutConnection {
  roomA: string;
  roomB: string;
  kind: 'open' | 'door';
}

/** Portable layout file (JSON) for bulk import into a project. */
export interface ImportLayoutFile {
  name?: string;
  rooms: ImportLayoutRoom[];
  connections?: ImportLayoutConnection[];
}

const DEFAULT_IMAGE_WIDTH_FT = 60;
const MIN_ROOM_FT = 3;
const MIN_CALIBRATION_FT = 1;

export function defaultUnderlayFromImage(
  url: string,
  fileName: string,
  naturalWidth: number,
  naturalHeight: number,
): PlanUnderlay {
  const aspect =
    naturalWidth > 0 && naturalHeight > 0 ? naturalHeight / naturalWidth : 1;
  const widthFt = DEFAULT_IMAGE_WIDTH_FT;
  const heightFt = widthFt * aspect;
  return {
    url,
    fileName,
    naturalWidth,
    naturalHeight,
    originX: 0,
    originZ: 0,
    widthFt,
    heightFt,
    opacity: 0.45,
    calibrated: false,
  };
}

export function distanceFt(a: PlanPoint, b: PlanPoint): number {
  return Math.hypot(b.x - a.x, b.z - a.z);
}

/**
 * Rescale underlay so the segment a→b equals `knownFeet`.
 * Keeps point `a` fixed in plan space.
 */
export function rescaleUnderlayByCalibration(
  underlay: PlanUnderlay,
  a: PlanPoint,
  b: PlanPoint,
  knownFeet: number,
): PlanUnderlay {
  const current = distanceFt(a, b);
  if (current < 1e-6 || !Number.isFinite(knownFeet) || knownFeet < MIN_CALIBRATION_FT) {
    throw new Error('Calibration needs two distinct points and a length of at least 1 ft');
  }
  const factor = knownFeet / current;
  return {
    ...underlay,
    originX: a.x - (a.x - underlay.originX) * factor,
    originZ: a.z - (a.z - underlay.originZ) * factor,
    widthFt: underlay.widthFt * factor,
    heightFt: underlay.heightFt * factor,
    calibrated: true,
  };
}

/** Normalize a drag rectangle into snapped room layout fields. */
export function rectToRoomLayout(
  x1: number,
  z1: number,
  x2: number,
  z2: number,
): { layoutX: number; layoutZ: number; widthFt: number; depthFt: number } | null {
  const layoutX = snapLayoutFt(Math.min(x1, x2));
  const layoutZ = snapLayoutFt(Math.min(z1, z2));
  const widthFt = snapLayoutFt(Math.abs(x2 - x1));
  const depthFt = snapLayoutFt(Math.abs(z2 - z1));
  if (widthFt < MIN_ROOM_FT || depthFt < MIN_ROOM_FT) return null;
  return { layoutX, layoutZ, widthFt, depthFt };
}

export function unionBoundsWithUnderlay(
  bounds: {
    minX: number;
    minZ: number;
    maxX: number;
    maxZ: number;
    widthFt: number;
    depthFt: number;
  },
  underlay: PlanUnderlay | null,
  roomCount: number,
): {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
  widthFt: number;
  depthFt: number;
} {
  if (!underlay) return bounds;
  if (roomCount === 0) {
    return {
      minX: underlay.originX,
      minZ: underlay.originZ,
      maxX: underlay.originX + underlay.widthFt,
      maxZ: underlay.originZ + underlay.heightFt,
      widthFt: underlay.widthFt,
      depthFt: underlay.heightFt,
    };
  }
  const minX = Math.min(bounds.minX, underlay.originX);
  const minZ = Math.min(bounds.minZ, underlay.originZ);
  const maxX = Math.max(bounds.maxX, underlay.originX + underlay.widthFt);
  const maxZ = Math.max(bounds.maxZ, underlay.originZ + underlay.heightFt);
  return {
    minX,
    minZ,
    maxX,
    maxZ,
    widthFt: maxX - minX,
    depthFt: maxZ - minZ,
  };
}

function isRoomType(value: string): value is RoomType {
  return (ROOM_TYPES as string[]).includes(value);
}

/** Parse and validate a layout JSON string. */
export function parseImportLayoutJson(raw: string): ImportLayoutFile {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON');
  }
  if (!data || typeof data !== 'object') throw new Error('Layout must be a JSON object');
  const obj = data as Record<string, unknown>;
  const roomsRaw = obj.rooms;
  if (!Array.isArray(roomsRaw) || roomsRaw.length === 0) {
    throw new Error('Layout needs a non-empty "rooms" array');
  }

  const keys = new Set<string>();
  const rooms: ImportLayoutRoom[] = roomsRaw.map((item, i) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Room ${i + 1} is invalid`);
    }
    const r = item as Record<string, unknown>;
    const key = String(r.key ?? `room-${i + 1}`);
    if (keys.has(key)) throw new Error(`Duplicate room key: ${key}`);
    keys.add(key);
    const widthFt = Number(r.widthFt);
    const depthFt = Number(r.depthFt);
    const layoutX = Number(r.layoutX ?? 0);
    const layoutZ = Number(r.layoutZ ?? 0);
    if (![widthFt, depthFt, layoutX, layoutZ].every(Number.isFinite)) {
      throw new Error(`Room "${key}" has invalid dimensions or layout`);
    }
    if (widthFt < MIN_ROOM_FT || depthFt < MIN_ROOM_FT) {
      throw new Error(`Room "${key}" must be at least ${MIN_ROOM_FT}' × ${MIN_ROOM_FT}'`);
    }
    const typeRaw = String(r.type ?? 'other');
    const type = isRoomType(typeRaw) ? typeRaw : normalizeRoomType(typeRaw);
    return {
      key,
      name: String(r.name ?? key),
      type,
      widthFt,
      depthFt,
      layoutX,
      layoutZ,
      heightFt: r.heightFt != null ? Number(r.heightFt) : undefined,
      storyIndex: r.storyIndex != null ? Number(r.storyIndex) : undefined,
    };
  });

  const connections: ImportLayoutConnection[] = [];
  if (Array.isArray(obj.connections)) {
    for (const item of obj.connections) {
      if (!item || typeof item !== 'object') continue;
      const c = item as Record<string, unknown>;
      const roomA = String(c.roomA ?? '');
      const roomB = String(c.roomB ?? '');
      const kind = c.kind === 'door' ? 'door' : c.kind === 'open' ? 'open' : null;
      if (!roomA || !roomB || !kind) {
        throw new Error('Each connection needs roomA, roomB, and kind (open|door)');
      }
      if (!keys.has(roomA) || !keys.has(roomB)) {
        throw new Error(`Connection references unknown room key (${roomA} / ${roomB})`);
      }
      connections.push({ roomA, roomB, kind });
    }
  }

  return {
    name: obj.name != null ? String(obj.name) : undefined,
    rooms,
    connections,
  };
}

export interface ImportLayoutApplyResult {
  rooms: Room[];
  connections: RoomConnection[];
}

/** Create rooms (+ optional connections) from a parsed layout file. */
export async function applyImportLayout(options: {
  projectId: string;
  layout: ImportLayoutFile;
  createRoom: (projectId: string, input: Partial<Room>) => Promise<Room>;
  saveConnections: (
    projectId: string,
    connections: RoomConnection[],
  ) => Promise<RoomConnection[]>;
  existingConnections?: RoomConnection[];
  /** Applied when a layout room omits storyIndex. */
  defaultStoryIndex?: number;
}): Promise<ImportLayoutApplyResult> {
  const { projectId, layout, createRoom, saveConnections } = options;
  const defaultStoryIndex = options.defaultStoryIndex ?? 0;
  const keyToId = new Map<string, string>();
  const created: Room[] = [];

  for (const def of layout.rooms) {
    const room = await createRoom(projectId, {
      type: normalizeRoomType(def.type),
      name: def.name,
      widthFt: def.widthFt,
      depthFt: def.depthFt,
      heightFt: def.heightFt,
      storyIndex: def.storyIndex ?? defaultStoryIndex,
      layoutX: snapLayoutFt(def.layoutX),
      layoutZ: snapLayoutFt(def.layoutZ),
    });
    keyToId.set(def.key, room.roomId);
    created.push(room);
  }

  const existing = options.existingConnections ?? [];
  const imported: RoomConnection[] = (layout.connections ?? []).map((c) => ({
    connectionId: `conn-${crypto.randomUUID()}`,
    projectId,
    roomAId: keyToId.get(c.roomA)!,
    roomBId: keyToId.get(c.roomB)!,
    kind: c.kind,
  }));
  const saved =
    imported.length > 0
      ? await saveConnections(projectId, [...existing, ...imported])
      : existing;

  return { rooms: created, connections: saved };
}

export const IMPORT_LAYOUT_EXAMPLE = `{
  "name": "Sample ranch",
  "rooms": [
    { "key": "living", "name": "Living", "type": "living", "widthFt": 18, "depthFt": 16, "layoutX": 0, "layoutZ": 0 },
    { "key": "kitchen", "name": "Kitchen", "type": "kitchen", "widthFt": 14, "depthFt": 12, "layoutX": 18.5, "layoutZ": 0 }
  ],
  "connections": [
    { "roomA": "living", "roomB": "kitchen", "kind": "open" }
  ]
}`;
