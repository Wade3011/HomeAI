import type { Room, RoomConnection, RoomWallSide } from '@/types';
import { roomRect, sharedEdge, type RoomRect, type WallSide } from '@/lib/homeLayout';

export interface FloorPlanRoomGroup {
  /** Stable id for React keys */
  id: string;
  rooms: Room[];
  roomIds: Set<string>;
}

type HSeg = { kind: 'h'; z: number; x1: number; x2: number };
type VSeg = { kind: 'v'; x: number; z1: number; z2: number };
export type UnionSegment = HSeg | VSeg;

const GROUP_FILL = '#e8e4de';
const GROUP_STROKE = '#57534e';

/** Rooms linked by a connection and touching on the plan form one group. */
export function findConnectedRoomGroups(
  rooms: Room[],
  connections: RoomConnection[],
): FloorPlanRoomGroup[] {
  const byId = new Map(rooms.map((r) => [r.roomId, r]));
  const adj = new Map<string, Set<string>>();
  for (const r of rooms) {
    adj.set(r.roomId, new Set());
  }

  for (const conn of connections) {
    const a = byId.get(conn.roomAId);
    const b = byId.get(conn.roomBId);
    if (!a || !b) continue;
    if (!sharedEdge(roomRect(a), roomRect(b))) continue;
    adj.get(a.roomId)!.add(b.roomId);
    adj.get(b.roomId)!.add(a.roomId);
  }

  const visited = new Set<string>();
  const groups: FloorPlanRoomGroup[] = [];

  for (const room of rooms) {
    if (visited.has(room.roomId)) continue;
    const stack = [room.roomId];
    const component: Room[] = [];
    visited.add(room.roomId);

    while (stack.length > 0) {
      const id = stack.pop()!;
      const r = byId.get(id);
      if (r) component.push(r);
      for (const neighborId of adj.get(id) ?? []) {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          stack.push(neighborId);
        }
      }
    }

    const roomIds = new Set(component.map((r) => r.roomId));
    groups.push({
      id: [...roomIds].sort().join('-'),
      rooms: component,
      roomIds,
    });
  }

  return groups;
}

function hSegKey(z: number, x1: number, x2: number): string {
  const a = Math.min(x1, x2);
  const b = Math.max(x1, x2);
  return `h:${z}:${a}:${b}`;
}

function vSegKey(x: number, z1: number, z2: number): string {
  const a = Math.min(z1, z2);
  const b = Math.max(z1, z2);
  return `v:${x}:${a}:${b}`;
}

function parseSegKey(key: string): UnionSegment | null {
  const parts = key.split(':');
  if (parts.length !== 4) return null;
  const [kind, a, b, c] = parts;
  const n1 = Number(a);
  const n2 = Number(b);
  const n3 = Number(c);
  if (kind === 'h') return { kind: 'h', z: n1, x1: n2, x2: n3 };
  if (kind === 'v') return { kind: 'v', x: n1, z1: n2, z2: n3 };
  return null;
}

function rectSegments(rect: RoomRect): UnionSegment[] {
  const x2 = rect.x + rect.widthFt;
  const z2 = rect.z + rect.depthFt;
  return [
    { kind: 'h', z: rect.z, x1: rect.x, x2 },
    { kind: 'h', z: z2, x1: rect.x, x2 },
    { kind: 'v', x: rect.x, z1: rect.z, z2 },
    { kind: 'v', x: x2, z1: rect.z, z2 },
  ];
}

/** Boundary segments of the union of axis-aligned room rects (shared walls cancel out). */
export function unionBoundarySegments(rects: RoomRect[]): UnionSegment[] {
  const counts = new Map<string, number>();
  for (const rect of rects) {
    for (const seg of rectSegments(rect)) {
      const key =
        seg.kind === 'h'
          ? hSegKey(seg.z, seg.x1, seg.x2)
          : vSegKey(seg.x, seg.z1, seg.z2);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  const boundary: UnionSegment[] = [];
  for (const [key, count] of counts) {
    if (count !== 1) continue;
    const seg = parseSegKey(key);
    if (seg) boundary.push(seg);
  }
  return boundary;
}

/** Wall sides of `room` that touch another room in the same connected group. */
export function hiddenEdgesInGroup(
  room: Room,
  groupRoomIds: Set<string>,
  roomsById: Map<string, Room>,
  connections: RoomConnection[],
): Set<WallSide> {
  const hidden = new Set<WallSide>();
  for (const conn of connections) {
    const otherId =
      conn.roomAId === room.roomId
        ? conn.roomBId
        : conn.roomBId === room.roomId
          ? conn.roomAId
          : null;
    if (!otherId || !groupRoomIds.has(otherId)) continue;
    const other = roomsById.get(otherId);
    if (!other) continue;
    const edge = sharedEdge(roomRect(room), roomRect(other));
    if (edge) hidden.add(edge.side);
  }
  return hidden;
}

export function groupForRoom(
  groups: FloorPlanRoomGroup[],
  roomId: string,
): FloorPlanRoomGroup | null {
  return groups.find((g) => g.roomIds.has(roomId) && g.rooms.length > 1) ?? null;
}

export { GROUP_FILL, GROUP_STROKE };

export function segmentToLine(
  seg: UnionSegment,
  scale: number,
): { x1: number; y1: number; x2: number; y2: number } {
  if (seg.kind === 'h') {
    return {
      x1: seg.x1 * scale,
      y1: seg.z * scale,
      x2: seg.x2 * scale,
      y2: seg.z * scale,
    };
  }
  return {
    x1: seg.x * scale,
    y1: seg.z1 * scale,
    x2: seg.x * scale,
    y2: seg.z2 * scale,
  };
}

/** Door connections shown once on the shared wall between grouped rooms. */
export function internalConnectionLabels(
  group: FloorPlanRoomGroup,
  connections: RoomConnection[],
): Array<{
  connectionId: string;
  kind: RoomConnection['kind'];
  side: RoomWallSide;
  otherName: string;
  labelX: number;
  labelZ: number;
}> {
  const labels: Array<{
    connectionId: string;
    kind: RoomConnection['kind'];
    side: RoomWallSide;
    otherName: string;
    labelX: number;
    labelZ: number;
  }> = [];
  const seen = new Set<string>();

  for (const conn of connections) {
    if (!group.roomIds.has(conn.roomAId) || !group.roomIds.has(conn.roomBId)) continue;
    const pairKey = [conn.roomAId, conn.roomBId].sort().join('-');
    if (seen.has(pairKey)) continue;

    const a = group.rooms.find((r) => r.roomId === conn.roomAId);
    const b = group.rooms.find((r) => r.roomId === conn.roomBId);
    if (!a || !b) continue;
    const edge = sharedEdge(roomRect(a), roomRect(b));
    if (!edge) continue;

    seen.add(pairKey);
    const midAlong = (edge.start + edge.end) / 2;
    let labelX = midAlong;
    let labelZ = midAlong;
    const ax = a.layoutX ?? 0;
    const az = a.layoutZ ?? 0;

    switch (edge.side) {
      case 'back':
        labelX = midAlong;
        labelZ = az;
        break;
      case 'front':
        labelX = midAlong;
        labelZ = az + a.depthFt;
        break;
      case 'left':
        labelX = ax;
        labelZ = midAlong;
        break;
      case 'right':
        labelX = ax + a.widthFt;
        labelZ = midAlong;
        break;
    }

    labels.push({
      connectionId: conn.connectionId,
      kind: conn.kind,
      side: edge.side,
      otherName: b.name,
      labelX,
      labelZ,
    });
  }

  return labels;
}
