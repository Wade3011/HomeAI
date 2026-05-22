'use client';

import { Line, Text } from '@react-three/drei';
import { useMemo } from 'react';
import type { CatalogItem, Placement, Room } from '@/types';
import { catalogDimensionsFt, orientedDimensions } from '@/components/planner/placementCollision';

function formatFt(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
}

function WallDistanceLabel({
  start,
  end,
  label,
  y = 0.12,
}: {
  start: [number, number, number];
  end: [number, number, number];
  label: string;
  y?: number;
}) {
  const mid: [number, number, number] = [
    (start[0] + end[0]) / 2,
    y,
    (start[2] + end[2]) / 2,
  ];
  return (
    <group>
      <Line points={[start, end]} color="#2563eb" lineWidth={1.5} />
      <Text
        position={mid}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.28}
        color="#1e40af"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#ffffff"
      >
        {label}
      </Text>
    </group>
  );
}

export function RoomFloorDimensions({ room }: { room: Room }) {
  const { widthFt: w, depthFt: d } = room;
  const y = 0.14;

  return (
    <group>
      <Text
        position={[w / 2, y, -0.6]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.38}
        color="#52525b"
        anchorX="center"
        outlineWidth={0.025}
        outlineColor="#fafafa"
      >
        {formatFt(w)} ft
      </Text>
      <Text
        position={[-0.6, y, d / 2]}
        rotation={[-Math.PI / 2, 0, Math.PI / 2]}
        fontSize={0.38}
        color="#52525b"
        anchorX="center"
        outlineWidth={0.025}
        outlineColor="#fafafa"
      >
        {formatFt(d)} ft
      </Text>
      <Line
        points={[
          [0, 0.05, 0],
          [w, 0.05, 0],
        ]}
        color="#a1a1aa"
        lineWidth={1}
        dashed
        dashSize={0.4}
        gapSize={0.25}
      />
      <Line
        points={[
          [0, 0.05, 0],
          [0, 0.05, d],
        ]}
        color="#a1a1aa"
        lineWidth={1}
        dashed
        dashSize={0.4}
        gapSize={0.25}
      />
    </group>
  );
}

export function SelectedPlacementDimensions({
  room,
  placement,
  item,
}: {
  room: Room;
  placement: Placement;
  item: CatalogItem;
}) {
  const { widthFt, depthFt } = catalogDimensionsFt(item);
  const oriented = useMemo(
    () => orientedDimensions(widthFt, depthFt, placement.rotationY),
    [widthFt, depthFt, placement.rotationY],
  );

  const x = placement.positionX;
  const z = placement.positionZ;
  const ow = oriented.widthFt;
  const od = oriented.depthFt;

  const left = x;
  const right = room.widthFt - x - ow;
  const back = z;
  const front = room.depthFt - z - od;

  const y = Math.max(placement.positionY + 0.2, 0.15);

  return (
    <group>
      <WallDistanceLabel
        start={[0, y, z + od / 2]}
        end={[x, y, z + od / 2]}
        label={`${formatFt(left)} ft`}
      />
      <WallDistanceLabel
        start={[x + ow, y, z + od / 2]}
        end={[room.widthFt, y, z + od / 2]}
        label={`${formatFt(right)} ft`}
      />
      <WallDistanceLabel
        start={[x + ow / 2, y, 0]}
        end={[x + ow / 2, y, z]}
        label={`${formatFt(back)} ft`}
      />
      <WallDistanceLabel
        start={[x + ow / 2, y, z + od]}
        end={[x + ow / 2, y, room.depthFt]}
        label={`${formatFt(front)} ft`}
      />
    </group>
  );
}
