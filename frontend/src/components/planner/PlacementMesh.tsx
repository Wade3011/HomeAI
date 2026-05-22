'use client';

import { useThree } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { CatalogItem, Placement } from '@/types';
import { isWallCabinet } from '@/config/catalogCategories';
import { isCountertopItem, resolvePlacementY } from '@/lib/placementHeight';
import {
  inferWallFromPlacement,
  snapCountertopPosition,
  snapWallCabinetAlongWall,
  type RoomWallId,
} from '@/lib/placementSnap';
import { raycastWallCoords } from '@/lib/wallRaycast';
import {
  orientedDimensions,
  resolveCountertopPosition,
  resolvePlacementPosition,
  type PlacementFootprint,
} from '@/components/planner/placementCollision';
import type { Mesh } from 'three';

const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hitPoint = new THREE.Vector3();
const CLICK_MOVE_THRESHOLD_PX = 6;

function PlacementMeshInner({
  placement,
  item,
  width,
  depth,
  height,
  roomWidth,
  roomDepth,
  footprints,
  catalogById,
  placements,
  selected,
  onSelect,
  onMove,
  onDragStart,
  onDragEnd,
  onRotate,
}: {
  placement: Placement;
  item: CatalogItem;
  width: number;
  depth: number;
  height: number;
  roomWidth: number;
  roomDepth: number;
  footprints: PlacementFootprint[];
  catalogById: Record<string, CatalogItem>;
  placements: Placement[];
  selected: boolean;
  onSelect: () => void;
  onMove: (x: number, z: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onRotate: () => void;
}) {
  const meshRef = useRef<Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const { gl, invalidate } = useThree();
  const dragging = useRef(false);
  const moved = useRef(false);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const lastValid = useRef({ x: placement.positionX, z: placement.positionZ });
  const pendingCommit = useRef<{ x: number; z: number } | null>(null);
  const lockedWall = useRef<RoomWallId | null>(null);

  const isWall = isWallCabinet(item);
  const isCounter = isCountertopItem(item);

  const oriented = useMemo(
    () => orientedDimensions(width, depth, placement.rotationY),
    [width, depth, placement.rotationY],
  );

  const restPosition = useMemo((): [number, number, number] => {
    const x = placement.positionX + oriented.widthFt / 2;
    const y = placement.positionY + height / 2;
    const z = placement.positionZ + oriented.depthFt / 2;
    return [x, y, z];
  }, [
    placement.positionX,
    placement.positionY,
    placement.positionZ,
    oriented.widthFt,
    oriented.depthFt,
    height,
  ]);

  useEffect(() => {
    if (!dragging.current) {
      lastValid.current = { x: placement.positionX, z: placement.positionZ };
      if (groupRef.current) {
        groupRef.current.position.set(...restPosition);
      }
    }
  }, [restPosition, placement.positionX, placement.positionZ]);

  const applyVisualPosition = (x: number, z: number, positionY?: number) => {
    const target = groupRef.current;
    if (!target) return;
    const py = positionY ?? placement.positionY;
    target.position.set(
      x + oriented.widthFt / 2,
      py + height / 2,
      z + oriented.depthFt / 2,
    );
    invalidate();
  };

  const resolveDragPosition = (ray: THREE.Ray): { x: number; z: number } | null => {
    let clickX = 0;
    let clickZ = 0;
    let x = placement.positionX;
    let z = placement.positionZ;

    if (isWall && lockedWall.current) {
      const wallCoords = raycastWallCoords(ray, lockedWall.current, roomWidth, roomDepth);
      if (!wallCoords) return null;
      clickX = wallCoords.clickX;
      clickZ = wallCoords.clickZ;
      const snapped = snapWallCabinetAlongWall(
        lockedWall.current,
        clickX,
        clickZ,
        width,
        depth,
        placement.rotationY,
        roomWidth,
        roomDepth,
      );
      x = snapped.x;
      z = snapped.z;
    } else if (!ray.intersectPlane(floorPlane, hitPoint)) {
      return null;
    } else if (isCounter) {
      clickX = hitPoint.x;
      clickZ = hitPoint.z;
      const snapped = snapCountertopPosition(
        clickX,
        clickZ,
        width,
        depth,
        placement.rotationY,
        placements,
        catalogById,
        roomWidth,
        roomDepth,
        placement.placementId,
      );
      if (!snapped) return null;
      x = snapped.x;
      z = snapped.z;
    } else {
      x = hitPoint.x - oriented.widthFt / 2;
      z = hitPoint.z - oriented.depthFt / 2;
    }

    const resolved = isCounter
      ? resolveCountertopPosition({
          x,
          z,
          widthFt: width,
          depthFt: depth,
          rotationY: placement.rotationY,
          roomWidthFt: roomWidth,
          roomDepthFt: roomDepth,
          footprints,
          catalogById,
          placingItem: item,
          excludePlacementId: placement.placementId,
          fallbackX: lastValid.current.x,
          fallbackZ: lastValid.current.z,
        })
      : resolvePlacementPosition({
          x,
          z,
          widthFt: width,
          depthFt: depth,
          rotationY: placement.rotationY,
          roomWidthFt: roomWidth,
          roomDepthFt: roomDepth,
          footprints,
          excludePlacementId: placement.placementId,
          placingItem: item,
          catalogById,
          fallbackX: lastValid.current.x,
          fallbackZ: lastValid.current.z,
        });

    return resolved;
  };

  const moveFromEvent = (e: { ray: THREE.Ray; stopPropagation: () => void }) => {
    e.stopPropagation();
    const resolved = resolveDragPosition(e.ray);
    if (!resolved) return;

    lastValid.current = resolved;
    pendingCommit.current = resolved;

    let visualY = placement.positionY;
    if (isCounter) {
      const y = resolvePlacementY(
        item,
        resolved.x,
        resolved.z,
        placement.rotationY,
        placements.filter((pl) => pl.placementId !== placement.placementId),
        catalogById,
      );
      if (y !== null) visualY = y;
    }

    applyVisualPosition(resolved.x, resolved.z, visualY);
  };

  return (
    <group ref={groupRef} position={restPosition} rotation={[0, placement.rotationY, 0]}>
      <mesh
        ref={meshRef}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onRotate();
        }}
        onClick={(e) => {
          e.stopPropagation();
          const start = pointerStart.current;
          const movedPx =
            start &&
            Math.hypot(e.clientX - start.x, e.clientY - start.y) > CLICK_MOVE_THRESHOLD_PX;
          if (!moved.current && !movedPx) onSelect();
          moved.current = false;
          pointerStart.current = null;
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          dragging.current = true;
          moved.current = false;
          pendingCommit.current = null;
          pointerStart.current = { x: e.clientX, y: e.clientY };
          lastValid.current = { x: placement.positionX, z: placement.positionZ };
          if (isWall) {
            lockedWall.current = inferWallFromPlacement(
              placement.positionX,
              placement.positionZ,
              width,
              depth,
              placement.rotationY,
              roomWidth,
              roomDepth,
            );
          }
          onDragStart();
          gl.domElement.setPointerCapture(e.pointerId);
          gl.domElement.style.cursor = 'grabbing';
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
          dragging.current = false;
          lockedWall.current = null;
          gl.domElement.style.cursor = '';
          try {
            gl.domElement.releasePointerCapture(e.pointerId);
          } catch {
            /* already released */
          }
          const commit = pendingCommit.current;
          pendingCommit.current = null;
          if (commit) {
            onMove(commit.x, commit.z);
          }
          onDragEnd();
        }}
        onPointerMove={(e) => {
          if (!dragging.current) return;
          moved.current = true;
          moveFromEvent(e);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (!dragging.current) gl.domElement.style.cursor = 'grab';
        }}
        onPointerOut={() => {
          if (!dragging.current) gl.domElement.style.cursor = '';
        }}
      >
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color={selected ? '#2563eb' : '#78716c'}
          emissive={selected ? '#1d4ed8' : '#000000'}
          emissiveIntensity={selected ? 0.15 : 0}
        />
      </mesh>
    </group>
  );
}

export const PlacementMesh = memo(PlacementMeshInner, (prev, next) => {
  if (prev.selected !== next.selected) return false;
  if (prev.placement.placementId !== next.placement.placementId) return false;
  if (prev.placement.positionX !== next.placement.positionX) return false;
  if (prev.placement.positionY !== next.placement.positionY) return false;
  if (prev.placement.positionZ !== next.placement.positionZ) return false;
  if (prev.placement.rotationY !== next.placement.rotationY) return false;
  if (prev.footprints !== next.footprints) return false;
  return true;
});
