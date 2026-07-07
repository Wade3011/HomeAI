# Catalog 3D models (GLB)

Generic **stand-in** visuals — one GLB per shape profile, scaled to each catalog item’s width / depth / height. Not exact product matches.

Placement and collision still use catalog dimensions; only the on-screen mesh changes.

## Bundled models (CC0)

| File | Profile(s) | Source |
|------|------------|--------|
| `toilet-two-piece.glb` | `toilet-two-piece`, `toilet-one-piece` | [Quaternius — Toilet](https://poly.pizza/m/WAu50yGFVt) (CC0) |
| `base-cabinet.glb` | `base-cabinet`, `cabinet-drawer`, `cabinet-pantry`, `cabinet-sink` | [Kenney — Kitchen Cabinet](https://poly.pizza/m/jRPnkxtk8s) (CC0) |

## Enable more models

1. Add a `.glb` file to this folder.
2. Map it in `src/lib/planner/catalogMeshModels.ts`:

```ts
export const CATALOG_MODEL_PATHS = {
  'vanity': '/models/catalog/vanity.glb',
};
```

Profiles without an entry use procedural shapes in `CatalogItemMesh.tsx`.

## Authoring tips

- Export as **GLB**, Y-up. Meters or arbitrary units are fine — we scale to feet.
- Prefer bottom at Y=0; we also auto floor-align.
- Keep poly count modest for smooth dragging.
- Use CC0 or properly licensed assets only.

Profile keys: see `CatalogMeshProfile` in `src/lib/planner/catalogMeshShapes.ts`.
