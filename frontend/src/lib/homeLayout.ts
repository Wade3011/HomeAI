import type { Room, RoomConnection, RoomWallSide } from '@/types';

export type WallSide = RoomWallSide;

export interface RoomRect {
  roomId: string;
  /** World-space top-left in feet (back-left corner) */
  x: number;
  z: number;
  widthFt: number;
  depthFt: number;
}

export function roomRect(room: Room): RoomRect {
  return {
    roomId: room.roomId,
    x: room.layoutX ?? 0,
    z: room.layoutZ ?? 0,
    widthFt: room.widthFt,
    depthFt: room.depthFt,
  };
}

export interface ProjectBounds {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
  widthFt: number;
  depthFt: number;
  centerX: number;
  centerZ: number;
}

export function computeProjectBounds(rooms: Room[]): ProjectBounds {
  if (rooms.length === 0) {
    return {
      minX: 0,
      minZ: 0,
      maxX: 20,
      maxZ: 20,
      widthFt: 20,
      depthFt: 20,
      centerX: 10,
      centerZ: 10,
    };
  }
  let minX = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxZ = -Infinity;
  for (const r of rooms) {
    const rect = roomRect(r);
    minX = Math.min(minX, rect.x);
    minZ = Math.min(minZ, rect.z);
    maxX = Math.max(maxX, rect.x + rect.widthFt);
    maxZ = Math.max(maxZ, rect.z + rect.depthFt);
  }
  const widthFt = maxX - minX;
  const depthFt = maxZ - minZ;
  return {
    minX,
    minZ,
    maxX,
    maxZ,
    widthFt,
    depthFt,
    centerX: (minX + maxX) / 2,
    centerZ: (minZ + maxZ) / 2,
  };
}

const EDGE_TOLERANCE_FT = 0.05;

export interface SharedEdge {
  side: WallSide;
  /** Start coordinate along the wall, in world feet */
  start: number;
  /** End coordinate along the wall, in world feet */
  end: number;
}

/**
 * Compute which wall side of `a` is touching `b`, and the overlap range.
 * Returns null if rooms are not adjacent.
 */
export function sharedEdge(a: RoomRect, b: RoomRect): SharedEdge | null {
  const ax1 = a.x;
  const ax2 = a.x + a.widthFt;
  const az1 = a.z;
  const az2 = a.z + a.depthFt;
  const bx1 = b.x;
  const bx2 = b.x + b.widthFt;
  const bz1 = b.z;
  const bz2 = b.z + b.depthFt;

  // a's back wall (z = az1) touches b's front wall (z = bz2)
  if (Math.abs(az1 - bz2) < EDGE_TOLERANCE_FT) {
    const start = Math.max(ax1, bx1);
    const end = Math.min(ax2, bx2);
    if (end - start > EDGE_TOLERANCE_FT) return { side: 'back', start, end };
  }
  // a's front wall (z = az2) touches b's back wall (z = bz1)
  if (Math.abs(az2 - bz1) < EDGE_TOLERANCE_FT) {
    const start = Math.max(ax1, bx1);
    const end = Math.min(ax2, bx2);
    if (end - start > EDGE_TOLERANCE_FT) return { side: 'front', start, end };
  }
  // a's left wall (x = ax1) touches b's right wall (x = bx2)
  if (Math.abs(ax1 - bx2) < EDGE_TOLERANCE_FT) {
    const start = Math.max(az1, bz1);
    const end = Math.min(az2, bz2);
    if (end - start > EDGE_TOLERANCE_FT) return { side: 'left', start, end };
  }
  // a's right wall (x = ax2) touches b's left wall (x = bx1)
  if (Math.abs(ax2 - bx1) < EDGE_TOLERANCE_FT) {
    const start = Math.max(az1, bz1);
    const end = Math.min(az2, bz2);
    if (end - start > EDGE_TOLERANCE_FT) return { side: 'right', start, end };
  }

  return null;
}

export interface WallOpening {
  /** Start coordinate along the wall, in wall-local feet */
  start: number;
  end: number;
  kind: RoomConnection['kind'];
  connectedRoomId: string;
  connectedRoomName: string;
}

export interface RoomWallPlan {
  side: WallSide;
  /** Length of wall in feet (full extent of the side) */
  length: number;
  /** Openings cut into this wall, in wall-local coordinates (0 = corner of the wall) */
  openings: WallOpening[];
}

const DOOR_WIDTH_FT = 3;

/**
 * Build wall plans for a room — each wall lists its openings (full-wall for open
 * connections, 3ft-wide gap for door connections).
 */
export function planRoomWalls(
  room: Room,
  rooms: Room[],
  connections: RoomConnection[],
): RoomWallPlan[] {
  const a = roomRect(room);
  const byId: Record<string, Room> = {};
  for (const r of rooms) byId[r.roomId] = r;

  const walls: RoomWallPlan[] = [
    { side: 'back', length: a.widthFt, openings: [] },
    { side: 'front', length: a.widthFt, openings: [] },
    { side: 'left', length: a.depthFt, openings: [] },
    { side: 'right', length: a.depthFt, openings: [] },
  ];

  for (const conn of connections) {
    const otherId =
      conn.roomAId === room.roomId
        ? conn.roomBId
        : conn.roomBId === room.roomId
          ? conn.roomAId
          : null;
    if (!otherId) continue;
    const other = byId[otherId];
    if (!other) continue;

    const edge = sharedEdge(a, roomRect(other));
    if (!edge) continue;

    const wall = walls.find((w) => w.side === edge.side);
    if (!wall) continue;

    // Convert world-space edge to wall-local (0..wall.length)
    const localStart =
      edge.side === 'back' || edge.side === 'front'
        ? edge.start - a.x
        : edge.start - a.z;
    const localEnd =
      edge.side === 'back' || edge.side === 'front'
        ? edge.end - a.x
        : edge.end - a.z;

    if (conn.kind === 'open') {
      wall.openings.push({
        start: localStart,
        end: localEnd,
        kind: 'open',
        connectedRoomId: other.roomId,
        connectedRoomName: other.name,
      });
    } else {
      // Door: 3ft gap centered on shared edge midpoint, clamped to overlap
      const mid = (localStart + localEnd) / 2;
      const half = DOOR_WIDTH_FT / 2;
      const dStart = Math.max(localStart, mid - half);
      const dEnd = Math.min(localEnd, mid + half);
      if (dEnd - dStart > 0.1) {
        wall.openings.push({
          start: dStart,
          end: dEnd,
          kind: 'door',
          connectedRoomId: other.roomId,
          connectedRoomName: other.name,
        });
      }
    }
  }

  // Merge & sort openings
  for (const w of walls) {
    w.openings.sort((p, q) => p.start - q.start);
  }

  return walls;
}

/**
 * Return the wall as a series of solid segments (the parts NOT opened up).
 * Each segment is wall-local [start, end].
 */
export function solidWallSegments(wall: RoomWallPlan): Array<[number, number]> {
  if (wall.openings.length === 0) return [[0, wall.length]];
  const segments: Array<[number, number]> = [];
  let cursor = 0;
  for (const op of wall.openings) {
    if (op.start > cursor + 0.01) {
      segments.push([cursor, op.start]);
    }
    cursor = Math.max(cursor, op.end);
  }
  if (cursor < wall.length - 0.01) {
    segments.push([cursor, wall.length]);
  }
  return segments;
}

/** True if two rooms touch on any side (used to enable connect UI). */
export function roomsAreAdjacent(a: Room, b: Room): boolean {
  return sharedEdge(roomRect(a), roomRect(b)) !== null;
}

export function findConnection(
  connections: RoomConnection[],
  roomAId: string,
  roomBId: string,
): RoomConnection | null {
  return (
    connections.find(
      (c) =>
        (c.roomAId === roomAId && c.roomBId === roomBId) ||
        (c.roomAId === roomBId && c.roomBId === roomAId),
    ) ?? null
  );
}

export interface RoomLayoutPatch {
  roomId: string;
  layoutX: number;
  layoutZ: number;
}

export function oppositeWallSide(side: WallSide): WallSide {
  const map: Record<WallSide, WallSide> = {
    back: 'front',
    front: 'back',
    left: 'right',
    right: 'left',
  };
  return map[side];
}

export function resolveConnectionSides(
  conn: RoomConnection,
  roomsById: Map<string, Room>,
): { sideOnA: WallSide; sideOnB: WallSide } | null {
  if (conn.sideA && conn.sideB) {
    return { sideOnA: conn.sideA, sideOnB: conn.sideB };
  }
  const a = roomsById.get(conn.roomAId);
  const b = roomsById.get(conn.roomBId);
  if (!a || !b) return null;
  const edge = sharedEdge(roomRect(a), roomRect(b));
  if (!edge) return null;
  return { sideOnA: edge.side, sideOnB: oppositeWallSide(edge.side) };
}

export function sideOnRoom(
  sides: { sideOnA: WallSide; sideOnB: WallSide },
  conn: RoomConnection,
  roomId: string,
): WallSide | null {
  if (conn.roomAId === roomId) return sides.sideOnA;
  if (conn.roomBId === roomId) return sides.sideOnB;
  return null;
}

export function enrichConnectionSides(
  conn: RoomConnection,
  roomsById: Map<string, Room>,
): RoomConnection {
  if (conn.sideA && conn.sideB) return conn;
  const sides = resolveConnectionSides(conn, roomsById);
  if (!sides) return conn;
  return { ...conn, sideA: sides.sideOnA, sideB: sides.sideOnB };
}

function neighborLayoutForSide(
  myRect: RoomRect,
  neighbor: Room,
  sideOnMe: WallSide,
  myRectBefore: RoomRect,
  neighborBefore: RoomRect,
): { layoutX: number; layoutZ: number } {
  let layoutX = neighborBefore.x + (myRect.x - myRectBefore.x);
  let layoutZ = neighborBefore.z + (myRect.z - myRectBefore.z);

  switch (sideOnMe) {
    case 'front':
      layoutZ = myRect.z + myRect.depthFt;
      break;
    case 'back':
      layoutZ = myRect.z - neighbor.depthFt;
      break;
    case 'right':
      layoutX = myRect.x + myRect.widthFt;
      break;
    case 'left':
      layoutX = myRect.x - neighbor.widthFt;
      break;
  }

  if (sideOnMe === 'front' || sideOnMe === 'back') {
    const overlap =
      Math.min(myRect.x + myRect.widthFt, layoutX + neighbor.widthFt) -
      Math.max(myRect.x, layoutX);
    if (overlap <= EDGE_TOLERANCE_FT) {
      layoutX = myRect.x;
    }
  } else {
    const overlap =
      Math.min(myRect.z + myRect.depthFt, layoutZ + neighbor.depthFt) -
      Math.max(myRect.z, layoutZ);
    if (overlap <= EDGE_TOLERANCE_FT) {
      layoutZ = myRect.z;
    }
  }

  return { layoutX, layoutZ };
}

function applyLayoutPatch(
  roomId: string,
  patch: { layoutX: number; layoutZ: number },
  virtual: Map<string, Room>,
  patches: Map<string, RoomLayoutPatch>,
): boolean {
  const existing = virtual.get(roomId);
  if (!existing) return false;
  if (
    (existing.layoutX ?? 0) === patch.layoutX &&
    (existing.layoutZ ?? 0) === patch.layoutZ
  ) {
    return false;
  }
  virtual.set(roomId, { ...existing, layoutX: patch.layoutX, layoutZ: patch.layoutZ });
  patches.set(roomId, { roomId, layoutX: patch.layoutX, layoutZ: patch.layoutZ });
  return true;
}

/**
 * When a room is resized (origin-anchored at layoutX/layoutZ), reposition connected
 * neighbors so every shared wall stays flush. Uses persisted connection sides when
 * available; cascades through chains and hub rooms with many connections.
 */
export function computeConnectedLayoutPatches(
  allRooms: Room[],
  connections: RoomConnection[],
  resizedRoomId: string,
  previousRoom: Room,
  nextRoom: Room,
): RoomLayoutPatch[] {
  if (
    previousRoom.widthFt === nextRoom.widthFt &&
    previousRoom.depthFt === nextRoom.depthFt
  ) {
    return [];
  }

  const originalById = new Map(allRooms.map((r) => [r.roomId, r]));
  const virtual = new Map(allRooms.map((r) => [r.roomId, { ...r }]));
  virtual.set(resizedRoomId, { ...virtual.get(resizedRoomId)!, ...nextRoom });

  const patches = new Map<string, RoomLayoutPatch>();
  const resizedRect = roomRect(virtual.get(resizedRoomId)!);
  const resizedRectBefore = roomRect(previousRoom);

  for (const conn of connections) {
    if (conn.roomAId !== resizedRoomId && conn.roomBId !== resizedRoomId) continue;
    const neighborId = conn.roomAId === resizedRoomId ? conn.roomBId : conn.roomAId;
    const neighborOriginal = originalById.get(neighborId);
    if (!neighborOriginal) continue;

    const sides = resolveConnectionSides(conn, originalById);
    const sideOnResized = sides ? sideOnRoom(sides, conn, resizedRoomId) : null;
    if (!sideOnResized) continue;

    const patch = neighborLayoutForSide(
      resizedRect,
      neighborOriginal,
      sideOnResized,
      resizedRectBefore,
      roomRect(neighborOriginal),
    );
    applyLayoutPatch(neighborId, patch, virtual, patches);
  }

  const queue = Array.from(patches.keys());
  const queued = new Set(queue);

  while (queue.length > 0) {
    const roomId = queue.shift()!;
    const currentRoom = virtual.get(roomId);
    const beforeRoom = originalById.get(roomId);
    if (!currentRoom || !beforeRoom) continue;

    const moved =
      roomId === resizedRoomId ||
      (currentRoom.layoutX ?? 0) !== (beforeRoom.layoutX ?? 0) ||
      (currentRoom.layoutZ ?? 0) !== (beforeRoom.layoutZ ?? 0);
    if (!moved) continue;

    const currentRect = roomRect(currentRoom);
    const beforeRect = roomRect(beforeRoom);

    for (const conn of connections) {
      if (conn.roomAId !== roomId && conn.roomBId !== roomId) continue;
      const neighborId = conn.roomAId === roomId ? conn.roomBId : conn.roomAId;
      if (neighborId === resizedRoomId) continue;

      const sides = resolveConnectionSides(conn, originalById);
      const sideOnCurrent = sides ? sideOnRoom(sides, conn, roomId) : null;
      if (!sideOnCurrent || sideOnCurrent === 'back' || sideOnCurrent === 'left') {
        continue;
      }

      const neighborOriginal = originalById.get(neighborId);
      if (!neighborOriginal) continue;

      const patch = neighborLayoutForSide(
        currentRect,
        neighborOriginal,
        sideOnCurrent,
        beforeRect,
        roomRect(neighborOriginal),
      );
      const changed = applyLayoutPatch(neighborId, patch, virtual, patches);
      if (changed && !queued.has(neighborId)) {
        queued.add(neighborId);
        queue.push(neighborId);
      }
    }
  }

  return Array.from(patches.values());
}
