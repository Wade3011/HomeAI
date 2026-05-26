'use client';

import { Html } from '@react-three/drei';
import {
  planRoomWalls,
  solidWallSegments,
  type RoomWallPlan,
  type WallOpening,
  type WallSide,
} from '@/lib/homeLayout';
import type { ExteriorDoor, Room, RoomConnection } from '@/types';

const WALL_THICKNESS = 0.06;
const DOOR_HEIGHT_FT = 6.7;

export function buildWallPlans(
  room: Room,
  projectRooms: Room[],
  connections: RoomConnection[],
  exteriorDoors: ExteriorDoor[] = [],
): RoomWallPlan[] {
  if (projectRooms.length === 0) {
    return defaultWallPlans(room);
  }
  return planRoomWalls(room, projectRooms, connections, exteriorDoors);
}

function defaultWallPlans(room: Room): RoomWallPlan[] {
  return [
    { side: 'back', length: room.widthFt, openings: [] },
    { side: 'front', length: room.widthFt, openings: [] },
    { side: 'left', length: room.depthFt, openings: [] },
    { side: 'right', length: room.depthFt, openings: [] },
  ];
}

export function RoomConnectionWalls({
  room,
  wallPlans,
  showWalls = true,
  showConnectionMarkers = true,
  wallColor = '#e4e4e7',
  wallOpacity = 0.4,
}: {
  room: Pick<Room, 'widthFt' | 'depthFt' | 'heightFt'>;
  wallPlans: RoomWallPlan[];
  showWalls?: boolean;
  showConnectionMarkers?: boolean;
  wallColor?: string;
  wallOpacity?: number;
}) {
  return (
    <group raycast={() => null}>
      {wallPlans.map((plan) => (
        <WallSideGroup
          key={plan.side}
          side={plan.side}
          plan={plan}
          room={room}
          showWalls={showWalls}
          showConnectionMarkers={showConnectionMarkers}
          wallColor={wallColor}
          wallOpacity={wallOpacity}
        />
      ))}
    </group>
  );
}

function WallSideGroup({
  side,
  plan,
  room,
  showWalls,
  showConnectionMarkers,
  wallColor,
  wallOpacity,
}: {
  side: WallSide;
  plan: RoomWallPlan;
  room: Pick<Room, 'widthFt' | 'depthFt' | 'heightFt'>;
  showWalls: boolean;
  showConnectionMarkers: boolean;
  wallColor: string;
  wallOpacity: number;
}) {
  const segments = solidWallSegments(plan);
  const doorOpenings = plan.openings.filter(
    (o) => o.kind === 'door' || o.kind === 'exterior-door',
  );
  const headerHeight = Math.max(0, room.heightFt - DOOR_HEIGHT_FT);

  return (
    <group>
      {showWalls &&
        segments.map(([start, end], idx) => {
          const len = end - start;
          if (len <= 0.01) return null;
          return (
            <WallSegmentMesh
              key={`seg-${idx}`}
              side={side}
              room={room}
              midLocal={(start + end) / 2}
              lengthFt={len}
              heightFt={room.heightFt}
              yCenter={room.heightFt / 2}
              color={wallColor}
              opacity={wallOpacity}
            />
          );
        })}

      {showWalls &&
        doorOpenings.map((op, idx) =>
          headerHeight > 0.05 ? (
            <WallSegmentMesh
              key={`door-header-${idx}`}
              side={side}
              room={room}
              midLocal={(op.start + op.end) / 2}
              lengthFt={op.end - op.start}
              heightFt={headerHeight}
              yCenter={DOOR_HEIGHT_FT + headerHeight / 2}
              color={wallColor}
              opacity={wallOpacity}
            />
          ) : null,
        )}

      {showConnectionMarkers &&
        plan.openings.map((op) => (
          <ConnectionMarker
            key={`${side}-${op.kind}-${op.connectedRoomId ?? 'ext'}-${op.start}`}
            side={side}
            room={room}
            opening={op}
          />
        ))}
    </group>
  );
}

function WallSegmentMesh({
  side,
  room,
  midLocal,
  lengthFt,
  heightFt,
  yCenter,
  color,
  opacity,
}: {
  side: WallSide;
  room: Pick<Room, 'widthFt' | 'depthFt' | 'heightFt'>;
  midLocal: number;
  lengthFt: number;
  heightFt: number;
  yCenter: number;
  color: string;
  opacity: number;
}) {
  let position: [number, number, number] = [0, 0, 0];
  let size: [number, number, number] = [1, 1, 1];

  switch (side) {
    case 'back':
      position = [midLocal, yCenter, 0];
      size = [lengthFt, heightFt, WALL_THICKNESS];
      break;
    case 'front':
      position = [midLocal, yCenter, room.depthFt];
      size = [lengthFt, heightFt, WALL_THICKNESS];
      break;
    case 'left':
      position = [0, yCenter, midLocal];
      size = [WALL_THICKNESS, heightFt, lengthFt];
      break;
    case 'right':
      position = [room.widthFt, yCenter, midLocal];
      size = [WALL_THICKNESS, heightFt, lengthFt];
      break;
  }

  return (
    <mesh position={position} raycast={() => null}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} transparent opacity={opacity} />
    </mesh>
  );
}

function ConnectionMarker({
  side,
  room,
  opening,
}: {
  side: WallSide;
  room: Pick<Room, 'widthFt' | 'depthFt' | 'heightFt'>;
  opening: WallOpening;
}) {
  const midLocal = (opening.start + opening.end) / 2;
  const width = opening.end - opening.start;
  const [wx, wy, wz] = openingWorldPosition(side, room, midLocal);
  const labelY = Math.min(room.heightFt * 0.55, 5);
  const isOpen = opening.kind === 'open';
  const isExterior = opening.kind === 'exterior-door';
  const labelName = isExterior ? 'Outside' : (opening.connectedRoomName ?? 'Room');
  const borderColor = isExterior ? '#d97706' : isOpen ? '#5c7a6a' : '#a78bfa';
  const bgColor = isExterior ? '#fffbeb' : isOpen ? '#eef4f0' : '#f5f3ff';
  const textColor = isExterior ? '#92400e' : isOpen ? '#3f5b4d' : '#5b21b6';

  // Floor strip at the opening — visible even when walls are hidden
  const floorSize = floorStripSize(side, width);
  const floorPos = floorStripPosition(side, room, midLocal);

  return (
    <group>
      <mesh position={floorPos} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <planeGeometry args={floorSize} />
        <meshBasicMaterial
          color={isExterior ? '#d97706' : isOpen ? '#5c7a6a' : '#a78bfa'}
          transparent
          opacity={0.35}
        />
      </mesh>

      <Html
        position={[wx, labelY, wz]}
        center
        distanceFactor={14}
        zIndexRange={[50, 0]}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        <div
          className="whitespace-nowrap rounded-lg border px-2 py-1 text-[10px] font-semibold shadow-md"
          style={{
            borderColor,
            background: bgColor,
            color: textColor,
          }}
        >
          <span className="mr-1">{isOpen ? '↔' : isExterior ? '🚪' : '🚪'}</span>
          {sideLabel(side)} · {labelName}
        </div>
      </Html>
    </group>
  );
}

function sideLabel(side: WallSide): string {
  switch (side) {
    case 'back':
      return 'Back';
    case 'front':
      return 'Front';
    case 'left':
      return 'Left';
    case 'right':
      return 'Right';
  }
}

function openingWorldPosition(
  side: WallSide,
  room: Pick<Room, 'widthFt' | 'depthFt' | 'heightFt'>,
  midLocal: number,
): [number, number, number] {
  switch (side) {
    case 'back':
      return [midLocal, 0, 0];
    case 'front':
      return [midLocal, 0, room.depthFt];
    case 'left':
      return [0, 0, midLocal];
    case 'right':
      return [room.widthFt, 0, midLocal];
  }
}

function floorStripPosition(
  side: WallSide,
  room: Pick<Room, 'widthFt' | 'depthFt'>,
  midLocal: number,
): [number, number, number] {
  const inset = WALL_THICKNESS / 2 + 0.02;
  switch (side) {
    case 'back':
      return [midLocal, 0.03, inset];
    case 'front':
      return [midLocal, 0.03, room.depthFt - inset];
    case 'left':
      return [inset, 0.03, midLocal];
    case 'right':
      return [room.widthFt - inset, 0.03, midLocal];
  }
}

function floorStripSize(side: WallSide, openingWidth: number): [number, number] {
  const depth = Math.min(1.2, openingWidth * 0.35);
  if (side === 'back' || side === 'front') {
    return [openingWidth, depth];
  }
  return [depth, openingWidth];
}
