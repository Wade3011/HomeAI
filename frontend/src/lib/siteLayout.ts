import { computeProjectBounds, type ProjectBounds } from '@/lib/homeLayout';
import { computeRoadSegments } from '@/lib/siteRoads';
import type {
  ExteriorDoor,
  Room,
  RoomType,
  RoomWallSide,
  SitePoint,
  SiteSettings,
  SiteStructure,
  SiteStructureKind,
} from '@/types';
import { isBuildingKind } from '@/config/siteStructurePresets';

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

const ROTATION_STEP = Math.PI / 2;

export function setStructureRotation(
  structure: SiteStructure,
  rotationY: number,
): SiteStructure {
  const b = structureBounds(structure);
  if (!b) return structure;
  const centerX = structure.centerX ?? b.centerX;
  const centerZ = structure.centerZ ?? b.centerZ;
  const widthFt = structure.widthFt ?? b.widthFt;
  const depthFt = structure.depthFt ?? b.depthFt;
  return {
    ...structure,
    centerX,
    centerZ,
    widthFt,
    depthFt,
    rotationY,
    points: rectToPolygon(centerX, centerZ, widthFt, depthFt, rotationY),
    updatedAt: new Date().toISOString(),
  };
}

export function structureRotationDegrees(structure: SiteStructure): number {
  const deg = ((structure.rotationY ?? 0) * 180) / Math.PI;
  return ((Math.round(deg) % 360) + 360) % 360;
}

export function rotateStructure(structure: SiteStructure, steps = 1): SiteStructure {
  const rotationY = (structure.rotationY ?? 0) + steps * ROTATION_STEP;
  return setStructureRotation(structure, rotationY);
}

export function roomTypeForSiteStructure(kind: SiteStructureKind): RoomType {
  switch (kind) {
    case 'detached-garage':
    case 'pole-barn':
      return 'garage';
    case 'shed':
      return 'utility';
    default:
      return 'other';
  }
}

function transformLocalPoint(
  centerX: number,
  centerZ: number,
  lx: number,
  lz: number,
  rotationY: number,
): SitePoint {
  const cos = Math.cos(rotationY);
  const sin = Math.sin(rotationY);
  return {
    x: centerX + lx * cos - lz * sin,
    z: centerZ + lx * sin + lz * cos,
  };
}

/** World-space line segment for the main door on a building footprint (3 ft wide). */
export function structureDoorSegment(
  structure: SiteStructure,
): { a: SitePoint; b: SitePoint } | null {
  if (!isBuildingKind(structure.kind)) return null;
  const b = structureBounds(structure);
  if (!b) return null;
  const centerX = structure.centerX ?? b.centerX;
  const centerZ = structure.centerZ ?? b.centerZ;
  const widthFt = structure.widthFt ?? b.widthFt;
  const depthFt = structure.depthFt ?? b.depthFt;
  const rotationY = structure.rotationY ?? 0;
  const side = structure.doorSide ?? 'front';
  const doorHalf = 1.5;
  const halfW = widthFt / 2;
  const halfD = depthFt / 2;

  let lx1 = 0;
  let lz1 = 0;
  let lx2 = 0;
  let lz2 = 0;
  switch (side) {
    case 'front':
      lx1 = -doorHalf;
      lz1 = halfD;
      lx2 = doorHalf;
      lz2 = halfD;
      break;
    case 'back':
      lx1 = -doorHalf;
      lz1 = -halfD;
      lx2 = doorHalf;
      lz2 = -halfD;
      break;
    case 'left':
      lx1 = -halfW;
      lz1 = -doorHalf;
      lx2 = -halfW;
      lz2 = doorHalf;
      break;
    case 'right':
      lx1 = halfW;
      lz1 = -doorHalf;
      lx2 = halfW;
      lz2 = doorHalf;
      break;
  }

  return {
    a: transformLocalPoint(centerX, centerZ, lx1, lz1, rotationY),
    b: transformLocalPoint(centerX, centerZ, lx2, lz2, rotationY),
  };
}

export function structureHasRotation(structure: SiteStructure): boolean {
  return Math.abs(structure.rotationY ?? 0) > 0.001;
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

export interface DrivewaySnapTarget {
  room: Room;
  door: ExteriorDoor;
  x: number;
  z: number;
}

/** Position a driveway rectangle so its near edge meets an exterior door. */
export function snapDrivewayToExteriorDoor(
  room: Room,
  door: ExteriorDoor,
  widthFt: number,
  depthFt: number,
): { centerX: number; centerZ: number } {
  const pt = exteriorDoorWorldPoint(room, door);
  switch (door.side) {
    case 'front':
      return { centerX: pt.x, centerZ: pt.z + depthFt / 2 };
    case 'back':
      return { centerX: pt.x, centerZ: pt.z - depthFt / 2 };
    case 'left':
      return { centerX: pt.x - widthFt / 2, centerZ: pt.z };
    case 'right':
      return { centerX: pt.x + widthFt / 2, centerZ: pt.z };
  }
}

function drivewaySnapTargetFromDoor(
  room: Room,
  door: ExteriorDoor,
): DrivewaySnapTarget {
  const pt = exteriorDoorWorldPoint(room, door);
  return { room, door, x: pt.x, z: pt.z };
}

/** Best garage or porch exterior door for a one-click driveway preset. */
export function findPrimaryGarageDrivewayTarget(
  rooms: Room[],
  exteriorDoors: ExteriorDoor[],
): DrivewaySnapTarget | null {
  const roomById = new Map(rooms.map((r) => [r.roomId, r]));
  for (const door of exteriorDoors) {
    const room = roomById.get(door.roomId);
    if (room?.type === 'garage') return drivewaySnapTargetFromDoor(room, door);
  }
  for (const door of exteriorDoors) {
    const room = roomById.get(door.roomId);
    if (room?.type === 'porch') return drivewaySnapTargetFromDoor(room, door);
  }
  return null;
}

/** Nearest exterior door on garage/porch rooms for driveway snapping. */
export function findNearestDrivewaySnapTarget(
  rooms: Room[],
  exteriorDoors: ExteriorDoor[],
  nearX: number,
  nearZ: number,
  maxDistFt = 30,
): DrivewaySnapTarget | null {
  const roomById = new Map(rooms.map((r) => [r.roomId, r]));
  let best: (DrivewaySnapTarget & { dist: number }) | null = null;

  for (const door of exteriorDoors) {
    const room = roomById.get(door.roomId);
    if (!room) continue;
    if (room.type !== 'garage' && room.type !== 'porch') continue;
    const target = drivewaySnapTargetFromDoor(room, door);
    const dist = Math.hypot(target.x - nearX, target.z - nearZ);
    if (dist > maxDistFt) continue;
    if (!best || dist < best.dist) {
      best = { ...target, dist };
    }
  }
  if (!best) return null;
  return { room: best.room, door: best.door, x: best.x, z: best.z };
}

/** @deprecated Use findNearestDrivewaySnapTarget */
export function findDrivewaySnapTarget(
  rooms: Room[],
  exteriorDoors: ExteriorDoor[],
  nearX: number,
  nearZ: number,
  maxDistFt = 30,
): { x: number; z: number; roomId: string; side: RoomWallSide } | null {
  const target = findNearestDrivewaySnapTarget(rooms, exteriorDoors, nearX, nearZ, maxDistFt);
  if (!target) return null;
  return {
    x: target.x,
    z: target.z,
    roomId: target.room.roomId,
    side: target.door.side,
  };
}

/** Reposition a driveway so its near edge meets the given exterior door. */
export function snapDrivewayStructureToDoor(
  structure: SiteStructure,
  room: Room,
  door: ExteriorDoor,
): SiteStructure {
  const b = structureBounds(structure);
  if (!b || structure.kind !== 'driveway') return structure;
  const widthFt = structure.widthFt ?? b.widthFt;
  const depthFt = structure.depthFt ?? b.depthFt;
  const { centerX, centerZ } = snapDrivewayToExteriorDoor(room, door, widthFt, depthFt);
  return moveStructure(structure, centerX, centerZ);
}

/** Snap a driveway toward the nearest garage/porch door when within range. */
export function trySnapDrivewayNearDoors(
  structure: SiteStructure,
  rooms: Room[],
  exteriorDoors: ExteriorDoor[],
  maxDistFt = 25,
): SiteStructure {
  if (structure.kind !== 'driveway') return structure;
  const b = structureBounds(structure);
  if (!b) return structure;
  const target = findNearestDrivewaySnapTarget(
    rooms,
    exteriorDoors,
    b.centerX,
    b.centerZ,
    maxDistFt,
  );
  if (!target) return structure;
  return snapDrivewayStructureToDoor(structure, target.room, target.door);
}

function pointInAxisRect(
  x: number,
  z: number,
  minX: number,
  minZ: number,
  maxX: number,
  maxZ: number,
): boolean {
  return x >= minX && x <= maxX && z >= minZ && z <= maxZ;
}

function pointInPolygon(p: SitePoint, polygon: SitePoint[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const zi = polygon[i].z;
    const xj = polygon[j].x;
    const zj = polygon[j].z;
    const intersects =
      zi > p.z !== zj > p.z && p.x < ((xj - xi) * (p.z - zi)) / (zj - zi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function polygonOverlapsRoom(polygon: SitePoint[], room: Room): boolean {
  if (polygon.length === 0) return false;
  const lx = room.layoutX ?? 0;
  const lz = room.layoutZ ?? 0;
  const minX = lx;
  const minZ = lz;
  const maxX = lx + room.widthFt;
  const maxZ = lz + room.depthFt;

  if (polygon.some((p) => pointInAxisRect(p.x, p.z, minX, minZ, maxX, maxZ))) {
    return true;
  }

  const corners: SitePoint[] = [
    { x: minX, z: minZ },
    { x: maxX, z: minZ },
    { x: maxX, z: maxZ },
    { x: minX, z: maxZ },
  ];
  if (corners.some((c) => pointInPolygon(c, polygon))) return true;

  const pb = polygonBounds(polygon);
  if (!pb) return false;
  return !(
    pb.maxX < minX ||
    pb.minX > maxX ||
    pb.maxZ < minZ ||
    pb.minZ > maxZ
  );
}

/** Names of house rooms whose footprint overlaps a site building. */
export function structureOverlapsHouse(structure: SiteStructure, rooms: Room[]): string[] {
  if (!isBuildingKind(structure.kind)) return [];
  const polygon = structure.points;
  if (polygon.length === 0) return [];
  const names: string[] = [];
  for (const room of rooms) {
    if (room.linkedSiteStructureId) continue;
    if (polygonOverlapsRoom(polygon, room)) {
      names.push(room.name);
    }
  }
  return names;
}
