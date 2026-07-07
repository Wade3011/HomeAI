# Exterior / Site Plan — Development Plan

Plan for adding **driveways**, **detached garages / pole barns**, and **sheds** to HomeAI. Written for dev-mode work (mock API first); production hardening is tracked separately in [AWS_SERVICES.md](./AWS_SERVICES.md).

---

## Goals

| Feature | User can… |
|---------|-----------|
| **Driveway** | Draw a flat paved area on the lot; resize/move it; snap it toward garage or entry doors |
| **Detached garage / pole barn** | Place a standalone structure on the site; set size, rotation, door side; open it in the room planner |
| **Shed** | Place a small outbuilding; set size and rotation; optional simple door |

**Out of scope for v1:** grading, landscaping catalog, fencing, pools, permit/export, exterior material pricing.

---

## Current architecture (what we build on)

```
Project
├── Rooms[]           ← interior + attached garage/porch (FloorPlanEditor)
├── RoomConnection[]  ← open/door links between rooms
├── ExteriorDoor[]    ← entry doors on exterior-facing room walls
└── Placements[]      ← per-room 3D items (kitchen, living, etc.)
```

Relevant files today:

| Area | Path |
|------|------|
| Types | `frontend/src/types/index.ts` |
| Floor plan math | `frontend/src/lib/homeLayout.ts`, `floorPlanSnap.ts` |
| 2D editor | `frontend/src/components/planner/FloorPlanEditor.tsx` |
| Whole-home 3D | `frontend/src/components/planner/HomeScene.tsx`, `projects/[projectId]/3d/page.tsx` |
| Mock persistence | `frontend/src/lib/mockStore.ts`, `mockApi.ts` |
| Client API | `frontend/src/lib/api.ts` |
| BFF routes | `frontend/src/app/api/projects/[projectId]/**` |

**Important:** Attached garage and porch are already `Room` types (`config/roomTypes.ts`). **Detached** structures and **driveways** need a new **site layer** — they live on the lot, not inside the house footprint.

---

## Design decisions

### 1. Two layers: House vs Site

```
Project
├── House layer     ← existing Rooms, connections, exterior doors (unchanged)
└── Site layer      ← NEW: lot boundary + site features
      ├── SiteSettings (lot size, optional house offset)
      └── SiteStructure[] (driveways, detached buildings)
```

The site plan is a **larger 2D canvas**. Rooms keep their current `layoutX` / `layoutZ`. Site features use the **same world coordinate system** (feet from project origin).

### 2. Detached buildings are not Rooms

Do **not** add `type: 'driveway'` or `'shed'` to `Room`. Detached garages would fight interior wall logic, connections, and per-room placement rules.

Instead, use **`SiteStructure`** — a rectangle on the lot with its own type. When the user opens a detached garage in the 3D planner, **materialize a linked Room** (or a dedicated `structureId` scope) only for that session — see Phase 3.

### 3. Driveways are flat polygons

Start with **axis-aligned rectangles** (4 corner points). Store as a closed polygon so L-shapes and curves can come later without a schema change.

### 4. Dev-first: mock API before Lambda

Implement every new endpoint in `mockStore.ts` + `mockApi.ts` first. Add Lambda + DynamoDB when the site feature set stabilizes (same lesson as connections / exterior doors).

---

## Data model

Add to `frontend/src/types/index.ts` (names are suggestions — keep consistent once implemented).

### Site settings (one per project)

```typescript
export interface SiteSettings {
  projectId: string;
  /** Lot width along +X (feet). Default 120 if unset. */
  lotWidthFt: number;
  /** Lot depth along +Z (feet). Default 150 if unset. */
  lotDepthFt: number;
  /** Optional: shift entire house footprint on lot (feet). Usually 0,0. */
  houseOffsetX?: number;
  houseOffsetZ?: number;
}
```

### Site structure kinds

```typescript
export type SiteStructureKind =
  | 'driveway'
  | 'detached-garage'
  | 'pole-barn'
  | 'shed';

export type SitePavingMaterial = 'asphalt' | 'concrete' | 'gravel' | 'pavers';

/** Closed polygon in site feet (minimum 3 points; MVP uses 4 for rectangles). */
export interface SitePoint {
  x: number;
  z: number;
}

export interface SiteStructure {
  structureId: string;
  projectId: string;
  kind: SiteStructureKind;
  name: string;
  /** For driveways: polygon footprint. For buildings: derived from center + size + rotation. */
  points: SitePoint[];
  /** Building-only: center of footprint (feet). Redundant with points but simplifies drag/rotate. */
  centerX?: number;
  centerZ?: number;
  widthFt?: number;
  depthFt?: number;
  /** Building-only: rotation around Y in radians (0 = width along X). */
  rotationY?: number;
  heightFt?: number;
  /** Driveway-only */
  material?: SitePavingMaterial;
  /** Building-only: which wall has the main door (for snap + 3D) */
  doorSide?: RoomWallSide;
  /**
   * When set, interior planner uses this room for placements.
   * Created when user first opens structure in 3D; optional until then.
   */
  linkedRoomId?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Presets (defaults when adding from UI)

| Kind | Default size (W × D × H) | Notes |
|------|--------------------------|-------|
| `driveway` | 12 × 24 ft | Asphalt; snap to nearest exterior door |
| `detached-garage` | 24 × 24 × 10 ft | 2-car; door on `front` |
| `pole-barn` | 30 × 40 × 14 ft | Open span; door on `front` |
| `shed` | 10 × 12 × 9 ft | Single door on `front` |

Add `frontend/src/config/siteStructurePresets.ts` mirroring `roomTypes.ts`.

### Bounds helper

```typescript
// frontend/src/lib/siteLayout.ts (new)
computeSiteBounds(site: SiteSettings, rooms: Room[], structures: SiteStructure[]): SiteBounds
computeHouseBounds(rooms: Room[]): ProjectBounds  // wrap existing computeProjectBounds
```

Camera, grid, and minimap should use **site bounds**, not house bounds only.

---

## API (mock first)

| Method | Path | Body / response |
|--------|------|-----------------|
| GET | `/api/projects/{id}/site` | `{ site: SiteSettings, structures: SiteStructure[] }` |
| PUT | `/api/projects/{id}/site` | `{ site: SiteSettings }` → `{ site }` |
| GET | `/api/projects/{id}/site-structures` | `{ structures: SiteStructure[] }` |
| PUT | `/api/projects/{id}/site-structures` | `{ structures: SiteStructure[] }` → `{ structures }` |
| POST | `/api/projects/{id}/site-structures` | `{ kind, name?, ...partial }` → `{ structure }` |
| DELETE | `/api/site-structures/{structureId}` | `{ deleted: true }` |

**Mock store** (`mockStore.ts`):

- `getSiteSettings(projectId)` — lazy-init defaults if missing
- `getSiteStructures(projectId)`
- `setSiteStructures(projectId, next)`
- `createSiteStructure(projectId, input)`
- `deleteSiteStructure(structureId)`
- On project delete: cascade remove site data (same as connections)

**Client** (`api.ts`):

- `fetchSite(projectId)`
- `saveSiteSettings(...)`
- `fetchSiteStructures(projectId)`
- `saveSiteStructures(...)`
- `createSiteStructure(...)`
- `deleteSiteStructure(...)`

---

## UI plan

### Site plan editor (new)

New component: `frontend/src/components/planner/SitePlanEditor.tsx`

Entry point options (pick one for MVP):

- **A (recommended):** Tab on project page — `[ Floor plan | Site plan ]` above `FloorPlanEditor`
- **B:** Separate route `/projects/[projectId]/site`

**Modes** (toolbar, like `FloorPlanEditor` modes):

| Mode | Behavior |
|------|----------|
| `select` | Click to select; drag to move; handles to resize (buildings + driveway rects) |
| `add-driveway` | Click-drag rectangle on lot |
| `add-garage` | Click to place detached garage preset |
| `add-pole-barn` | Click to place pole barn preset |
| `add-shed` | Click to place shed preset |

**Canvas:**

- Light green lot boundary (`lotWidthFt` × `lotDepthFt`)
- Existing rooms drawn semi-transparent (reuse floor plan room rects + colors from `roomTypes`)
- Exterior doors shown as small ticks (reuse `ExteriorDoor` data)
- Site structures on top with distinct fills:

| Kind | Plan fill | Stroke |
|------|-----------|--------|
| Driveway | `#4b5563` | `#374151` |
| Detached garage | `#64748b` | `#475569` |
| Pole barn | `#78716c` | `#57534e` |
| Shed | `#a8a29e` | `#78716c` |

**Snapping:**

- Driveway: when placed near an `ExteriorDoor` on a garage or porch, snap closest edge to door center (reuse wall-side math from `pickExteriorWallAtPoint` in `homeLayout.ts`)
- Buildings: snap to 1 ft grid; optional snap to lot edge

**Side panel:** Selected structure properties — name, dimensions, height, material (driveway), door side (building), delete.

### Project page updates

`frontend/src/app/(protected)/projects/[projectId]/page.tsx`:

- Add tab or link to site plan
- Subtitle: “Arrange rooms and site features, then open in 3D”

### Whole-home 3D updates

`HomeScene.tsx` + `3d/page.tsx`:

1. Fetch site + structures alongside rooms
2. Render **lot ground** — large plane, muted green
3. Render **driveways** — thin extruded mesh (`y ≈ 0.04`), material color by `material`
4. Render **buildings** — box with walls (reuse `RoomVolume` patterns or a slim `SiteStructureMesh`)
5. Swap environment: `Environment preset="park"` or `"sunset"` when site structures exist
6. Expand grid / camera bounds via `computeSiteBounds`

### Opening a detached structure in the planner

Phase 3+: Link from site plan → `/planner/{projectId}/{linkedRoomId}`

When user clicks “Open in 3D” on a detached garage:

1. If no `linkedRoomId`, create a `Room` with `type: 'garage'`, dimensions from structure, `layoutX/Z` from structure center — store id on `SiteStructure.linkedRoomId`
2. Navigate to existing planner route

Attached house rooms unchanged.

---

## Implementation phases

### Phase 0 — Scaffold (1–2 days)

- [ ] Add types to `types/index.ts`
- [ ] Add `config/siteStructurePresets.ts`
- [ ] Add `lib/siteLayout.ts` (bounds, rectangle ↔ polygon helpers, snap to door)
- [ ] Extend `mockStore.ts` with site settings + structures
- [ ] Extend `mockApi.ts` with routes above
- [ ] Add BFF route files under `app/api/projects/[projectId]/site/` and `site-structures/`
- [ ] Add `api.ts` client functions
- [ ] Default site init when project is created (empty structures, 120×150 lot)

**Done when:** `curl` / browser can GET/PUT site data in dev.

---

### Phase 1 — Site plan editor MVP (3–5 days)

- [ ] `SitePlanEditor.tsx` — lot boundary, house footprint overlay, pan/zoom (match `FloorPlanEditor` UX)
- [ ] Add modes: select, add-driveway, add-detached-garage, add-shed
- [ ] Rectangle create / move / resize for all types
- [ ] Persist on change (React Query mutations, same pattern as connections)
- [ ] Tab on project detail page

**Done when:** You can place a driveway and a shed on the Kraenzlein project and refresh without losing data.

---

### Phase 2 — 3D site rendering (2–3 days)

- [ ] `SiteGround.tsx` — lot plane
- [ ] `DrivewayMesh.tsx` — polygon extrusion
- [ ] `SiteStructureMesh.tsx` — simple box buildings
- [ ] Wire into `HomeScene` + `3d/page.tsx`
- [ ] Legend entries for driveway / outbuilding

**Done when:** Whole-home 3D shows house + driveway + shed together.

---

### Phase 3 — Detached garage / pole barn depth (3–4 days)

- [ ] Rotation handle for buildings (`rotationY`)
- [ ] `doorSide` picker in side panel
- [ ] Pole barn preset (taller, wider defaults)
- [ ] `linkedRoomId` creation + “Open in 3D” button
- [ ] Optional: show garage door opening on 3D box (reuse exterior-door wall opening style)

**Done when:** Detached garage opens in room planner with empty floor for custom items.

---

### Phase 4 — Polish (ongoing)

- [ ] Driveway snap to exterior doors (garage + porch)
- [ ] Collision hint if building overlaps house footprint
- [ ] Duplicate / copy structure
- [ ] Undo for site edits (stretch goal)
- [ ] Preset: “Standard driveway to garage” one-click from garage door
- [ ] Lambda + DynamoDB persistence (when ready for prod)

---

## New files (expected)

```
frontend/src/
├── config/
│   └── siteStructurePresets.ts
├── lib/
│   └── siteLayout.ts
├── components/planner/
│   ├── SitePlanEditor.tsx
│   ├── SiteGround.tsx
│   ├── DrivewayMesh.tsx
│   └── SiteStructureMesh.tsx
└── app/api/projects/[projectId]/
    ├── site/route.ts
    └── site-structures/route.ts

docs/
└── EXTERIOR.md                    ← this file
```

---

## DynamoDB (when moving off mock)

Option A — **embed on project** (MVP):

```json
{
  "projectId": "...",
  "siteSettings": { "lotWidthFt": 120, "lotDepthFt": 150 },
  "siteStructures": [ ... ]
}
```

Option B — **`SiteStructures` table** with GSI `byProject` (better if structures grow large).

Recommend Option A until you hit size or query limits.

---

## Testing checklist (manual, dev)

1. Create project → site defaults appear (120×150 lot, empty structures)
2. Add driveway → reload → still there
3. Add detached garage + shed → move/resize → reload → geometry preserved
4. Whole-home 3D shows all features aligned with 2D plan
5. Delete shed → removed from 2D and 3D
6. Kraenzlein preset: place driveway snapped toward garage exterior doors
7. Open detached garage in planner → linked room created once, reused on second open

---

## Future (not v1)

- L-shaped / polyline driveways
- Walkways, patios, lawn zones
- Exterior catalog (trees, lights, fence segments)
- Material pricing ($/sq ft asphalt vs concrete)
- Import lot outline from survey / GIS
- Attached vs detached flag on existing house garage (already attached — no change)

---

## Quick reference: attached vs detached garage

| | Attached garage | Detached garage / pole barn |
|--|-----------------|-----------------------------|
| Model | `Room` (`type: 'garage'`) | `SiteStructure` (`kind: 'detached-garage' \| 'pole-barn'`) |
| Editor | Floor plan | Site plan |
| Connections | Door to house (`RoomConnection`) | None to house (optional walkway later) |
| 3D | Part of `HomeScene` room volumes | Separate mesh on lot; optional linked room for interior |

---

## Start here

1. Complete **Phase 0** scaffold (types, mock store, API routes).
2. Build **Phase 1** site tab with driveway + shed placement only.
3. Add **Phase 2** 3D so you can validate coordinates visually.
4. Then **Phase 3** for detached garage / pole barn + planner link.

Switch to Agent mode and ask to “implement Phase 0 exterior scaffold” when ready to code.
