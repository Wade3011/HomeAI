import type { Room } from '@/types';
import {
  solidWallSegments,
  type RoomWallPlan,
} from '@/lib/homeLayout';

export interface WalkSegment {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
}

export const WALK_EYE_HEIGHT_FT = 5.5;
/** Player collision radius — keeps you off wall faces. */
export const WALK_RADIUS_FT = 0.85;
/** Comfortable walk speed (ft/s). */
export const WALK_SPEED_FT_S = 7.5;
/** Acceleration toward target velocity for smoother starts/stops. */
export const WALK_ACCEL_FT_S2 = 28;

/**
 * Interior wall faces in room-local XZ (origin = room SW corner).
 * Openings (doors / open connections) leave gaps so you can walk through.
 */
export function wallSegmentsLocal(
  room: Pick<Room, 'widthFt' | 'depthFt'>,
  wallPlans: RoomWallPlan[],
): WalkSegment[] {
  const segments: WalkSegment[] = [];
  for (const plan of wallPlans) {
    for (const [start, end] of solidWallSegments(plan)) {
      if (end - start < 0.05) continue;
      switch (plan.side) {
        case 'back':
          segments.push({ x1: start, z1: 0, x2: end, z2: 0 });
          break;
        case 'front':
          segments.push({
            x1: start,
            z1: room.depthFt,
            x2: end,
            z2: room.depthFt,
          });
          break;
        case 'left':
          segments.push({ x1: 0, z1: start, x2: 0, z2: end });
          break;
        case 'right':
          segments.push({
            x1: room.widthFt,
            z1: start,
            x2: room.widthFt,
            z2: end,
          });
          break;
      }
    }
  }
  return segments;
}

/** Translate room-local segments into whole-home / site coordinates. */
export function wallSegmentsWorld(
  room: Pick<Room, 'widthFt' | 'depthFt' | 'layoutX' | 'layoutZ'>,
  wallPlans: RoomWallPlan[],
): WalkSegment[] {
  const ox = room.layoutX ?? 0;
  const oz = room.layoutZ ?? 0;
  return wallSegmentsLocal(room, wallPlans).map((s) => ({
    x1: s.x1 + ox,
    z1: s.z1 + oz,
    x2: s.x2 + ox,
    z2: s.z2 + oz,
  }));
}

function closestPointOnSegment(
  px: number,
  pz: number,
  seg: WalkSegment,
): { x: number; z: number; dist: number } {
  const dx = seg.x2 - seg.x1;
  const dz = seg.z2 - seg.z1;
  const lenSq = dx * dx + dz * dz;
  if (lenSq < 1e-12) {
    const dist = Math.hypot(px - seg.x1, pz - seg.z1);
    return { x: seg.x1, z: seg.z1, dist };
  }
  let t = ((px - seg.x1) * dx + (pz - seg.z1) * dz) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const x = seg.x1 + t * dx;
  const z = seg.z1 + t * dz;
  return { x, z, dist: Math.hypot(px - x, pz - z) };
}

/**
 * Push a circle out of all wall segments (XZ only).
 * Furniture is ignored — eye-height camera “flies over” sofas/tables.
 */
export function resolveWalkPosition(
  x: number,
  z: number,
  radius: number,
  segments: WalkSegment[],
  iterations = 3,
): { x: number; z: number } {
  let px = x;
  let pz = z;
  for (let i = 0; i < iterations; i++) {
    for (const seg of segments) {
      const hit = closestPointOnSegment(px, pz, seg);
      if (hit.dist >= radius || hit.dist < 1e-9) continue;
      const nx = (px - hit.x) / hit.dist;
      const nz = (pz - hit.z) / hit.dist;
      const push = radius - hit.dist;
      px += nx * push;
      pz += nz * push;
    }
  }
  return { x: px, z: pz };
}

/** Smoothly approach a target velocity. */
export function dampVelocity(
  current: { x: number; z: number },
  target: { x: number; z: number },
  accel: number,
  dt: number,
): { x: number; z: number } {
  const ax = target.x - current.x;
  const az = target.z - current.z;
  const maxDelta = accel * dt;
  const mag = Math.hypot(ax, az);
  if (mag <= maxDelta || mag < 1e-9) {
    return { x: target.x, z: target.z };
  }
  const s = maxDelta / mag;
  return { x: current.x + ax * s, z: current.z + az * s };
}
