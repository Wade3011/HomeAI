import { computeProjectBounds, type ProjectBounds } from '@/lib/homeLayout';
import { computeRoadSegments, DEFAULT_ROAD_WIDTH_FT } from '@/lib/siteRoads';
import type {
  ExteriorDoor,
  Room,
  RoomWallSide,
  SitePoint,
  SiteSettings,
  SiteStructure,
} from '@/types';

export const DEFAULT_LOT_WIDTH_FT = 120;
export const DEFAULT_LOT_DEPTH_FT = 150;

export interface SiteBounds extends ProjectBounds {
  lotMinX: number;
  lotMinZ: number;
  lotMaxX: number;
  lotMaxZ: number;
}

export function defaultSiteSettings(projectId: string): SiteSettings {
  return {
    projectId,
    lotWidthFt: DEFAULT_LOT_WIDTH_FT,
    lotDepthFt: DEFAULT_LOT_DEPTH_FT,
    houseOffsetX: 0,
    houseOffsetZ: 0,
    roadSides: ['south'],
    roadWidthFt: DEFAULT_ROAD_WIDTH_FT,
  };
}

/** Alias for house-only footprint bounds. */
export function computeHouseBounds(rooms: Room[]): ProjectBounds {
  return computeProjectBounds(rooms);
}

function polygonBounds(points: SitePoint[]): ProjectBounds | null {
  if (points.length === 0) return null;
  let minX = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxZ = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minZ = Math.min(minZ, p.z);
    maxX = Math.max(maxX, p.x);
    maxZ = Math.max(maxZ, p.z);
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

/** Lot rectangle plus house footprint and all site structure polygons. */
export function computeSiteBounds(
  site: SiteSettings,
  rooms: Room[],
  structures: SiteStructure[],
): SiteBounds {
  const offsetX = site.houseOffsetX ?? 0;
  const offsetZ = site.houseOffsetZ ?? 0;

  const lotMinX = offsetX;
  const lotMinZ = offsetZ;
  const lotMaxX = offsetX + site.lotWidthFt;
  const lotMaxZ = offsetZ + site.lotDepthFt;

  let minX = lotMinX;
  let minZ = lotMinZ;
  let maxX = lotMaxX;
  let maxZ = lotMaxZ;

  if (rooms.length > 0) {
    const house = computeProjectBounds(rooms);
    minX = Math.min(minX, house.minX + offsetX);
    minZ = Math.min(minZ, house.minZ + offsetZ);
    maxX = Math.max(maxX, house.maxX + offsetX);
    maxZ = Math.max(maxZ, house.maxZ + offsetZ);
  }

  for (const s of structures) {
    const b = polygonBounds(s.points);
    if (!b) continue;
    minX = Math.min(minX, b.minX);
    minZ = Math.min(minZ, b.minZ);
    maxX = Math.max(maxX, b.maxX);
    maxZ = Math.max(maxZ, b.maxZ);
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
    lotMinX,
    lotMinZ,
    lotMaxX,
    lotMaxZ,
  };
}

/**
 * Scene bounds when the house sits at the plan origin and the lot is shifted by
 * houseOffset — matches SitePlanEditor and HomeScene room placement.
 */
export function computeSiteSceneBounds(
  site: SiteSettings,
  rooms: Room[],
  structures: SiteStructure[],
): SiteBounds {
  const offsetX = site.houseOffsetX ?? 0;
  const offsetZ = site.houseOffsetZ ?? 0;

  const lotMinX = offsetX;
  const lotMinZ = offsetZ;
  const lotMaxX = offsetX + site.lotWidthFt;
  const lotMaxZ = offsetZ + site.lotDepthFt;

  let minX = lotMinX;
  let minZ = lotMinZ;
  let maxX = lotMaxX;
  let maxZ = lotMaxZ;

  if (rooms.length > 0) {
    const house = computeProjectBounds(rooms);
    minX = Math.min(minX, house.minX);
    minZ = Math.min(minZ, house.minZ);
    maxX = Math.max(maxX, house.maxX);
    maxZ = Math.max(maxZ, house.maxZ);
  }

  for (const s of structures) {
    const b = polygonBounds(s.points);
    if (!b) continue;
    minX = Math.min(minX, b.minX);
    minZ = Math.min(minZ, b.minZ);
    maxX = Math.max(maxX, b.maxX);
    maxZ = Math.max(maxZ, b.maxZ);
  }

  for (const road of computeRoadSegments(site)) {
    minX = Math.min(minX, road.centerX - road.widthFt / 2);
    minZ = Math.min(minZ, road.centerZ - road.depthFt / 2);
    maxX = Math.max(maxX, road.centerX + road.widthFt / 2);
    maxZ = Math.max(maxZ, road.centerZ + road.depthFt / 2);
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
    lotMinX,
    lotMinZ,
    lotMaxX,
    lotMaxZ,
  };
}

/** Axis-aligned rectangle as 4 corner points (back-left winding). */
export function rectToPolygon(
  centerX: number,
  centerZ: number,
  widthFt: number,
  depthFt: number,
  rotationY = 0,
): SitePoint[] {
  if (Math.abs(rotationY) < 0.001) {
    const halfW = widthFt / 2;
    const halfD = depthFt / 2;
    return [
      { x: centerX - halfW, z: centerZ - halfD },
      { x: centerX + halfW, z: centerZ - halfD },
      { x: centerX + halfW, z: centerZ + halfD },
      { x: centerX - halfW, z: centerZ + halfD },
    ];
  }

  const cos = Math.cos(rotationY);
  const sin = Math.sin(rotationY);
  const halfW = widthFt / 2;
  const halfD = depthFt / 2;
  const corners = [
    { lx: -halfW, lz: -halfD },
    { lx: halfW, lz: -halfD },
    { lx: halfW, lz: halfD },
    { lx: -halfW, lz: halfD },
  ];
  return corners.map(({ lx, lz }) => ({
    x: centerX + lx * cos - lz * sin,
    z: centerZ + lx * sin + lz * cos,
  }));
}

export function polygonCenter(points: SitePoint[]): { x: number; z: number } {
  if (points.length === 0) return { x: 0, z: 0 };
  let x = 0;
  let z = 0;
  for (const p of points) {
    x += p.x;
    z += p.z;
  }
  return { x: x / points.length, z: z / points.length };
}

export function structureBounds(structure: SiteStructure): ProjectBounds | null {
  return polygonBounds(structure.points);
}

export function snapSiteFt(value: number, step = 1): number {
  return Math.round(value / step) * step;
}

/** Update a structure's axis-aligned rectangle footprint. */
export function updateStructureRect(
  structure: SiteStructure,
  minX: number,
  minZ: number,
  maxX: number,
  maxZ: number,
): SiteStructure {
  const widthFt = Math.max(1, maxX - minX);
  const depthFt = Math.max(1, maxZ - minZ);
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const rotationY = structure.rotationY ?? 0;
  return {
    ...structure,
    centerX,
    centerZ,
    widthFt,
    depthFt,
    points: rectToPolygon(centerX, centerZ, widthFt, depthFt, rotationY),
    updatedAt: new Date().toISOString(),
  };
}

export function moveStructure(
  structure: SiteStructure,
  centerX: number,
  centerZ: number,
): SiteStructure {
  const widthFt = structure.widthFt ?? structureBounds(structure)?.widthFt ?? 10;
  const depthFt = structure.depthFt ?? structureBounds(structure)?.depthFt ?? 10;
  const rotationY = structure.rotationY ?? 0;
  return {
    ...structure,
    centerX,
    centerZ,
    widthFt,
    depthFt,
    points: rectToPolygon(centerX, centerZ, widthFt, depthFt, rotationY),
    updatedAt: new Date().toISOString(),
  };
}

/** World-space center of an exterior door on a room wall. */
export function exteriorDoorWorldPoint(
  room: Room,
  door: ExteriorDoor,
): { x: number; z: number } {
  const lx = room.layoutX ?? 0;
  const lz = room.layoutZ ?? 0;
  const offset = door.offsetFt;
  switch (door.side) {
    case 'back':
      return { x: lx + offset, z: lz };
    case 'front':
      return { x: lx + offset, z: lz + room.depthFt };
    case 'left':
      return { x: lx, z: lz + offset };
    case 'right':
      return { x: lx + room.widthFt, z: lz + offset };
  }
}

/** Move a rectangle so its nearest edge aligns toward a target point (e.g. garage door). */
export function snapRectTowardPoint(
  centerX: number,
  centerZ: number,
  widthFt: number,
  depthFt: number,
  targetX: number,
  targetZ: number,
): { centerX: number; centerZ: number } {
  const halfW = widthFt / 2;
  const halfD = depthFt / 2;
  const dx = targetX - centerX;
  const dz = targetZ - centerZ;

  if (Math.abs(dx) > Math.abs(dz)) {
    const sign = dx >= 0 ? 1 : -1;
    return { centerX: targetX - sign * halfW, centerZ: centerZ };
  }
  const sign = dz >= 0 ? 1 : -1;
  return { centerX: centerX, centerZ: targetZ - sign * halfD };
}

/** Nearest exterior door on garage/porch rooms for driveway snapping. */
export function findDrivewaySnapTarget(
  rooms: Room[],
  exteriorDoors: ExteriorDoor[],
  nearX: number,
  nearZ: number,
  maxDistFt = 30,
): { x: number; z: number; roomId: string; side: RoomWallSide } | null {
  const roomById = new Map(rooms.map((r) => [r.roomId, r]));
  let best: { x: number; z: number; roomId: string; side: RoomWallSide; dist: number } | null =
    null;

  for (const door of exteriorDoors) {
    const room = roomById.get(door.roomId);
    if (!room) continue;
    if (room.type !== 'garage' && room.type !== 'porch') continue;
    const pt = exteriorDoorWorldPoint(room, door);
    const dist = Math.hypot(pt.x - nearX, pt.z - nearZ);
    if (dist > maxDistFt) continue;
    if (!best || dist < best.dist) {
      best = { ...pt, roomId: door.roomId, side: door.side, dist };
    }
  }
  if (!best) return null;
  return { x: best.x, z: best.z, roomId: best.roomId, side: best.side };
}
