import type { CatalogMeshProfile } from '@/lib/planner/catalogMeshShapes';
import { useGLTF } from '@react-three/drei';

/**
 * Generic GLB placeholders — one model per shape profile, scaled to catalog width/depth/height.
 * These are representative looks, not exact product matches.
 *
 * Drop files into `public/models/catalog/` and add the profile key here to enable them.
 * Profiles not listed fall back to procedural meshes in CatalogItemMesh.
 */
export const CATALOG_MODEL_PATHS: Partial<Record<CatalogMeshProfile, string>> = {
  'toilet-two-piece': '/models/catalog/toilet-two-piece.glb',
  'toilet-one-piece': '/models/catalog/toilet-two-piece.glb',
  'base-cabinet': '/models/catalog/base-cabinet.glb',
  'cabinet-drawer': '/models/catalog/base-cabinet.glb',
  'cabinet-pantry': '/models/catalog/base-cabinet.glb',
  'cabinet-sink': '/models/catalog/base-cabinet.glb',
};

export function catalogModelPath(profile: CatalogMeshProfile): string | null {
  return CATALOG_MODEL_PATHS[profile] ?? null;
}

/** Preload all configured models (call once from a client component mount). */
export function preloadCatalogModels(): void {
  for (const path of Object.values(CATALOG_MODEL_PATHS)) {
    if (path) useGLTF.preload(path);
  }
}
