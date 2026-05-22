export const ROTATION_STEP = Math.PI / 2;
export const ROTATION_STEP_COUNT = 4;

/** 6-inch grid for cabinet placement along walls and counters */
export const CABINET_GRID_FT = 0.5;

export function snapToGrid(value: number, gridSize = CABINET_GRID_FT): number {
  return Math.round(value / gridSize) * gridSize;
}

/** 0–3 quarter-turns → 0, 90, 180, 270 degrees display */
export function rotationDegreesFromSteps(steps: number): number {
  return ((steps % ROTATION_STEP_COUNT) + ROTATION_STEP_COUNT) % ROTATION_STEP_COUNT * 90;
}

export function rotationYFromSteps(steps: number): number {
  const s =
    ((steps % ROTATION_STEP_COUNT) + ROTATION_STEP_COUNT) % ROTATION_STEP_COUNT;
  return s * ROTATION_STEP;
}

export function rotationStepsFromY(rotationY: number): number {
  const steps = Math.round(rotationY / ROTATION_STEP);
  return ((steps % ROTATION_STEP_COUNT) + ROTATION_STEP_COUNT) % ROTATION_STEP_COUNT;
}

export function nextRotationSteps(current: number, deltaSteps = 1): number {
  return (
    (((current + deltaSteps) % ROTATION_STEP_COUNT) + ROTATION_STEP_COUNT) %
    ROTATION_STEP_COUNT
  );
}

export function clampPlacementOrigin(
  x: number,
  z: number,
  itemWidthFt: number,
  itemDepthFt: number,
  roomWidthFt: number,
  roomDepthFt: number,
) {
  const maxX = Math.max(0, roomWidthFt - itemWidthFt);
  const maxZ = Math.max(0, roomDepthFt - itemDepthFt);
  return {
    x: Math.max(0, Math.min(maxX, x)),
    z: Math.max(0, Math.min(maxZ, z)),
  };
}
