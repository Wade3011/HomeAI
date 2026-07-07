import type { SiteCorner, SiteRoadSide, SiteSettings } from '@/types';

/** Standard paved street width (feet). Not user-editable. */
export const STANDARD_ROAD_WIDTH_FT = 28;

/** @deprecated Use STANDARD_ROAD_WIDTH_FT */
export const DEFAULT_ROAD_WIDTH_FT = STANDARD_ROAD_WIDTH_FT;

export const CORNER_ROAD_SIDES: Record<SiteCorner, SiteRoadSide[]> = {
  'north-west': ['north', 'west'],
  'north-east': ['north', 'east'],
  'south-west': ['south', 'west'],
  'south-east': ['south', 'east'],
};

export interface SiteRoadSegment {
  centerX: number;
  centerZ: number;
  widthFt: number;
  depthFt: number;
}

export function normalizeRoadSides(sides?: SiteRoadSide[]): SiteRoadSide[] {
  if (!sides?.length) return ['south'];
  if (sides.length === 1) return [sides[0]];
  return CORNER_ROAD_SIDES[cornerFromRoadSides(sides) ?? 'south-west'] ?? ['south', 'west'];
}

export function isCornerLot(roadSides?: SiteRoadSide[]): boolean {
  return normalizeRoadSides(roadSides).length >= 2;
}

export function cornerFromRoadSides(sides: SiteRoadSide[]): SiteCorner | null {
  if (sides.length < 2) return null;
  const set = new Set(sides);
  if (set.has('north') && set.has('west')) return 'north-west';
  if (set.has('north') && set.has('east')) return 'north-east';
  if (set.has('south') && set.has('west')) return 'south-west';
  if (set.has('south') && set.has('east')) return 'south-east';
  return null;
}

export function roadSidesLabel(sides?: SiteRoadSide[]): string {
  const normalized = normalizeRoadSides(sides);
  if (normalized.length >= 2) {
    const corner = cornerFromRoadSides(normalized);
    return corner ? `Corner lot (${corner.replace('-', ' ')})` : 'Corner lot';
  }
  const side = normalized[0];
  return `Street on ${side}`;
}

/** Axis-aligned road pavement strips outside the lot boundary. */
export function computeRoadSegments(site: SiteSettings): SiteRoadSegment[] {
  const roadWidth = STANDARD_ROAD_WIDTH_FT;
  const sides = normalizeRoadSides(site.roadSides);
  const ox = site.houseOffsetX ?? 0;
  const oz = site.houseOffsetZ ?? 0;
  const lw = site.lotWidthFt;
  const ld = site.lotDepthFt;
  const minX = ox;
  const minZ = oz;
  const maxX = ox + lw;
  const maxZ = oz + ld;
  const sideSet = new Set(sides);
  const extend = roadWidth;

  const segments: SiteRoadSegment[] = [];

  if (sideSet.has('south')) {
    const extraX =
      (sideSet.has('east') ? extend : 0) + (sideSet.has('west') ? extend : 0);
    segments.push({
      centerX: (minX + maxX) / 2,
      centerZ: maxZ + roadWidth / 2,
      widthFt: lw + extraX,
      depthFt: roadWidth,
    });
  }

  if (sideSet.has('north')) {
    const extraX =
      (sideSet.has('east') ? extend : 0) + (sideSet.has('west') ? extend : 0);
    segments.push({
      centerX: (minX + maxX) / 2,
      centerZ: minZ - roadWidth / 2,
      widthFt: lw + extraX,
      depthFt: roadWidth,
    });
  }

  if (sideSet.has('east')) {
    const extraZ =
      (sideSet.has('south') ? extend : 0) + (sideSet.has('north') ? extend : 0);
    segments.push({
      centerX: maxX + roadWidth / 2,
      centerZ: (minZ + maxZ) / 2,
      widthFt: roadWidth,
      depthFt: ld + extraZ,
    });
  }

  if (sideSet.has('west')) {
    const extraZ =
      (sideSet.has('south') ? extend : 0) + (sideSet.has('north') ? extend : 0);
    segments.push({
      centerX: minX - roadWidth / 2,
      centerZ: (minZ + maxZ) / 2,
      widthFt: roadWidth,
      depthFt: ld + extraZ,
    });
  }

  return segments;
}
