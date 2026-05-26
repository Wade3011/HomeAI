'use client';

import { Html, Line } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import type { Placement, Room } from '@/types';
import { orientedDimensions } from '@/components/planner/placementCollision';
import { formatFeetInches } from '@/lib/imperialDimensions';

const DIM_LINE = '#5c7a6a';

export function formatFt(value: number) {
  return formatFeetInches(value);
}

function DimLabel({
  position,
  label,
  room = false,
}: {
  position: [number, number, number];
  label: string;
  room?: boolean;
}) {
  return (
    <Html
      position={position}
      center
      distanceFactor={14}
      zIndexRange={[80, 0]}
      style={{ pointerEvents: 'none' }}
    >
      <span className={room ? 'dimension-label dimension-label-room' : 'dimension-label'}>
        {label}
      </span>
    </Html>
  );
}

function mid(
  a: [number, number, number],
  b: [number, number, number],
): [number, number, number] {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
}

/** Room width / depth labels on the floor. */
export function RoomFloorDimensions({ room }: { room: Room }) {
  const { widthFt: w, depthFt: d } = room;
  const y = 0.12;

  return (
    <group raycast={() => null}>
      <Line
        points={[
          [0, 0.05, 0],
          [w, 0.05, 0],
        ]}
        color="#a8a29e"
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
        color="#a8a29e"
        lineWidth={1}
        dashed
        dashSize={0.4}
        gapSize={0.25}
      />
      <DimLabel position={[w / 2, y, -0.45]} label={formatFt(w)} room />
      <DimLabel position={[-0.45, y, d / 2]} label={formatFt(d)} room />
    </group>
  );
}

/** Wall distance guides + labels for the selected cabinet. */
export function SelectedPlacementDimensions({
  room,
  placement,
  widthFt,
  depthFt,
}: {
  room: Room;
  placement: Placement;
  widthFt: number;
  depthFt: number;
}) {
  const oriented = useMemo(
    () => orientedDimensions(widthFt, depthFt, placement.rotationY),
    [widthFt, depthFt, placement.rotationY],
  );

  const x = placement.positionX;
  const z = placement.positionZ;
  const ow = oriented.widthFt;
  const od = oriented.depthFt;
  const y = Math.max(placement.positionY + 0.15, 0.12);

  const left = x;
  const right = room.widthFt - x - ow;
  const back = z;
  const front = room.depthFt - z - od;

  const leftStart: [number, number, number] = [0, y, z + od / 2];
  const leftEnd: [number, number, number] = [x, y, z + od / 2];
  const rightStart: [number, number, number] = [x + ow, y, z + od / 2];
  const rightEnd: [number, number, number] = [room.widthFt, y, z + od / 2];
  const backStart: [number, number, number] = [x + ow / 2, y, 0];
  const backEnd: [number, number, number] = [x + ow / 2, y, z];
  const frontStart: [number, number, number] = [x + ow / 2, y, z + od];
  const frontEnd: [number, number, number] = [x + ow / 2, y, room.depthFt];

  const { invalidate } = useThree();
  useEffect(() => {
    invalidate();
  }, [x, z, ow, od, left, right, back, front, invalidate]);

  return (
    <group raycast={() => null}>
      <Line points={[leftStart, leftEnd]} color={DIM_LINE} lineWidth={2} />
      <Line points={[rightStart, rightEnd]} color={DIM_LINE} lineWidth={2} />
      <Line points={[backStart, backEnd]} color={DIM_LINE} lineWidth={2} />
      <Line points={[frontStart, frontEnd]} color={DIM_LINE} lineWidth={2} />

      <DimLabel position={mid(leftStart, leftEnd)} label={formatFt(left)} />
      <DimLabel position={mid(rightStart, rightEnd)} label={formatFt(right)} />
      <DimLabel position={mid(backStart, backEnd)} label={formatFt(back)} />
      <DimLabel position={mid(frontStart, frontEnd)} label={formatFt(front)} />
    </group>
  );
}
