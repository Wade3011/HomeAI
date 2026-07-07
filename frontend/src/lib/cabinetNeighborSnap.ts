import type { CatalogItem, Placement } from '@/types';
import {
  buildFootprints,
  catalogDimensionsFt,
  orientedDimensions,
  overlapsAny,
  type PlacementFootprint,
} from '@/components/planner/placementCollision';
import { isBaseCabinetItem, isWallCabinetItem } from '@/lib/placementHeight';
import {
  CABINET_GRID_FT,
  clampPlacementOrigin,
  rotationStepsFromY,
  snapToGrid,
} from '@/components/planner/plannerUtils';
import {
  clickToPlacementOrigin,
  inferWallFromPlacement,
  nearestWall,
  snapWallCabinetAlongWall,
  type RoomWallId,
} from '@/lib/placementSnap';

const NEIGHBOR_SNAP_THRESHOLD_FT = 1.25;

type Origin = { x: number; z: number };

function centerFromOrigin(x: number, z: number, widthFt: number, depthFt: number): Origin {
  return { x: x + widthFt / 2, z: z + depthFt / 2 };
}

function distanceToClick(
  origin: Origin,
  clickX: number,
  clickZ: number,
  widthFt: number,
  depthFt: number,
): number {
  const c = centerFromOrigin(origin.x, origin.z, widthFt, depthFt);
  return Math.hypot(clickX - c.x, clickZ - c.z);
}

function runAxisForRotation(rotationY: number): 'x' | 'z' {
  return rotationStepsFromY(rotationY) % 2 === 0 ? 'x' : 'z';
}

function sameRunLine(a: Origin, b: Origin, runAxis: 'x' | 'z', toleranceFt = 0.05): boolean {
  if (runAxis === 'x') return Math.abs(a.z - b.z) <= toleranceFt;
  return Math.abs(a.x - b.x) <= toleranceFt;
}

function pointInFootprint(
  px: number,
  pz: number,
  x: number,
  z: number,
  widthFt: number,
  depthFt: number,
  toleranceFt = 0,
): boolean {
  return (
    px >= x - toleranceFt &&
    px <= x + widthFt + toleranceFt &&
    pz >= z - toleranceFt &&
    pz <= z + depthFt + toleranceFt
  );
}

function addNeighborCandidates(
  candidates: Origin[],
  neighbor: Origin,
  neighborWidthFt: number,
  neighborDepthFt: number,
  selfWidthFt: number,
  selfDepthFt: number,
  rotationY: number,
): void {
  const runAxis = runAxisForRotation(rotationY);
  const n = orientedDimensions(neighborWidthFt, neighborDepthFt, rotationY);
  const s = orientedDimensions(selfWidthFt, selfDepthFt, rotationY);

  if (runAxis === 'x') {
    candidates.push({ x: neighbor.x + n.widthFt, z: neighbor.z });
    candidates.push({ x: neighbor.x - s.widthFt, z: neighbor.z });
  } else {
    candidates.push({ x: neighbor.x, z: neighbor.z + n.widthFt });
    candidates.push({ x: neighbor.x, z: neighbor.z - s.widthFt });
  }
}

function addProximityNeighborCandidates(
  candidates: Origin[],
  clickX: number,
  clickZ: number,
  neighbor: Origin,
  neighborWidthFt: number,
  neighborDepthFt: number,
  selfWidthFt: number,
  selfDepthFt: number,
  rotationY: number,
): void {
  const runAxis = runAxisForRotation(rotationY);
  const n = orientedDimensions(neighborWidthFt, neighborDepthFt, rotationY);

  if (runAxis === 'x') {
    const rightEdge = neighbor.x + n.widthFt;
    if (Math.abs(clickX - rightEdge) <= NEIGHBOR_SNAP_THRESHOLD_FT) {
      candidates.push({ x: rightEdge, z: neighbor.z });
    }
    if (Math.abs(clickX - neighbor.x) <= NEIGHBOR_SNAP_THRESHOLD_FT) {
      const s = orientedDimensions(selfWidthFt, selfDepthFt, rotationY);
      candidates.push({ x: neighbor.x - s.widthFt, z: neighbor.z });
    }
  } else {
    const farEdge = neighbor.z + n.widthFt;
    if (Math.abs(clickZ - farEdge) <= NEIGHBOR_SNAP_THRESHOLD_FT) {
      candidates.push({ x: neighbor.x, z: farEdge });
    }
    if (Math.abs(clickZ - neighbor.z) <= NEIGHBOR_SNAP_THRESHOLD_FT) {
      const s = orientedDimensions(selfWidthFt, selfDepthFt, rotationY);
      candidates.push({ x: neighbor.x, z: neighbor.z - s.widthFt });
    }
  }
}

function pickClosestValidOrigin({
  candidates,
  clickX,
  clickZ,
  widthFt,
  depthFt,
  rotationY,
  roomWidthFt,
  roomDepthFt,
  footprints,
  excludePlacementId,
  placingItem,
  catalogById,
  gridFt = CABINET_GRID_FT,
}: {
  candidates: Origin[];
  clickX: number;
  clickZ: number;
  widthFt: number;
  depthFt: number;
  rotationY: number;
  roomWidthFt: number;
  roomDepthFt: number;
  footprints: PlacementFootprint[];
  excludePlacementId?: string;
  placingItem?: CatalogItem;
  catalogById?: Record<string, CatalogItem>;
  gridFt?: number;
}): Origin | null {
  const o = orientedDimensions(widthFt, depthFt, rotationY);
  let best: { origin: Origin; dist: number } | null = null;

  for (const raw of candidates) {
    const clamped = clampPlacementOrigin(
      snapToGrid(raw.x, gridFt),
      snapToGrid(raw.z, gridFt),
      o.widthFt,
      o.depthFt,
      roomWidthFt,
      roomDepthFt,
    );
    if (
      overlapsAny(
        clamped.x,
        clamped.z,
        widthFt,
        depthFt,
        rotationY,
        footprints,
        excludePlacementId,
        placingItem,
        catalogById,
      )
    ) {
      continue;
    }
    const dist = distanceToClick(clamped, clickX, clickZ, o.widthFt, o.depthFt);
    if (!best || dist < best.dist) {
      best = { origin: clamped, dist };
    }
  }

  return best?.origin ?? null;
}

function collectBaseNeighborPlacements(
  placements: Placement[],
  catalogById: Record<string, CatalogItem>,
  rotationY: number,
  excludePlacementId?: string,
): { placement: Placement; widthFt: number; depthFt: number }[] {
  const steps = rotationStepsFromY(rotationY);
  return placements
    .filter((p) => p.placementId !== excludePlacementId)
    .map((p) => {
      const item = catalogById[p.catalogItemId ?? ''];
      if (!item || !isBaseCabinetItem(item)) return null;
      if (rotationStepsFromY(p.rotationY) !== steps) return null;
      const { widthFt, depthFt } = catalogDimensionsFt(item);
      return { placement: p, widthFt, depthFt };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
}

function collectWallNeighborPlacements(
  placements: Placement[],
  catalogById: Record<string, CatalogItem>,
  wall: RoomWallId,
  rotationY: number,
  roomWidthFt: number,
  roomDepthFt: number,
  excludePlacementId?: string,
): { placement: Placement; widthFt: number; depthFt: number }[] {
  const steps = rotationStepsFromY(rotationY);
  return placements
    .filter((p) => p.placementId !== excludePlacementId)
    .map((p) => {
      const item = catalogById[p.catalogItemId ?? ''];
      if (!item || !isWallCabinetItem(item)) return null;
      if (rotationStepsFromY(p.rotationY) !== steps) return null;
      const { widthFt, depthFt } = catalogDimensionsFt(item);
      return { placement: p, widthFt, depthFt };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .filter(({ placement, widthFt, depthFt }) => {
      const inferred = inferWallFromPlacement(
        placement.positionX,
        placement.positionZ,
        widthFt,
        depthFt,
        placement.rotationY,
        roomWidthFt,
        roomDepthFt,
      );
      return inferred === wall;
    });
}

function appendNeighborSnapCandidates(
  candidates: Origin[],
  clickX: number,
  clickZ: number,
  neighbor: Origin,
  neighborWidthFt: number,
  neighborDepthFt: number,
  selfWidthFt: number,
  selfDepthFt: number,
  rotationY: number,
): void {
  addNeighborCandidates(
    candidates,
    neighbor,
    neighborWidthFt,
    neighborDepthFt,
    selfWidthFt,
    selfDepthFt,
    rotationY,
  );
  const n = orientedDimensions(neighborWidthFt, neighborDepthFt, rotationY);
  if (pointInFootprint(clickX, clickZ, neighbor.x, neighbor.z, n.widthFt, n.depthFt, 0.05)) {
    return;
  }
  addProximityNeighborCandidates(
    candidates,
    clickX,
    clickZ,
    neighbor,
    neighborWidthFt,
    neighborDepthFt,
    selfWidthFt,
    selfDepthFt,
    rotationY,
  );
}

/** Snap a base cabinet flush to walls and adjacent base cabinets; rejects overlaps. */
export function snapBaseCabinetPosition({
  clickX,
  clickZ,
  widthFt,
  depthFt,
  rotationY,
  roomWidthFt,
  roomDepthFt,
  placements,
  catalogById,
  excludePlacementId,
  footprints: footprintsIn,
  placingItem,
  gridFt = CABINET_GRID_FT,
}: {
  clickX: number;
  clickZ: number;
  widthFt: number;
  depthFt: number;
  rotationY: number;
  roomWidthFt: number;
  roomDepthFt: number;
  placements: Placement[];
  catalogById: Record<string, CatalogItem>;
  excludePlacementId?: string;
  footprints?: PlacementFootprint[];
  placingItem?: CatalogItem;
  gridFt?: number;
}): Origin | null {
  const footprints = footprintsIn ?? buildFootprints(placements, catalogById);
  const wall = nearestWall(clickX, clickZ, roomWidthFt, roomDepthFt);
  const candidates: Origin[] = [
    clickToPlacementOrigin(clickX, clickZ, widthFt, depthFt, rotationY),
    snapWallCabinetAlongWall(
      wall,
      clickX,
      clickZ,
      widthFt,
      depthFt,
      rotationY,
      roomWidthFt,
      roomDepthFt,
    ),
  ];

  for (const { placement, widthFt: nw, depthFt: nd } of collectBaseNeighborPlacements(
    placements,
    catalogById,
    rotationY,
    excludePlacementId,
  )) {
    const neighbor = { x: placement.positionX, z: placement.positionZ };
    appendNeighborSnapCandidates(
      candidates,
      clickX,
      clickZ,
      neighbor,
      nw,
      nd,
      widthFt,
      depthFt,
      rotationY,
    );
  }

  return pickClosestValidOrigin({
    candidates,
    clickX,
    clickZ,
    widthFt,
    depthFt,
    rotationY,
    roomWidthFt,
    roomDepthFt,
    footprints,
    excludePlacementId,
    placingItem,
    catalogById,
    gridFt,
  });
}

/** Snap a wall cabinet along its wall and flush to neighboring wall cabinets. */
export function snapWallCabinetWithNeighbors({
  clickX,
  clickZ,
  widthFt,
  depthFt,
  rotationY,
  wall,
  roomWidthFt,
  roomDepthFt,
  placements,
  catalogById,
  excludePlacementId,
  footprints: footprintsIn,
  placingItem,
  gridFt = CABINET_GRID_FT,
}: {
  clickX: number;
  clickZ: number;
  widthFt: number;
  depthFt: number;
  rotationY: number;
  wall: RoomWallId;
  roomWidthFt: number;
  roomDepthFt: number;
  placements: Placement[];
  catalogById: Record<string, CatalogItem>;
  excludePlacementId?: string;
  footprints?: PlacementFootprint[];
  placingItem?: CatalogItem;
  gridFt?: number;
}): Origin | null {
  const footprints = footprintsIn ?? buildFootprints(placements, catalogById);
  const candidates: Origin[] = [
    snapWallCabinetAlongWall(
      wall,
      clickX,
      clickZ,
      widthFt,
      depthFt,
      rotationY,
      roomWidthFt,
      roomDepthFt,
    ),
  ];

  for (const { placement, widthFt: nw, depthFt: nd } of collectWallNeighborPlacements(
    placements,
    catalogById,
    wall,
    rotationY,
    roomWidthFt,
    roomDepthFt,
    excludePlacementId,
  )) {
    const neighbor = { x: placement.positionX, z: placement.positionZ };
    const runAxis = runAxisForRotation(rotationY);
    const wallPos = snapWallCabinetAlongWall(
      wall,
      clickX,
      clickZ,
      widthFt,
      depthFt,
      rotationY,
      roomWidthFt,
      roomDepthFt,
    );
    if (!sameRunLine(neighbor, wallPos, runAxis)) continue;

    appendNeighborSnapCandidates(
      candidates,
      clickX,
      clickZ,
      neighbor,
      nw,
      nd,
      widthFt,
      depthFt,
      rotationY,
    );
  }

  return pickClosestValidOrigin({
    candidates,
    clickX,
    clickZ,
    widthFt,
    depthFt,
    rotationY,
    roomWidthFt,
    roomDepthFt,
    footprints,
    excludePlacementId,
    placingItem,
    catalogById,
    gridFt,
  });
}
