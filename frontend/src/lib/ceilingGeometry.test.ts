import { describe, expect, it } from 'vitest';
import {
  buildCeilingSpec,
  ceilingHeightAt,
  maxCeilingHeightFt,
  validateCathedralPeak,
} from '@/lib/ceilingGeometry';

const flatRoom = {
  widthFt: 16,
  depthFt: 20,
  heightFt: 9,
  ceilingType: 'flat' as const,
  type: 'bedroom',
};

const cathedralWidth = {
  widthFt: 16,
  depthFt: 20,
  heightFt: 9,
  ceilingType: 'cathedral' as const,
  peakHeightFt: 12,
  ridgeAxis: 'width' as const,
  type: 'living',
};

describe('buildCeilingSpec', () => {
  it('defaults omitted type to flat', () => {
    const spec = buildCeilingSpec({ widthFt: 10, depthFt: 10, heightFt: 9, type: 'bedroom' });
    expect(spec.type).toBe('flat');
    expect(spec.peakHeightFt).toBe(9);
  });

  it('enforces cathedral peak at least 1 ft above eave', () => {
    const spec = buildCeilingSpec({
      ...cathedralWidth,
      peakHeightFt: 9.2,
    });
    expect(spec.peakHeightFt).toBe(10);
  });
});

describe('ceilingHeightAt', () => {
  it('returns wall height everywhere for flat', () => {
    expect(ceilingHeightAt(flatRoom, 0, 0)).toBe(9);
    expect(ceilingHeightAt(flatRoom, 8, 10)).toBe(9);
  });

  it('returns peak at ridge and eave at walls for cathedral along width', () => {
    expect(ceilingHeightAt(cathedralWidth, 8, 10)).toBeCloseTo(12, 5);
    expect(ceilingHeightAt(cathedralWidth, 0, 0)).toBeCloseTo(9, 5);
    expect(ceilingHeightAt(cathedralWidth, 16, 20)).toBeCloseTo(9, 5);
    expect(ceilingHeightAt(cathedralWidth, 8, 5)).toBeCloseTo(10.5, 5);
  });

  it('varies along X when ridge runs along depth', () => {
    const room = { ...cathedralWidth, ridgeAxis: 'depth' as const };
    expect(ceilingHeightAt(room, 8, 10)).toBeCloseTo(12, 5);
    expect(ceilingHeightAt(room, 0, 10)).toBeCloseTo(9, 5);
    expect(ceilingHeightAt(room, 16, 10)).toBeCloseTo(9, 5);
  });
});

describe('maxCeilingHeightFt', () => {
  it('uses peak for cathedral and eave for flat', () => {
    expect(maxCeilingHeightFt(flatRoom)).toBe(9);
    expect(maxCeilingHeightFt(cathedralWidth)).toBe(12);
  });
});

describe('validateCathedralPeak', () => {
  it('rejects peaks too close to eave', () => {
    expect(validateCathedralPeak(9, 9.5)).toMatch(/1 ft/);
    expect(validateCathedralPeak(9, 10)).toBeNull();
  });
});
