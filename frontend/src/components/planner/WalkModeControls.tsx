'use client';

import { PointerLockControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { PointerLockControls as PointerLockControlsImpl } from 'three-stdlib';
import {
  dampVelocity,
  resolveWalkPosition,
  WALK_ACCEL_FT_S2,
  WALK_EYE_HEIGHT_FT,
  WALK_RADIUS_FT,
  WALK_SPEED_FT_S,
  type WalkSegment,
} from '@/lib/walkCollision';

type KeyState = {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
};

function readKey(e: KeyboardEvent, down: boolean, state: KeyState): void {
  switch (e.code) {
    case 'ArrowUp':
    case 'KeyW':
      state.forward = down;
      e.preventDefault();
      break;
    case 'ArrowDown':
    case 'KeyS':
      state.back = down;
      e.preventDefault();
      break;
    case 'ArrowLeft':
    case 'KeyA':
      state.left = down;
      e.preventDefault();
      break;
    case 'ArrowRight':
    case 'KeyD':
      state.right = down;
      e.preventDefault();
      break;
    default:
      break;
  }
}

/**
 * First-person walk: pointer-lock look + WASD/arrow move.
 * Collides with wall segments only — furniture is not a stopper.
 */
export function WalkModeControls({
  enabled,
  segments,
  spawn,
  eyeHeightFt = WALK_EYE_HEIGHT_FT,
  floorY = 0,
  resolveFloorY,
  onLockChange,
}: {
  enabled: boolean;
  segments: WalkSegment[];
  /** Starting XZ (and optional yaw facing +Z by default). */
  spawn: { x: number; z: number; yaw?: number };
  eyeHeightFt?: number;
  /** Story floor elevation for whole-home walk (constant). */
  floorY?: number;
  /** Optional per-position floor Y (e.g. which room you’re standing in). */
  resolveFloorY?: (x: number, z: number) => number;
  onLockChange?: (locked: boolean) => void;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<PointerLockControlsImpl>(null);
  const keysRef = useRef<KeyState>({
    forward: false,
    back: false,
    left: false,
    right: false,
  });
  const velocityRef = useRef({ x: 0, z: 0 });
  const forward = useMemo(() => new THREE.Vector3(), []);
  const right = useMemo(() => new THREE.Vector3(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  useEffect(() => {
    if (!enabled) return;
    const eyeY = floorY + eyeHeightFt;
    camera.position.set(spawn.x, eyeY, spawn.z);
    camera.rotation.order = 'YXZ';
    camera.rotation.x = 0;
    camera.rotation.y = spawn.yaw ?? 0;
    camera.rotation.z = 0;
    velocityRef.current = { x: 0, z: 0 };
    keysRef.current = { forward: false, back: false, left: false, right: false };
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = 70;
      camera.updateProjectionMatrix();
    }
    return () => {
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = 45;
        camera.updateProjectionMatrix();
      }
    };
  }, [enabled, spawn.x, spawn.z, spawn.yaw, eyeHeightFt, floorY, camera]);

  useEffect(() => {
    if (!enabled) return;
    const state = keysRef.current;
    const onDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      readKey(e, true, state);
    };
    const onUp = (e: KeyboardEvent) => readKey(e, false, state);
    const onBlur = () => {
      state.forward = state.back = state.left = state.right = false;
    };
    window.addEventListener('keydown', onDown, { capture: true });
    window.addEventListener('keyup', onUp, { capture: true });
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onDown, { capture: true });
      window.removeEventListener('keyup', onUp, { capture: true });
      window.removeEventListener('blur', onBlur);
      onBlur();
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      onLockChange?.(false);
      return;
    }
    const controls = controlsRef.current;
    if (!controls) return;
    const onLock = () => onLockChange?.(true);
    const onUnlock = () => onLockChange?.(false);
    controls.addEventListener('lock', onLock);
    controls.addEventListener('unlock', onUnlock);
    return () => {
      controls.removeEventListener('lock', onLock);
      controls.removeEventListener('unlock', onUnlock);
      if (controls.isLocked) controls.unlock();
      onLockChange?.(false);
    };
  }, [enabled, onLockChange]);

  useFrame((_, rawDt) => {
    if (!enabled) return;
    const dt = Math.min(rawDt, 0.05);
    const keys = keysRef.current;

    camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() < 1e-6) {
      forward.set(0, 0, -1);
    } else {
      forward.normalize();
    }
    right.crossVectors(forward, up).normalize();

    let wishX = 0;
    let wishZ = 0;
    if (keys.forward) {
      wishX += forward.x;
      wishZ += forward.z;
    }
    if (keys.back) {
      wishX -= forward.x;
      wishZ -= forward.z;
    }
    if (keys.right) {
      wishX += right.x;
      wishZ += right.z;
    }
    if (keys.left) {
      wishX -= right.x;
      wishZ -= right.z;
    }
    const wishLen = Math.hypot(wishX, wishZ);
    if (wishLen > 1e-6) {
      wishX = (wishX / wishLen) * WALK_SPEED_FT_S;
      wishZ = (wishZ / wishLen) * WALK_SPEED_FT_S;
    }

    velocityRef.current = dampVelocity(
      velocityRef.current,
      { x: wishX, z: wishZ },
      WALK_ACCEL_FT_S2,
      dt,
    );

    const nextX = camera.position.x + velocityRef.current.x * dt;
    const nextZ = camera.position.z + velocityRef.current.z * dt;
    const resolved = resolveWalkPosition(
      nextX,
      nextZ,
      WALK_RADIUS_FT,
      segments,
    );
    camera.position.x = resolved.x;
    camera.position.z = resolved.z;
    const groundY = resolveFloorY
      ? resolveFloorY(resolved.x, resolved.z)
      : floorY;
    camera.position.y = groundY + eyeHeightFt;
  });

  if (!enabled) return null;

  return <PointerLockControls ref={controlsRef} />;
}
