import type { Room } from '@/types';
import { WALL_THICKNESS_FT } from '@/lib/homeLayout';

export interface RoomRect {
  roomId: string;
  x: number;
  z: number;
  w: number;
  d: number;
}

/** Snap radius (in feet) — within this distance, dragged room snaps to align. */
export const ROOM_SNAP_FT = 0.75; // ~9"

/**
 * Minimum gap (feet) between two rooms — equal to the wall thickness so the
 * shared wall fits between them. Snap targets and overlap resolution both
 * respect this so adjacent rooms end up edge-to-edge through their shared wall
 * instead of stacking footprints.
 */
export const ROOM_GAP_FT = WALL_THICKNESS_FT;

const EPS = 1e-6;
const HALF_GAP = ROOM_GAP_FT / 2;

export function roomToRect(room: Room, override?: { layoutX: number; layoutZ: number }): RoomRect {
  return {
    roomId: room.roomId,
    x: override?.layoutX ?? room.layoutX ?? 0,
    z: override?.layoutZ ?? room.layoutZ ?? 0,
    w: room.widthFt,
    d: room.depthFt,
  };
}

function rectsOverlap(a: RoomRect, b: RoomRect): boolean {
  return (
    a.x + a.w > b.x + EPS &&
    b.x + b.w > a.x + EPS &&
    a.z + a.d > b.z + EPS &&
    b.z + b.d > a.z + EPS
  );
}

function inflate(r: RoomRect, by: number): RoomRect {
  return {
    roomId: r.roomId,
    x: r.x - by,
    z: r.z - by,
    w: r.w + by * 2,
    d: r.d + by * 2,
  };
}

/** True iff rects are closer than ROOM_GAP_FT (overlapping for wall purposes). */
function tooClose(a: RoomRect, b: RoomRect): boolean {
  return rectsOverlap(inflate(a, HALF_GAP), inflate(b, HALF_GAP));
}

/** True when rects' z spans overlap (after expanding for wall gap). */
function spansOverlapZ(a: RoomRect, b: RoomRect): boolean {
  return a.z < b.z + b.d - EPS && b.z < a.z + a.d - EPS;
}

/** True when rects' x spans overlap (after expanding for wall gap). */
function spansOverlapX(a: RoomRect, b: RoomRect): boolean {
  return a.x < b.x + b.w - EPS && b.x < a.x + a.w - EPS;
}

/**
 * Resolve a dragged room's proposed position so it:
 *   1) snaps edge-to-edge with nearby siblings (within ROOM_SNAP_FT), with a
 *      ROOM_GAP_FT gap between rooms for the shared wall, and
 *   2) never gets closer than ROOM_GAP_FT to any sibling.
 *
 * Snaps each axis independently first, then pushes out of any remaining overlap.
 */
export function snapAndResolveRoomPosition(
  proposed: RoomRect,
  siblings: RoomRect[],
): { x: number; z: number } {
  const others = siblings.filter((s) => s.roomId !== proposed.roomId);
  let x = proposed.x;
  let z = proposed.z;

  // ---- Axis snap: X ----
  let bestDx = Number.POSITIVE_INFINITY;
  for (const s of others) {
    if (!spansOverlapZ({ ...proposed, x, z }, s)) continue;
    const candidates = [
      s.x - proposed.w - ROOM_GAP_FT, // dragged right edge GAP away from sibling left
      s.x + s.w + ROOM_GAP_FT, // dragged left edge GAP away from sibling right
      s.x, // align left edges (parallel walls)
      s.x + s.w - proposed.w, // align right edges
    ];
    for (const c of candidates) {
      const dx = c - x;
      if (Math.abs(dx) <= ROOM_SNAP_FT && Math.abs(dx) < Math.abs(bestDx)) {
        bestDx = dx;
      }
    }
  }
  if (Number.isFinite(bestDx)) x += bestDx;

  // ---- Axis snap: Z ----
  let bestDz = Number.POSITIVE_INFINITY;
  for (const s of others) {
    if (!spansOverlapX({ ...proposed, x, z }, s)) continue;
    const candidates = [
      s.z - proposed.d - ROOM_GAP_FT,
      s.z + s.d + ROOM_GAP_FT,
      s.z,
      s.z + s.d - proposed.d,
    ];
    for (const c of candidates) {
      const dz = c - z;
      if (Math.abs(dz) <= ROOM_SNAP_FT && Math.abs(dz) < Math.abs(bestDz)) {
        bestDz = dz;
      }
    }
  }
  if (Number.isFinite(bestDz)) z += bestDz;

  // ---- Resolve any remaining overlap (rooms closer than GAP) ----
  let safety = 8;
  while (safety-- > 0) {
    const moved = { ...proposed, x, z };
    const collider = others.find((s) => tooClose(moved, s));
    if (!collider) break;

    // Push so inflated rects no longer overlap (i.e. rooms are >= GAP apart).
    const im = inflate(moved, HALF_GAP);
    const ic = inflate(collider, HALF_GAP);

    const pushLeft = im.x + im.w - ic.x; // > 0 = amount to push left
    const pushRight = ic.x + ic.w - im.x;
    const pushUp = im.z + im.d - ic.z;
    const pushDown = ic.z + ic.d - im.z;

    const dxMin = pushLeft < pushRight ? -pushLeft : pushRight;
    const dzMin = pushUp < pushDown ? -pushUp : pushDown;

    if (Math.abs(dxMin) <= Math.abs(dzMin)) {
      x += dxMin;
    } else {
      z += dzMin;
    }
  }

  if (x < 0) x = 0;
  if (z < 0) z = 0;

  return { x, z };
}

/** Find a non-overlapping spot for a new room — accounts for ROOM_GAP_FT. */
export function findFreeRoomSlot(
  widthFt: number,
  depthFt: number,
  siblings: RoomRect[],
  seedX = 0,
  seedZ = 0,
): { x: number; z: number } {
  const rect: RoomRect = { roomId: '__new__', x: seedX, z: seedZ, w: widthFt, d: depthFt };
  const collides = (r: RoomRect) => siblings.some((s) => tooClose(r, s));
  if (!collides(rect)) return { x: seedX, z: seedZ };

  const maxRight =
    siblings.reduce((m, s) => Math.max(m, s.x + s.w), 0) + ROOM_GAP_FT;
  const candidate1: RoomRect = { ...rect, x: maxRight, z: seedZ };
  if (!collides(candidate1)) return { x: candidate1.x, z: candidate1.z };

  const maxBottom =
    siblings.reduce((m, s) => Math.max(m, s.z + s.d), 0) + ROOM_GAP_FT;
  const candidate2: RoomRect = { ...rect, x: 0, z: maxBottom };
  if (!collides(candidate2)) return { x: candidate2.x, z: candidate2.z };

  return { x: maxRight, z: maxBottom };
}
