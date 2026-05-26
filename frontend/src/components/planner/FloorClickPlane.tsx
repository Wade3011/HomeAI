'use client';

import type { ThreeEvent } from '@react-three/fiber';
import { useMemo } from 'react';

/** Floor clicks: place catalog items or deselect. */
export function FloorClickPlane({
  width,
  depth,
  isPlacing,
  onPlace,
  onDeselect,
}: {
  width: number;
  depth: number;
  isPlacing: boolean;
  onPlace: (clickX: number, clickZ: number) => void;
  onDeselect: () => void;
}) {
  const noopRaycast = useMemo(() => () => null, []);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const clickX = Math.max(0, Math.min(width, e.point.x));
    const clickZ = Math.max(0, Math.min(depth, e.point.z));
    if (isPlacing) {
      onPlace(clickX, clickZ);
      return;
    }
    onDeselect();
  };

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[width / 2, 0.02, depth / 2]}
      raycast={undefined}
      onPointerDown={handlePointerDown}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {...({ eventPriority: -1 } as any)}
    >
      <planeGeometry args={[width, depth]} />
      <meshBasicMaterial visible={false} />
    </mesh>
  );
}
