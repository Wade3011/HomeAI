'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { buildCeilingMeshData, roomShowsCeilingMesh } from '@/lib/ceilingGeometry';
import type { Room } from '@/types';

export function RoomCeiling({
  room,
  opacity = 1,
  transparent = false,
}: {
  room: Room;
  opacity?: number;
  transparent?: boolean;
}) {
  const mesh = useMemo(() => buildCeilingMeshData(room), [room]);
  const geomRef = useRef<THREE.BufferGeometry>(null);

  useLayoutEffect(() => {
    const geom = geomRef.current;
    if (!geom || !mesh) return;
    geom.setAttribute('position', new THREE.BufferAttribute(mesh.positions, 3));
    geom.setAttribute('normal', new THREE.BufferAttribute(mesh.normals, 3));
    geom.computeBoundingSphere();
  }, [mesh]);

  if (!mesh || !roomShowsCeilingMesh(room)) return null;

  return (
    <mesh raycast={() => null}>
      <bufferGeometry ref={geomRef} />
      <meshStandardMaterial
        color="#f5f2eb"
        roughness={0.92}
        metalness={0.02}
        side={THREE.DoubleSide}
        transparent={transparent || opacity < 1}
        opacity={opacity}
      />
    </mesh>
  );
}
