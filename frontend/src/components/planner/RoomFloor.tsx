'use client';

import { resolveFloorFinishId, getFloorFinish } from '@/config/floorFinishes';
import type { Room } from '@/types';

/** Visible floor plane for room planner / whole-home volumes. */
export function RoomFloor({
  room,
  opacity = 1,
  transparent = false,
  y = 0.01,
}: {
  room: Pick<Room, 'widthFt' | 'depthFt' | 'type' | 'floorFinishId'>;
  opacity?: number;
  transparent?: boolean;
  y?: number;
}) {
  const finish = getFloorFinish(resolveFloorFinishId(room));

  return (
    <mesh position={[room.widthFt / 2, y, room.depthFt / 2]} raycast={() => null} receiveShadow>
      <boxGeometry args={[room.widthFt, 0.02, room.depthFt]} />
      <meshStandardMaterial
        color={finish.color}
        roughness={finish.roughness}
        metalness={finish.id.includes('marble') ? 0.08 : 0.02}
        transparent={transparent || opacity < 1}
        opacity={opacity}
      />
    </mesh>
  );
}
