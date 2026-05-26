'use client';

import { useThree, type ThreeEvent } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { CatalogItem, Placement } from '@/types';
import type { ResolvedPlacementItem } from '@/lib/placementItem';
import { isWallCabinet } from '@/config/catalogCategories';
import { isBaseCabinetItem } from '@/lib/placementHeight';
import { meshColorForResolved, meshEmissive } from '@/lib/planner/meshColors';
import { isCountertopItem, resolvePlacementY } from '@/lib/placementHeight';
import { inferWallFromPlacement, type RoomWallId } from '@/lib/placementSnap';
import {
  clearActiveDragSession,
  endActiveDragSession,
  startDragSession,
} from '@/lib/planner/dragSession';
import { previewDragPosition } from '@/lib/planner/dragPreview';
import { rayFromClient } from '@/lib/planner/pointerRaycast';
import { FINE_GRID_FT } from '@/components/planner/plannerUtils';
import {
  orientedDimensions,
  resolveCountertopPosition,
  resolvePlacementPosition,
  type PlacementFootprint,
} from '@/components/planner/placementCollision';

const POINTER_DRAG_THRESHOLD_PX = 4;
const COMMIT_NUDGE_FT = 1; // search up to ~1ft for a valid spot on commit

interface OrbitLike {
  enabled: boolean;
}

function PlacementMeshInner({
  placement,
  resolved,
  roomWidth,
  roomDepth,
  footprints,
  catalogById,
  placements,
  selected,
  countertopPlaceItem = null,
  onCountertopPlace,
  onSelect,
  onMove,
  onDragStart,
  onDragEnd,
  onRotate,
}: {
  placement: Placement;
  resolved: ResolvedPlacementItem;
  roomWidth: number;
  roomDepth: number;
  footprints: PlacementFootprint[];
  catalogById: Record<string, CatalogItem>;
  placements: Placement[];
  selected: boolean;
  countertopPlaceItem?: CatalogItem | null;
  onCountertopPlace?: (clickX: number, clickZ: number, baseRotationY: number) => void;
  onSelect: () => void;
  onMove: (x: number, z: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onRotate: () => void;
}) {
  const item = resolved.catalogItem;
  const width = resolved.widthFt;
  const depth = resolved.depthFt;
  const height = resolved.heightFt;
  const groupRef = useRef<THREE.Group>(null);
  const { camera, gl, invalidate } = useThree();
  const controls = useThree((s) => s.controls) as unknown as OrbitLike | null;

  const dragging = useRef(false);
  const didDrag = useRef(false);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const pendingCommit = useRef<{ x: number; z: number } | null>(null);
  const lockedWall = useRef<RoomWallId | null>(null);
  const placementRef = useRef(placement);
  placementRef.current = placement;

  const onSelectRef = useRef(onSelect);
  const onMoveRef = useRef(onMove);
  const onDragStartRef = useRef(onDragStart);
  const onDragEndRef = useRef(onDragEnd);
  const onCountertopPlaceRef = useRef(onCountertopPlace);
  const onRotateRef = useRef(onRotate);
  onSelectRef.current = onSelect;
  onMoveRef.current = onMove;
  onDragStartRef.current = onDragStart;
  onDragEndRef.current = onDragEnd;
  onCountertopPlaceRef.current = onCountertopPlace;
  onRotateRef.current = onRotate;

  const isWall = !!item && isWallCabinet(item);
  const isCounter = !!item && isCountertopItem(item);

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
    if (!dragging.current && groupRef.current) {
      groupRef.current.position.set(...restPosition);
    }
  }, [restPosition]);

  useEffect(() => () => endActiveDragSession(), []);

  const applyVisualPosition = (x: number, z: number, positionY?: number) => {
    const target = groupRef.current;
    if (!target) return;
    const p = placementRef.current;
    const py = positionY ?? p.positionY;
    target.position.set(
      x + oriented.widthFt / 2,
      py + height / 2,
      z + oriented.depthFt / 2,
    );
  };

  const commitResolved = (x: number, z: number): { x: number; z: number } | null => {
    const p = placementRef.current;
    if (resolved.isCustom) {
      return resolvePlacementPosition({
        x,
        z,
        widthFt: width,
        depthFt: depth,
        rotationY: p.rotationY,
        roomWidthFt: roomWidth,
        roomDepthFt: roomDepth,
        footprints,
        excludePlacementId: p.placementId,
        catalogById,
        fallbackX: p.positionX,
        fallbackZ: p.positionZ,
        gridFt: FINE_GRID_FT,
        nudgeFt: COMMIT_NUDGE_FT,
      });
    }
    if (!item) return null;
    return isCounter
      ? resolveCountertopPosition({
          x,
          z,
          widthFt: width,
          depthFt: depth,
          rotationY: p.rotationY,
          roomWidthFt: roomWidth,
          roomDepthFt: roomDepth,
          footprints,
          catalogById,
          placingItem: item,
          excludePlacementId: p.placementId,
          fallbackX: p.positionX,
          fallbackZ: p.positionZ,
          gridFt: FINE_GRID_FT,
          nudgeFt: COMMIT_NUDGE_FT,
        })
      : resolvePlacementPosition({
          x,
          z,
          widthFt: width,
          depthFt: depth,
          rotationY: p.rotationY,
          roomWidthFt: roomWidth,
          roomDepthFt: roomDepth,
          footprints,
          excludePlacementId: p.placementId,
          placingItem: item,
          catalogById,
          fallbackX: p.positionX,
          fallbackZ: p.positionZ,
          gridFt: FINE_GRID_FT,
          nudgeFt: COMMIT_NUDGE_FT,
        });
  };

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    if (countertopPlaceItem && item && isBaseCabinetItem(item) && onCountertopPlaceRef.current) {
      // Use the world-space hit on the cabinet itself — the floor under the base is
      // far behind the cabinet from the camera, so a floor-only raycast misses.
      const clickX = e.point.x;
      const clickZ = e.point.z;
      onCountertopPlaceRef.current(clickX, clickZ, placement.rotationY);
      invalidate();
      return;
    }

    endActiveDragSession();

    // Disable orbit controls immediately so the same gesture doesn't double up as a camera drag.
    const prevControlsEnabled = controls?.enabled ?? true;
    if (controls) controls.enabled = false;

    const pointerId = e.pointerId;
    try {
      gl.domElement.setPointerCapture(pointerId);
    } catch {
      /* ignore */
    }

    const releasePointerCapture = () => {
      try {
        if (gl.domElement.hasPointerCapture(pointerId)) {
          gl.domElement.releasePointerCapture(pointerId);
        }
      } catch {
        /* ignore */
      }
    };

    didDrag.current = false;
    dragging.current = false;
    pendingCommit.current = null;
    pointerStart.current = { x: e.clientX, y: e.clientY };

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

    const canvas = gl.domElement;

    let cleaned = false;
    let cleanupFn: (() => void) | null = null;

    const onWindowMove = (ev: PointerEvent) => {
      const start = pointerStart.current;
      if (!start) return;

      if (!didDrag.current) {
        const dist = Math.hypot(ev.clientX - start.x, ev.clientY - start.y);
        if (dist < POINTER_DRAG_THRESHOLD_PX) return;
        didDrag.current = true;
        dragging.current = true;
        onDragStartRef.current();
        gl.domElement.style.cursor = 'grabbing';
      }

      const preview = previewDragPosition({
        ray: rayFromClient(ev.clientX, ev.clientY, camera, canvas),
        item,
        customFloorDims: resolved.isCustom ? { widthFt: width, depthFt: depth } : undefined,
        placement: placementRef.current,
        lockedWall: lockedWall.current,
        roomWidthFt: roomWidth,
        roomDepthFt: roomDepth,
        placements,
        catalogById,
      });
      if (!preview) return;

      pendingCommit.current = preview;

      let visualY = placementRef.current.positionY;
      if (isCounter && item) {
        const y = resolvePlacementY(
          item,
          preview.x,
          preview.z,
          placementRef.current.rotationY,
          placements.filter((pl) => pl.placementId !== placementRef.current.placementId),
          catalogById,
        );
        if (y !== null) visualY = y;
      }

      applyVisualPosition(preview.x, preview.z, visualY);
      invalidate();
    };

    const finishInteraction = () => {
      if (cleaned) return;
      cleaned = true;
      window.removeEventListener('pointermove', onWindowMove);
      window.removeEventListener('pointerup', onWindowUp);
      window.removeEventListener('pointercancel', onWindowUp);
      releasePointerCapture();
      if (cleanupFn) clearActiveDragSession(cleanupFn);
      gl.domElement.style.cursor = '';
      dragging.current = false;
      lockedWall.current = null;
      pointerStart.current = null;
      if (controls) controls.enabled = prevControlsEnabled;
    };

    const onWindowUp = () => {
      const moved = didDrag.current;
      finishInteraction();

      if (!moved) {
        onSelectRef.current();
        invalidate();
        onDragEndRef.current();
        return;
      }

      const commit = pendingCommit.current;
      pendingCommit.current = null;
      if (commit) {
        const committed = commitResolved(commit.x, commit.z);
        if (committed) {
          onMoveRef.current(committed.x, committed.z);
        } else {
          applyVisualPosition(
            placementRef.current.positionX,
            placementRef.current.positionZ,
          );
        }
      }
      invalidate();
      onDragEndRef.current();
    };

    cleanupFn = () => {
      // Called if a NEW drag session preempts this one (e.g. tab lost focus during drag).
      finishInteraction();
      onDragEndRef.current();
    };
    startDragSession(cleanupFn);

    window.addEventListener('pointermove', onWindowMove);
    window.addEventListener('pointerup', onWindowUp);
    window.addEventListener('pointercancel', onWindowUp);
  };

  return (
    <group ref={groupRef} position={restPosition} rotation={[0, placement.rotationY, 0]}>
      <mesh
        onDoubleClick={(ev) => {
          ev.stopPropagation();
          endActiveDragSession();
          onRotateRef.current();
          invalidate();
        }}
        onPointerDown={handlePointerDown}
        onPointerOver={(ev) => {
          ev.stopPropagation();
          if (!dragging.current) {
            gl.domElement.style.cursor =
              countertopPlaceItem && item && isBaseCabinetItem(item) ? 'pointer' : 'grab';
          }
        }}
        onPointerOut={() => {
          if (!dragging.current) gl.domElement.style.cursor = '';
        }}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...({ eventPriority: 1 } as any)}
      >
        {resolved.shape === 'round' ? (
          <cylinderGeometry
            args={[Math.min(width, depth) / 2, Math.min(width, depth) / 2, height, 24]}
          />
        ) : (
          <boxGeometry args={[width, height, depth]} />
        )}
        <meshLambertMaterial
          color={meshColorForResolved(resolved, selected)}
          emissive={meshEmissive(selected).color}
          emissiveIntensity={meshEmissive(selected).intensity}
        />
      </mesh>
    </group>
  );
}

export const PlacementMesh = memo(PlacementMeshInner, (prev, next) => {
  if (prev.countertopPlaceItem?.itemId !== next.countertopPlaceItem?.itemId) return false;
  if (prev.selected !== next.selected) return false;
  if (prev.placement.placementId !== next.placement.placementId) return false;
  if (prev.placement.positionX !== next.placement.positionX) return false;
  if (prev.placement.positionY !== next.placement.positionY) return false;
  if (prev.placement.positionZ !== next.placement.positionZ) return false;
  if (prev.placement.rotationY !== next.placement.rotationY) return false;
  if (prev.resolved.widthIn !== next.resolved.widthIn) return false;
  if (prev.resolved.depthIn !== next.resolved.depthIn) return false;
  if (prev.resolved.heightIn !== next.resolved.heightIn) return false;
  if (prev.resolved.shape !== next.resolved.shape) return false;
  if (prev.resolved.label !== next.resolved.label) return false;
  if (prev.resolved.catalogItem?.itemId !== next.resolved.catalogItem?.itemId) return false;
  if (prev.footprints !== next.footprints) return false;
  return true;
});
