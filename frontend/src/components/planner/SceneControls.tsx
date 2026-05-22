'use client';

import { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';

function wantsPan(e: MouseEvent | PointerEvent): boolean {
  return e.shiftKey || e.altKey || e.button === 1 || e.button === 2;
}

function applyMouseBindings(controls: OrbitControlsImpl, panWithLeft: boolean) {
  controls.mouseButtons = {
    LEFT: panWithLeft ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.PAN,
    RIGHT: THREE.MOUSE.PAN,
  };
}

export function SceneControls({
  target,
  isDraggingItem,
}: {
  target: [number, number, number];
  /** True while dragging a cabinet — temporarily disables orbit */
  isDraggingItem: boolean;
}) {
  const ref = useRef<OrbitControlsImpl>(null);
  const panWithLeftRef = useRef(false);
  const { gl } = useThree();

  useEffect(() => {
    const controls = ref.current;
    const el = gl.domElement;
    if (!controls || !el) return;

    const syncBindings = (e?: MouseEvent | PointerEvent) => {
      const pan =
        panWithLeftRef.current || (e !== undefined && wantsPan(e));
      applyMouseBindings(controls, pan);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift' || e.key === 'Alt') {
        panWithLeftRef.current = true;
        syncBindings();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift' || e.key === 'Alt') {
        panWithLeftRef.current = false;
        syncBindings();
      }
    };
    const onBlur = () => {
      panWithLeftRef.current = false;
      syncBindings();
    };
    const onPointerDown = (e: PointerEvent) => syncBindings(e);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    el.addEventListener('pointerdown', onPointerDown);
    syncBindings();

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      el.removeEventListener('pointerdown', onPointerDown);
    };
  }, [gl]);

  useEffect(() => {
    const controls = ref.current;
    if (!controls) return;
    controls.enabled = !isDraggingItem;
    controls.listenToKeyEvents(gl.domElement);
    controls.keys = {
      LEFT: 'ArrowLeft',
      UP: 'ArrowUp',
      RIGHT: 'ArrowRight',
      BOTTOM: 'ArrowDown',
    };
    controls.target.set(...target);
  }, [gl, target, isDraggingItem]);

  return (
    <OrbitControls
      ref={ref}
      makeDefault
      target={target}
      enablePan
      enableRotate
      enableZoom
      screenSpacePanning
      panSpeed={1.4}
      rotateSpeed={0.85}
      zoomSpeed={1.1}
      minPolarAngle={0.12}
      maxPolarAngle={Math.PI / 2 - 0.04}
      minDistance={4}
      maxDistance={Math.max(target[0], target[2]) * 4}
      touches={{
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN,
      }}
    />
  );
}
