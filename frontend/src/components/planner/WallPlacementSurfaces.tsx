'use client';

import { Grid } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { useMemo } from 'react';
import { WALL_CABINET_MOUNT_Y_FT } from '@/config/catalogCategories';
import { CABINET_GRID_FT } from '@/components/planner/plannerUtils';
import type { RoomWallId } from '@/lib/placementSnap';

const GRID_HEIGHT_FT = 3;
const GRID_OFFSET = 0.03;

const WALLS: {
  id: RoomWallId;
  position: (w: number, d: number, y: number) => [number, number, number];
  rotation: [number, number, number];
  size: (w: number, d: number) => [number, number];
}[] = [
  {
    id: 'back',
    position: (w, _d, y) => [w / 2, y, GRID_OFFSET],
    rotation: [0, 0, 0],
    size: (w) => [w, GRID_HEIGHT_FT],
  },
  {
    id: 'front',
    position: (w, d, y) => [w / 2, y, d - GRID_OFFSET],
    rotation: [0, Math.PI, 0],
    size: (w) => [w, GRID_HEIGHT_FT],
  },
  {
    id: 'left',
    position: (_w, d, y) => [GRID_OFFSET, y, d / 2],
    rotation: [0, Math.PI / 2, 0],
    size: (_w, d) => [d, GRID_HEIGHT_FT],
  },
  {
    id: 'right',
    position: (w, d, y) => [w - GRID_OFFSET, y, d / 2],
    rotation: [0, -Math.PI / 2, 0],
    size: (_w, d) => [d, GRID_HEIGHT_FT],
  },
];

function WallGrid({
  position,
  rotation,
  size,
  highlighted,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number];
  highlighted: boolean;
}) {
  return (
    <group position={position} rotation={rotation}>
      <Grid
        args={size}
        cellSize={CABINET_GRID_FT}
        sectionSize={1}
        cellColor={highlighted ? '#9fb3c8' : '#c5d4dc'}
        sectionColor={highlighted ? '#5c7a6a' : '#9fb3c8'}
        fadeDistance={40}
        rotation={[Math.PI / 2, 0, 0]}
        infiniteGrid={false}
      />
    </group>
  );
}

function WallClickPlane({
  position,
  rotation,
  size,
  wall,
  enabled,
  onPlace,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number];
  wall: RoomWallId;
  enabled: boolean;
  onPlace: (clickX: number, clickZ: number, wall: RoomWallId) => void;
}) {
  const noopRaycast = useMemo(() => () => null, []);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!enabled) return;
    e.stopPropagation();
    onPlace(e.point.x, e.point.z, wall);
  };

  const eventPriority = enabled ? 2 : 0;

  return (
    <mesh
      position={position}
      rotation={rotation}
      raycast={enabled ? undefined : noopRaycast}
      onPointerDown={enabled ? handlePointerDown : undefined}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {...({ eventPriority } as any)}
    >
      <planeGeometry args={size} />
      <meshStandardMaterial visible={false} />
    </mesh>
  );
}

export function WallPlacementSurfaces({
  roomWidth,
  roomDepth,
  showGrids,
  activeWall,
  isPlacing,
  onPlace,
}: {
  roomWidth: number;
  roomDepth: number;
  /** Show wall grids (when placing or when a wall cabinet is selected) */
  showGrids: boolean;
  /** When set, only this wall's grid is shown (selected cabinet). When null, all walls (placing). */
  activeWall: RoomWallId | null;
  isPlacing: boolean;
  onPlace: (clickX: number, clickZ: number, wall: RoomWallId) => void;
}) {
  const gridCenterY = WALL_CABINET_MOUNT_Y_FT + GRID_HEIGHT_FT / 2;

  if (!showGrids) return null;

  const wallsToShow = activeWall ? WALLS.filter((w) => w.id === activeWall) : WALLS;

  return (
    <group>
      {wallsToShow.map((wall) => {
        const pos = wall.position(roomWidth, roomDepth, gridCenterY);
        const size = wall.size(roomWidth, roomDepth);
        const highlighted = activeWall !== null;

        return (
          <group key={wall.id}>
            <WallGrid
              position={pos}
              rotation={wall.rotation}
              size={size}
              highlighted={highlighted}
            />
            <WallClickPlane
              position={pos}
              rotation={wall.rotation}
              size={size}
              wall={wall.id}
              enabled={isPlacing}
              onPlace={onPlace}
            />
          </group>
        );
      })}
    </group>
  );
}
