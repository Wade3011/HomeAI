import type { CeilingType, RidgeAxis, Room } from '@/types';

export type CeilingRoomInput = Pick<
  Room,
  'widthFt' | 'depthFt' | 'heightFt' | 'ceilingType' | 'peakHeightFt' | 'ridgeAxis' | 'type'
>;

export interface CeilingSpec {
  type: CeilingType;
  eaveHeightFt: number;
  peakHeightFt: number;
  ridgeAxis: RidgeAxis;
}

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t));
}

/** Normalize optional room ceiling fields with safe defaults. */
export function buildCeilingSpec(room: CeilingRoomInput): CeilingSpec {
  const type: CeilingType = room.ceilingType === 'cathedral' ? 'cathedral' : 'flat';
  const eaveHeightFt = room.heightFt;
  if (type === 'flat') {
    return {
      type: 'flat',
      eaveHeightFt,
      peakHeightFt: eaveHeightFt,
      ridgeAxis: room.ridgeAxis ?? 'width',
    };
  }
  const rawPeak = room.peakHeightFt ?? eaveHeightFt + 3;
  return {
    type: 'cathedral',
    eaveHeightFt,
    peakHeightFt: Math.max(rawPeak, eaveHeightFt + 1),
    ridgeAxis: room.ridgeAxis ?? 'width',
  };
}

export function validateCathedralPeak(eaveHeightFt: number, peakHeightFt: number): string | null {
  if (!(peakHeightFt >= eaveHeightFt + 1)) {
    return 'Peak height must be at least 1 ft above wall (eave) height.';
  }
  return null;
}

/**
 * Ceiling height (Y) above the floor at a room-local point.
 * Local origin is the room's back-left (layout) corner; +X width, +Z depth.
 */
export function ceilingHeightAt(room: CeilingRoomInput, localX: number, localZ: number): number {
  const spec = buildCeilingSpec(room);
  if (spec.type === 'flat') return spec.eaveHeightFt;

  const { eaveHeightFt, peakHeightFt, ridgeAxis } = spec;
  if (ridgeAxis === 'width') {
    // Ridge runs along +X (width); height varies with Z.
    const t = clamp01(room.depthFt > 0 ? localZ / room.depthFt : 0.5);
    const distFromRidge = Math.abs(t - 0.5) * 2;
    return peakHeightFt + (eaveHeightFt - peakHeightFt) * distFromRidge;
  }

  const t = clamp01(room.widthFt > 0 ? localX / room.widthFt : 0.5);
  const distFromRidge = Math.abs(t - 0.5) * 2;
  return peakHeightFt + (eaveHeightFt - peakHeightFt) * distFromRidge;
}

/** Max ceiling height in the room (peak for cathedral, eave for flat). */
export function maxCeilingHeightFt(room: CeilingRoomInput): number {
  return buildCeilingSpec(room).peakHeightFt;
}

/** Porch / outdoor rooms skip a closed ceiling mesh. */
export function roomShowsCeilingMesh(room: CeilingRoomInput): boolean {
  return room.type !== 'porch';
}

export interface CeilingTriangleMesh {
  /** Flat array of xyz positions (9 floats per triangle). */
  positions: Float32Array;
  /** Upward normals for lighting. */
  normals: Float32Array;
}

/**
 * Build triangle mesh for the ceiling underside (normals point downward into the room
 * so the interior faces are lit when looking up).
 */
export function buildCeilingMeshData(room: CeilingRoomInput): CeilingTriangleMesh | null {
  if (!roomShowsCeilingMesh(room)) return null;
  const spec = buildCeilingSpec(room);
  const w = room.widthFt;
  const d = room.depthFt;

  if (spec.type === 'flat') {
    const y = spec.eaveHeightFt;
    // Two triangles, winding so normals point -Y (into room from above).
    const positions = new Float32Array([
      0, y, 0,  w, y, 0,  w, y, d,
      0, y, 0,  w, y, d,  0, y, d,
    ]);
    const normals = new Float32Array(18);
    for (let i = 0; i < 6; i++) {
      normals[i * 3 + 1] = -1;
    }
    return { positions, normals };
  }

  const { eaveHeightFt: e, peakHeightFt: p, ridgeAxis } = spec;

  if (ridgeAxis === 'width') {
    const midZ = d / 2;
    // Half toward back (z=0), half toward front (z=d). Normals approximate -Y.
    const positions = new Float32Array([
      // back half
      0, e, 0,  w, e, 0,  w, p, midZ,
      0, e, 0,  w, p, midZ,  0, p, midZ,
      // front half
      0, p, midZ,  w, p, midZ,  w, e, d,
      0, p, midZ,  w, e, d,  0, e, d,
    ]);
    return { positions, normals: downwardNormals(positions) };
  }

  const midX = w / 2;
  const positions = new Float32Array([
    // left half
    0, e, 0,  midX, p, 0,  midX, p, d,
    0, e, 0,  midX, p, d,  0, e, d,
    // right half
    midX, p, 0,  w, e, 0,  w, e, d,
    midX, p, 0,  w, e, d,  midX, p, d,
  ]);
  return { positions, normals: downwardNormals(positions) };
}

function downwardNormals(positions: Float32Array): Float32Array {
  const normals = new Float32Array(positions.length);
  for (let i = 0; i < positions.length; i += 9) {
    const ax = positions[i];
    const ay = positions[i + 1];
    const az = positions[i + 2];
    const bx = positions[i + 3];
    const by = positions[i + 4];
    const bz = positions[i + 5];
    const cx = positions[i + 6];
    const cy = positions[i + 7];
    const cz = positions[i + 8];
    let nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay);
    let ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
    let nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    // Prefer inward (-Y) facing for ceiling underside.
    if (ny > 0) {
      nx = -nx;
      ny = -ny;
      nz = -nz;
    }
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;
    for (let v = 0; v < 3; v++) {
      normals[i + v * 3] = nx;
      normals[i + v * 3 + 1] = ny;
      normals[i + v * 3 + 2] = nz;
    }
  }
  return normals;
}
