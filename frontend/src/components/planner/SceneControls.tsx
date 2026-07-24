'use client';

import { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';

function wantsPan(e: MouseEvent | PointerEvent): boolean {
  return e.shiftKey || e.altKey || e.button === 1 || e.button === 2;
}

const DEFAULT_MOUSE_BUTTONS = {
  LEFT: THREE.MOUSE.ROTATE,
  MIDDLE: THREE.MOUSE.PAN,
  RIGHT: THREE.MOUSE.PAN,
} as const;

const DEFAULT_TOUCHES = {
  ONE: THREE.TOUCH.ROTATE,
  TWO: THREE.TOUCH.DOLLY_PAN,
} as const;

export function SceneControls({
  target,
  isDraggingItem,
  placementMode = false,
  disabled = false,
}: {
  target: [number, number, number];
  isDraggingItem: boolean;
  /** Catalog item armed — disable orbit so clicks place cabinets */
  placementMode?: boolean;
  /** Fully disable orbit (e.g. first-person walk mode). */
  disabled?: boolean;
}) {
  const ref = useRef<OrbitControlsImpl>(null);
  const panWithLeftRef = useRef(false);
  const { gl, invalidate } = useThree();

  const orbitEnabled = !disabled && !isDraggingItem && !placementMode;

  useEffect(() => {
    const controls = ref.current;
    const el = gl.domElement;
    if (!controls || !el) return;

    const syncBindings = (e?: MouseEvent | PointerEvent) => {
      if (!orbitEnabled) return;
      const pan = panWithLeftRef.current || (e !== undefined && wantsPan(e));
      controls.mouseButtons = {
        LEFT: pan ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.PAN,
        RIGHT: THREE.MOUSE.PAN,
      };
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
  }, [gl, orbitEnabled]);

  useEffect(() => {
    const controls = ref.current;
    if (!controls) return;

    controls.enabled = orbitEnabled;
    controls.enableZoom = true;

    if (placementMode) {
      controls.enableRotate = false;
      controls.enablePan = false;
      controls.mouseButtons = {
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.PAN,
        RIGHT: THREE.MOUSE.PAN,
      };
      controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.PAN };
    } else {
      controls.enableRotate = true;
      controls.enablePan = true;
      controls.mouseButtons = { ...DEFAULT_MOUSE_BUTTONS };
      controls.touches = { ...DEFAULT_TOUCHES };
    }

    controls.keys = {
      LEFT: 'ArrowLeft',
      UP: 'ArrowUp',
      RIGHT: 'ArrowRight',
      BOTTOM: 'ArrowDown',
    };
    if (orbitEnabled) {
      controls.listenToKeyEvents(gl.domElement);
    } else {
      controls.stopListenToKeyEvents();
    }
    controls.target.set(...target);

    const onChange = () => invalidate();
    controls.addEventListener('change', onChange);
    return () => {
      controls.removeEventListener('change', onChange);
      controls.stopListenToKeyEvents();
    };
  }, [gl, target, orbitEnabled, placementMode, invalidate]);

  return (
    <OrbitControls
      ref={ref}
      makeDefault
      target={target}
      enabled={orbitEnabled}
      enablePan={orbitEnabled}
      enableRotate={orbitEnabled}
      enableZoom
      screenSpacePanning
      panSpeed={1.4}
      rotateSpeed={0.85}
      zoomSpeed={1.1}
      minPolarAngle={0.12}
      maxPolarAngle={Math.PI / 2 - 0.04}
      minDistance={4}
      maxDistance={Math.max(target[0], target[2]) * 8}
      touches={placementMode ? { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.PAN } : DEFAULT_TOUCHES}
    />
  );
}
