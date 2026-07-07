import type { CustomItemShape, CustomItemSpec } from '@/types';

const IN = 12;

export function isSectionalShape(shape: CustomItemShape): boolean {
  return (
    shape === 'sectional-l' ||
    shape === 'sectional-u' ||
    shape === 'sectional-chase'
  );
}

export function sectionalDefaults(shape: CustomItemShape): {
  sectionalRunIn: number;
  sectionalArmDepthIn: number;
} {
  switch (shape) {
    case 'sectional-chase':
      return { sectionalRunIn: 80, sectionalArmDepthIn: 40 };
    case 'sectional-u':
      return { sectionalRunIn: 60, sectionalArmDepthIn: 36 };
    case 'sectional-l':
    default:
      return { sectionalRunIn: 68, sectionalArmDepthIn: 36 };
  }
}

export function normalizeCustomItemSpec(spec: CustomItemSpec): CustomItemSpec {
  if (!isSectionalShape(spec.shape)) return spec;
  const defaults = sectionalDefaults(spec.shape);
  return {
    ...spec,
    sectionalRunIn: spec.sectionalRunIn ?? defaults.sectionalRunIn,
    sectionalArmDepthIn: spec.sectionalArmDepthIn ?? defaults.sectionalArmDepthIn,
  };
}

export interface SectionalPartFt {
  cx: number;
  cz: number;
  widthFt: number;
  depthFt: number;
}

/** Footprint parts in local space; origin = back-left of bounding box. */
export function sectionalPartsFt(spec: CustomItemSpec): SectionalPartFt[] {
  const normalized = normalizeCustomItemSpec(spec);
  const w = normalized.widthIn / IN;
  const d = normalized.depthIn / IN;
  const run = (normalized.sectionalRunIn ?? 68) / IN;
  const arm = (normalized.sectionalArmDepthIn ?? 36) / IN;

  switch (normalized.shape) {
    case 'sectional-l':
    case 'sectional-chase':
      return [
        { cx: w / 2, cz: d / 2, widthFt: w, depthFt: d },
        { cx: w - arm / 2, cz: d + run / 2, widthFt: arm, depthFt: run },
      ];
    case 'sectional-u':
      return [
        { cx: w / 2, cz: d / 2, widthFt: w, depthFt: d },
        { cx: arm / 2, cz: d + run / 2, widthFt: arm, depthFt: run },
        { cx: w - arm / 2, cz: d + run / 2, widthFt: arm, depthFt: run },
      ];
    default:
      return [{ cx: w / 2, cz: d / 2, widthFt: w, depthFt: d }];
  }
}

export function sectionalBoundsIn(spec: CustomItemSpec): {
  widthIn: number;
  depthIn: number;
} {
  const normalized = normalizeCustomItemSpec(spec);
  const run = normalized.sectionalRunIn ?? 68;
  if (isSectionalShape(normalized.shape)) {
    return {
      widthIn: normalized.widthIn,
      depthIn: normalized.depthIn + run,
    };
  }
  return { widthIn: normalized.widthIn, depthIn: normalized.depthIn };
}

export function sectionalBoundsFt(spec: CustomItemSpec): {
  widthFt: number;
  depthFt: number;
} {
  const b = sectionalBoundsIn(spec);
  return { widthFt: b.widthIn / IN, depthFt: b.depthIn / IN };
}

/** Parts relative to bounding-box center (matches placement group origin). */
export function sectionalPartsCenteredFt(spec: CustomItemSpec): SectionalPartFt[] {
  const bounds = sectionalBoundsFt(spec);
  return sectionalPartsFt(spec).map((part) => ({
    ...part,
    cx: part.cx - bounds.widthFt / 2,
    cz: part.cz - bounds.depthFt / 2,
  }));
}

export function sectionalShapeLabel(shape: CustomItemShape): string {
  switch (shape) {
    case 'sectional-l':
      return 'L-shape';
    case 'sectional-u':
      return 'U-shape';
    case 'sectional-chase':
      return 'Chaise';
    case 'round':
      return 'Round';
    default:
      return 'Box';
  }
}
