'use client';

import type { ThreeEvent } from '@react-three/fiber';
import { useMemo } from 'react';

/** Invisible floor — only captures clicks while placing an item. */
export function FloorClickPlane({
  width,
  depth,
  isPlacing,
  onPlace,
}: {
  width: number;
  depth: number;
  isPlacing: boolean;
  onPlace: (clickX: number, clickZ: number) => void;
}) {
  const noopRaycast = useMemo(() => () => null, []);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!isPlacing) return;
    e.stopPropagation();
    const clickX = Math.max(0, Math.min(width, e.point.x));
    const clickZ = Math.max(0, Math.min(depth, e.point.z));
    onPlace(clickX, clickZ);
  };

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[width / 2, 0, depth / 2]}
      raycast={isPlacing ? undefined : noopRaycast}
      onClick={isPlacing ? handleClick : undefined}
    >
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial visible={false} />
    </mesh>
  );
}
