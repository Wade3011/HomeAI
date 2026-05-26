/** Surface presets for meshStandardMaterial — tuned for planner lighting. */
export type MeshMaterialKind =
  | 'wood'
  | 'woodDark'
  | 'porcelain'
  | 'stainless'
  | 'chrome'
  | 'glass'
  | 'granite'
  | 'tile'
  | 'acrylic'
  | 'matte'
  | 'appliance'
  | 'burner'
  | 'rubber';

export function materialSurface(kind: MeshMaterialKind): {
  roughness: number;
  metalness: number;
  envMapIntensity: number;
} {
  switch (kind) {
    case 'wood':
      return { roughness: 0.72, metalness: 0, envMapIntensity: 0.35 };
    case 'woodDark':
      return { roughness: 0.82, metalness: 0, envMapIntensity: 0.25 };
    case 'porcelain':
      return { roughness: 0.22, metalness: 0.04, envMapIntensity: 0.5 };
    case 'stainless':
      return { roughness: 0.32, metalness: 0.88, envMapIntensity: 0.85 };
    case 'chrome':
      return { roughness: 0.12, metalness: 0.96, envMapIntensity: 1 };
    case 'glass':
      return { roughness: 0.04, metalness: 0.12, envMapIntensity: 0.9 };
    case 'granite':
      return { roughness: 0.52, metalness: 0.03, envMapIntensity: 0.4 };
    case 'tile':
      return { roughness: 0.38, metalness: 0.02, envMapIntensity: 0.45 };
    case 'acrylic':
      return { roughness: 0.28, metalness: 0, envMapIntensity: 0.35 };
    case 'matte':
      return { roughness: 0.88, metalness: 0, envMapIntensity: 0.2 };
    case 'appliance':
      return { roughness: 0.38, metalness: 0.72, envMapIntensity: 0.75 };
    case 'burner':
      return { roughness: 0.92, metalness: 0.18, envMapIntensity: 0.3 };
    case 'rubber':
      return { roughness: 0.96, metalness: 0, envMapIntensity: 0.15 };
  }
}
