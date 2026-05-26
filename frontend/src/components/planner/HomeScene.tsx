'use client';

import { Canvas, useThree } from '@react-three/fiber';
import { Grid, OrbitControls } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { CatalogItem, ExteriorDoor, Placement, Room, RoomConnection } from '@/types';
import { resolvePlacementItem } from '@/lib/placementItem';
import { resolvePlacementY } from '@/lib/placementHeight';
import { CustomItemMesh } from '@/components/planner/CustomItemMesh';
import { meshColorForResolved } from '@/lib/planner/meshColors';
import { WallToggleButton } from '@/components/planner/WallToggleButton';
import { RoomConnectionWalls } from '@/components/planner/RoomConnectionWalls';
import { orientedDimensions } from '@/components/planner/placementCollision';
import {
  computeProjectBounds,
  planRoomWalls,
  type RoomWallPlan,
} from '@/lib/homeLayout';

export function HomeScene({
  rooms,
  connections,
  exteriorDoors = [],
  placementsByRoomId,
  catalogById,
  focusRoomId,
  onSelectRoom,
}: {
  rooms: Room[];
  connections: RoomConnection[];
  exteriorDoors?: ExteriorDoor[];
  placementsByRoomId: Record<string, Placement[]>;
  catalogById: Record<string, CatalogItem>;
  focusRoomId: string | null;
  onSelectRoom?: (roomId: string) => void;
}) {
  const [showWalls, setShowWalls] = useState(true);
  const bounds = useMemo(() => computeProjectBounds(rooms), [rooms]);

  const cameraPosition: [number, number, number] = useMemo(() => {
    const diag = Math.hypot(bounds.widthFt, bounds.depthFt);
    return [
      bounds.centerX + diag * 0.55,
      Math.max(diag * 0.7, 18),
      bounds.centerZ + diag * 0.8,
    ];
  }, [bounds]);

  const target: [number, number, number] = [bounds.centerX, 0, bounds.centerZ];

  return (
    <div className="relative h-full min-h-[520px] w-full overflow-hidden rounded-xl border border-stone-300 bg-[#ebe8e3]">
      <WallToggleButton
        showWalls={showWalls}
        onToggle={() => setShowWalls((v) => !v)}
        className="absolute right-3 top-3 z-10"
      />
      <Canvas
        camera={{ position: cameraPosition, fov: 45 }}
        dpr={[1, 1.25]}
        frameloop="demand"
        performance={{ min: 0.5 }}
      >
        <color attach="background" args={['#ebe8e3']} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[20, 28, 14]} intensity={1.1} castShadow={false} />
        <directionalLight position={[-12, 18, -8]} intensity={0.3} />

        <Grid
          args={[bounds.widthFt + 24, bounds.depthFt + 24]}
          cellSize={1}
          sectionSize={5}
          cellColor="#d6d3d1"
          sectionColor="#a8a29e"
          fadeDistance={Math.max(bounds.widthFt, bounds.depthFt) * 3}
          position={[bounds.centerX, 0.005, bounds.centerZ]}
          raycast={() => null}
        />

        {rooms.map((room) => {
          const focused = focusRoomId === null || focusRoomId === room.roomId;
          const wallPlans = planRoomWalls(room, rooms, connections, exteriorDoors);
          const placements = placementsByRoomId[room.roomId] ?? [];
          return (
            <RoomVolume
              key={room.roomId}
              room={room}
              wallPlans={wallPlans}
              placements={placements}
              catalogById={catalogById}
              focused={focused}
              showWalls={showWalls}
              onClick={() => onSelectRoom?.(room.roomId)}
            />
          );
        })}

        <FocusCameraEffect
          rooms={rooms}
          focusRoomId={focusRoomId}
          fallbackTarget={target}
          fallbackPosition={cameraPosition}
        />

        <OrbitControls
          makeDefault
          target={target}
          enableDamping
          dampingFactor={0.12}
          maxPolarAngle={Math.PI / 2.05}
          minDistance={4}
          maxDistance={Math.max(bounds.widthFt, bounds.depthFt) * 3 + 10}
        />
      </Canvas>
    </div>
  );
}

function FocusCameraEffect({
  rooms,
  focusRoomId,
  fallbackTarget,
  fallbackPosition,
}: {
  rooms: Room[];
  focusRoomId: string | null;
  fallbackTarget: [number, number, number];
  fallbackPosition: [number, number, number];
}) {
  const { camera, controls, invalidate } = useThree((s) => ({
    camera: s.camera,
    controls: s.controls as unknown as {
      target: THREE.Vector3;
      update: () => void;
    } | null,
    invalidate: s.invalidate,
  }));

  const lastFocus = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (lastFocus.current === focusRoomId) return;
    lastFocus.current = focusRoomId;

    const room = focusRoomId
      ? rooms.find((r) => r.roomId === focusRoomId) ?? null
      : null;

    let targetX = fallbackTarget[0];
    let targetZ = fallbackTarget[2];
    let camX = fallbackPosition[0];
    let camY = fallbackPosition[1];
    let camZ = fallbackPosition[2];

    if (room) {
      const cx = (room.layoutX ?? 0) + room.widthFt / 2;
      const cz = (room.layoutZ ?? 0) + room.depthFt / 2;
      const diag = Math.hypot(room.widthFt, room.depthFt);
      targetX = cx;
      targetZ = cz;
      camX = cx + diag * 0.55;
      camY = Math.max(diag * 0.75, room.heightFt * 1.4);
      camZ = cz + diag * 0.85;
    }

    camera.position.set(camX, camY, camZ);
    if (controls) {
      controls.target.set(targetX, 0, targetZ);
      controls.update();
    }
    camera.lookAt(targetX, 0, targetZ);
    invalidate();
  }, [focusRoomId, rooms, camera, controls, invalidate, fallbackTarget, fallbackPosition]);

  return null;
}

function RoomVolume({
  room,
  wallPlans,
  placements,
  catalogById,
  focused,
  showWalls,
  onClick,
}: {
  room: Room;
  wallPlans: RoomWallPlan[];
  placements: Placement[];
  catalogById: Record<string, CatalogItem>;
  focused: boolean;
  showWalls: boolean;
  onClick: () => void;
}) {
  const lx = room.layoutX ?? 0;
  const lz = room.layoutZ ?? 0;
  const opacity = focused ? 1 : 0.25;
  const wallColor = focused ? '#efeae3' : '#d4d0cb';
  const floorColor =
    room.type === 'kitchen'
      ? '#d8cdb7'
      : room.type === 'bathroom'
        ? '#d2dde2'
        : room.type === 'bedroom'
          ? '#dfd6f0'
          : room.type === 'hallway'
            ? '#ebe8e3'
            : '#e0ddd8';

  return (
    <group
      position={[lx, 0, lz]}
      onPointerDown={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <mesh position={[room.widthFt / 2, 0.01, room.depthFt / 2]} raycast={() => null}>
        <boxGeometry args={[room.widthFt, 0.02, room.depthFt]} />
        <meshStandardMaterial color={floorColor} transparent={!focused} opacity={opacity} />
      </mesh>

      {/* Room label floating just above floor */}
      <RoomLabel
        x={room.widthFt / 2}
        z={room.depthFt / 2}
        label={room.name}
        focused={focused}
      />

      {showWalls || wallPlans.some((w) => w.openings.length > 0) ? (
        <RoomConnectionWalls
          room={room}
          wallPlans={wallPlans}
          showWalls={showWalls && focused}
          showConnectionMarkers={focused && wallPlans.some((w) => w.openings.length > 0)}
          wallColor={wallColor}
          wallOpacity={opacity}
        />
      ) : null}

      {placements.map((p) => (
        <PlacementBlock
          key={p.placementId}
          placement={p}
          placements={placements}
          catalogById={catalogById}
          opacity={opacity}
          transparent={!focused}
        />
      ))}
    </group>
  );
}

function RoomLabel({
  x,
  z,
  label,
  focused,
}: {
  x: number;
  z: number;
  label: string;
  focused: boolean;
}) {
  return (
    <mesh position={[x, 0.015, z]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
      <planeGeometry args={[label.length * 0.45 + 1.5, 1.3]} />
      <meshBasicMaterial
        color={focused ? '#ffffff' : '#ffffff'}
        transparent
        opacity={focused ? 0.65 : 0.25}
      />
    </mesh>
  );
}

function PlacementBlock({
  placement,
  placements,
  catalogById,
  opacity,
  transparent,
}: {
  placement: Placement;
  placements: Placement[];
  catalogById: Record<string, CatalogItem>;
  opacity: number;
  transparent: boolean;
}) {
  const resolved = resolvePlacementItem(placement, catalogById);
  if (!resolved) return null;

  const oriented = orientedDimensions(resolved.widthFt, resolved.depthFt, placement.rotationY);
  let y = placement.positionY;
  if (resolved.catalogItem) {
    const computedY = resolvePlacementY(
      resolved.catalogItem,
      placement.positionX,
      placement.positionZ,
      placement.rotationY,
      placements,
      catalogById,
    );
    if (computedY !== null) y = computedY;
  }

  const x = placement.positionX + oriented.widthFt / 2;
  const z = placement.positionZ + oriented.depthFt / 2;
  const cy = y + resolved.heightFt / 2;

  return (
    <group position={[x, cy, z]} rotation={[0, placement.rotationY, 0]}>
      {resolved.isCustom && resolved.customItem ? (
        <CustomItemMesh
          spec={resolved.customItem}
          resolved={resolved}
          selected={false}
          pickable={false}
          opacity={opacity}
          transparent={transparent}
        />
      ) : (
        <mesh raycast={() => null}>
          {resolved.shape === 'round' ? (
            <cylinderGeometry
              args={[
                Math.min(resolved.widthFt, resolved.depthFt) / 2,
                Math.min(resolved.widthFt, resolved.depthFt) / 2,
                resolved.heightFt,
                24,
              ]}
            />
          ) : (
            <boxGeometry args={[resolved.widthFt, resolved.heightFt, resolved.depthFt]} />
          )}
          <meshLambertMaterial
            color={meshColorForResolved(resolved, false)}
            transparent={transparent}
            opacity={opacity}
          />
        </mesh>
      )}
    </group>
  );
}
