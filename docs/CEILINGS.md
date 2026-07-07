# Ceilings — Development Plan

Plan for adding **visible ceilings** to interior rooms, supporting **flat** and **cathedral** (vaulted) styles. Written for dev-mode work (mock API first). Complements the open-top rendering described in the current 3D scenes.

Related: [EXTERIOR.md](./EXTERIOR.md) (site/outbuildings), [AWS_SERVICES.md](./AWS_SERVICES.md) (production).

---

## Goals

| Feature | User can… |
|---------|-----------|
| **Flat ceiling** | See a horizontal ceiling plane at the room’s wall height |
| **Cathedral ceiling** | See a peaked/vaulted ceiling with a ridge running along width or depth |
| **Per-room control** | Set ceiling type and heights in room settings (planner + floor plan panel) |
| **Toggle visibility** | Show/hide ceilings in 3D (like existing wall toggle) |

**Out of scope for v1:** tray ceilings, coffered panels, exposed beams, sloped ceilings following roof pitch, ceiling openings/skylights, texture/material picker, soffits above cabinets.

---

## Current state

Rooms render **floor + walls only** — no ceiling mesh. The scene is open at the top for a top-down planning view.

| Component | What it renders |
|-----------|-----------------|
| `PlannerScene.tsx` | Grid floor, `RoomConnectionWalls`, placements |
| `HomeScene.tsx` | Thin floor box per room, walls, placements |
| `RoomConnectionWalls.tsx` | Wall segments up to `room.heightFt` |

`room.heightFt` today means **wall height** and **effective ceiling** for tall fixtures:

```38:41:frontend/src/lib/placementHeight.ts
/** Visual / collision height capped to room ceiling for tall fixtures (showers, etc.). */
export function effectiveItemHeightFt(item: CatalogItem, roomHeightFt: number): number {
  const catalogHeightFt = item.heightIn / INCHES_PER_FOOT;
  return Math.min(catalogHeightFt, roomHeightFt);
```

The Kraenzlein preset already uses a taller `heightFt` (10 ft) for living/dining — that raises **walls**, not a vaulted ceiling shape:

```41:41:frontend/src/data/floorPlanPresets/kraenzlein-7629.ts
const VAULTED = archFt(10);
```

After this work, vaulted rooms should use **9 ft eave walls + peaked ceiling geometry**, not just taller flat walls.

---

## Design decisions

### 1. Ceiling type is per-room

Store on `Room` (not project-wide). Open connections between rooms may show mismatched ceiling heights at boundaries — acceptable for v1; clip or blend later.

### 2. Separate wall height from peak height (cathedral)

For **flat** ceilings, keep today’s behavior: one number `heightFt` = wall top = ceiling.

For **cathedral** ceilings:

| Field | Meaning |
|-------|---------|
| `heightFt` | **Eave height** — wall top at the room perimeter (default 9 ft) |
| `peakHeightFt` | **Ridge height** at the center line (must be > `heightFt`) |
| `ridgeAxis` | `'width'` \| `'depth'` — direction the ridge runs |

Example: 16×20 ft living room, eaves 9 ft, peak 12 ft, ridge along width → ceiling rises from 9 ft at front/back walls to 12 ft along the center line.

### 3. Default: flat, hidden in 3D (optional)

Two rollout options — pick one at implementation:

- **A (recommended):** Ceilings **on by default** in room planner; **off by default** in whole-home 3D (keeps overview readable). User toggles with button.
- **B:** Ceilings off by default everywhere until user enables.

Match the existing `WallToggleButton` pattern → add `CeilingToggleButton` or combine into “Show shell”.

### 4. Openings do not cut the ceiling in v1

Rooms with `open` connections (great room) still get a full ceiling mesh per room. Overlapping ceiling planes at open boundaries are acceptable initially.

---

## Data model

Extend `Room` in `frontend/src/types/index.ts`:

```typescript
export type CeilingType = 'flat' | 'cathedral';

export type RidgeAxis = 'width' | 'depth';

export interface Room {
  // ... existing fields ...
  heightFt: number;
  /** Default 'flat'. Cathedral uses heightFt as eave height. */
  ceilingType?: CeilingType;
  /** Required when ceilingType === 'cathedral'. Must be > heightFt. */
  peakHeightFt?: number;
  /** Ridge line direction. Default 'width' (ridge parallel to room width). */
  ridgeAxis?: RidgeAxis;
}
```

**Defaults when omitted:**

```typescript
ceilingType: 'flat'
peakHeightFt: undefined  // ignored for flat
ridgeAxis: 'width'
```

**Validation rules:**

- Flat: `peakHeightFt` ignored; `heightFt` unchanged semantics
- Cathedral: `peakHeightFt >= heightFt + 1` (minimum 1 ft rise)
- Cathedral: recommend cap `peakHeightFt <= heightFt + depthFt` (sanity check, not hard limit)

**Backend records:** Add optional fields to `RoomRecord` in `backend/amplify/functions/homeaiApi/lib/types.ts` when syncing Lambda (same optional pattern as `layoutX`).

**Room type presets** (`config/roomTypes.ts`): Suggest defaults per type:

| Room type | Suggested default |
|-----------|-------------------|
| living, dining, master-bedroom | `cathedral`, peak = eave + 3 ft, ridge `width` |
| kitchen, bathroom, hallway, closet | `flat` |
| garage, porch, utility | `flat` (or no ceiling in 3D for porch — stretch) |

Kraenzlein living/dining: migrate from `heightFt: VAULTED` to `heightFt: 9`, `ceilingType: 'cathedral'`, `peakHeightFt: 10`, `ridgeAxis: 'width'`.

---

## Ceiling geometry

New module: `frontend/src/lib/ceilingGeometry.ts`

### Flat ceiling

Single horizontal `planeGeometry` (or thin box):

- Size: `widthFt × depthFt`
- Y position: `heightFt - ε` (slightly below wall top to avoid z-fighting)
- Normal: down (−Y) for optional back-face culling when camera is inside

### Cathedral ceiling

Two sloped planes meeting at a ridge. For ridge along **width** (ridge parallel to X, room depth is Z):

```
        peak (peakHeightFt)
       /                    \
      /                      \
eave /                        \ eave
    back (z=0)            front (z=depthFt)
    heightFt                heightFt
```

**Implementation (MVP):** Two `BufferGeometry` triangles or one `Shape` extruded to zero depth — each half-room is a quad from eave edge to ridge line.

```typescript
export interface CeilingSpec {
  type: CeilingType;
  widthFt: number;
  depthFt: number;
  eaveHeightFt: number;
  peakHeightFt: number;
  ridgeAxis: RidgeAxis;
}

export function buildCeilingSpec(room: Room): CeilingSpec;
export function ceilingHeightAt(room: Room, x: number, z: number): number;
```

`ceilingHeightAt(x, z)` returns the ceiling Y at a floor point — used for placement capping and collision.

### Wall alignment

Cathedral rooms: **walls stay at eave height** (`heightFt`), not peak. Wall tops are horizontal; the ceiling rises above them toward the ridge. This matches real construction (vertical gable ends or short knee walls are v2).

---

## 3D rendering

New component: `frontend/src/components/planner/RoomCeiling.tsx`

```tsx
<RoomCeiling
  room={room}
  visible={showCeilings}
  color="#f5f5f4"
  opacity={0.85}
/>
```

| Prop | Notes |
|------|-------|
| `room` | Dimensions + ceiling fields |
| `visible` | Toggle from UI |
| `color` | Off-white; match wall palette |
| `opacity` | Slight transparency helps see placements near ceiling |

**Wire into:**

| Scene | Location |
|-------|----------|
| `PlannerScene.tsx` | After walls, before or after placements (after = placements poke through if taller — prefer **after walls, before placements** for flat; cathedral may need placement clip) |
| `HomeScene.tsx` | Inside `RoomVolume`, same order |

**Materials:** `meshStandardMaterial` with `side: THREE.DoubleSide` so underside visible when camera is above. `raycast={() => null}` — ceilings are not interactive.

**Toggle UI:** Extend `WallToggleButton` → `ShellToggleButton` with walls + ceilings, or add sibling `CeilingToggleButton` next to it in `PlannerScene` and `HomeScene`.

---

## Placement & collision updates

Replace uses of `room.heightFt` as ceiling limit with **`ceilingHeightAt(room, x, z)`** at the placement’s floor position.

Files to update:

| File | Change |
|------|--------|
| `lib/placementHeight.ts` | `effectiveItemHeightFt(item, room, x?, z?)` uses min(catalog, ceiling at point) |
| `components/planner/CatalogItemMesh.tsx` | Pass placement position for cathedral cap |
| `components/planner/PlacementMesh.tsx` | Same |
| `components/planner/placementCollision.ts` | Optional: warn if item top exceeds local ceiling (soft validation) |

For flat rooms, behavior is unchanged. For cathedral, a shower at the ridge gets more headroom than one at the eave wall — correct behavior.

---

## UI / settings

### Room settings panel

Extend `RoomSettingsPanel.tsx` (used in planner sidebar):

1. **Ceiling type** — radio or select: Flat | Cathedral
2. When **Flat** — existing height field = wall + ceiling height (unchanged label)
3. When **Cathedral**:
   - **Eave height** — maps to `heightFt` (rename label from “Height” when cathedral selected)
   - **Peak height** — `peakHeightFt`
   - **Ridge direction** — Width | Depth (maps to `ridgeAxis`)

Show helper text: *“Cathedral: walls stop at eave height; ceiling peaks at ridge.”*

### Floor plan room panel

Optional v1: ceiling type badge on selected room in `FloorPlanRoomPanel.tsx`. Full editing can stay in planner only.

### 3D preview hint

Small cross-section sketch in settings (2D SVG) showing flat vs cathedral — stretch goal.

---

## API & persistence

Ceiling fields ride on existing room PUT — no new routes.

**Client** (`api.ts`): Extend room patch type:

```typescript
Partial<Pick<Room, 'name' | 'type' | 'widthFt' | 'depthFt' | 'heightFt' | 'layoutX' | 'layoutZ' | 'ceilingType' | 'peakHeightFt' | 'ridgeAxis'>>
```

**Mock** (`mockStore.ts` `updateRoom`): Merge new fields; validate cathedral peak > eave.

**Mock API** (`mockApi.ts`): Pass through on room PUT.

**Lambda** (`handler.ts` `handleRooms` PUT): Add optional `ceilingType`, `peakHeightFt`, `ridgeAxis` when implementing backend parity.

**Presets** (`floorPlanPresets.ts`, `kraenzlein-7629.ts`): Add optional `ceilingType`, `peakHeightFt`, `ridgeAxis` on `FloorPlanPresetRoomDef`.

---

## Implementation phases

### Phase 0 — Types & geometry (1 day)

- [ ] Add ceiling fields to `Room` type
- [ ] Add `lib/ceilingGeometry.ts` — `buildCeilingSpec`, `ceilingHeightAt`, flat + cathedral mesh builders (return vertices or Three.js geometry helpers)
- [ ] Unit-test `ceilingHeightAt` for flat and cathedral corners/ridge

**Done when:** Pure functions return correct Y at eave, peak, and mid-slope points.

---

### Phase 1 — Flat ceiling MVP (1–2 days)

- [ ] `RoomCeiling.tsx` — flat plane only
- [ ] Wire into `PlannerScene.tsx` with toggle (default on in planner)
- [ ] Default `ceilingType: 'flat'` for all existing rooms (no migration needed)

**Done when:** Room planner shows flat ceiling at `heightFt`; toggle hides it.

---

### Phase 2 — Cathedral ceiling (2–3 days)

- [ ] Cathedral mesh in `RoomCeiling.tsx` (two sloped planes)
- [ ] Room settings UI for type, eave, peak, ridge axis
- [ ] Update `placementHeight.ts` + mesh capping for cathedral
- [ ] Wire into `HomeScene.tsx` with toggle (default off in whole-home view)

**Done when:** Living room with cathedral reads correctly in planner and whole-home 3D.

---

### Phase 3 — Presets & polish (1–2 days)

- [ ] Update Kraenzlein living/dining to cathedral model
- [ ] Room type defaults in `roomTypes.ts`
- [ ] Lambda field pass-through (when doing backend parity)
- [ ] Opacity / color tuning; avoid z-fighting with wall tops

**Done when:** Kraenzlein demo shows vaulted living/dining without 10 ft flat walls.

---

## New files (expected)

```
frontend/src/
├── lib/
│   └── ceilingGeometry.ts
├── components/planner/
│   ├── RoomCeiling.tsx
│   └── CeilingToggleButton.tsx   (or extend WallToggleButton)
└── lib/__tests__/
    └── ceilingGeometry.test.ts   (when test script exists)

docs/
└── CEILINGS.md                   ← this file
```

---

## Visual reference

### Flat

```
        ┌─────────────────┐  ← ceiling at heightFt
        │                 │
        │     room        │
        │                 │
        └─────────────────┘  ← floor y=0
```

### Cathedral (ridge along width)

```
              ∧  peakHeightFt
             / \
            /   \
           /     \
          / room  \
         /         \
        └───────────┘  ← eave heightFt at walls
```

---

## Edge cases

| Case | v1 behavior |
|------|-------------|
| Open connection between flat 9 ft and cathedral 9/12 ft | Each room renders its own ceiling; slight overlap at boundary OK |
| Room height lowered below existing peak | Validate on save; reject if `peakHeightFt <= heightFt` |
| Very small room | Minimum peak rise 1 ft |
| Porch / exterior room types | Flat ceiling or skip ceiling mesh (porch open to sky) |
| Camera above ceiling | Double-sided material; toggle off if clipping annoys |
| Wall cabinet placement | Still uses wall surfaces; ceiling type does not affect wall mount height |

---

## Testing checklist (manual, dev)

1. Flat room at 9 ft — ceiling visible, toggle works
2. Switch to cathedral, eave 9 ft, peak 12 ft, ridge width — sloped ceiling visible from inside
3. Flip ridge to depth — peak line rotates 90°
4. Tall shower at eave wall — capped at ~9 ft
5. Same shower moved to ridge — can render taller (up to catalog height capped at peak)
6. Save/reload — ceiling settings persist (mock)
7. Whole-home 3D — multiple rooms with mixed flat/cathedral
8. Kraenzlein living room — cathedral matches intent (not flat 10 ft walls)

---

## Future (not v1)

- Tray / coffered ceiling types
- Exposed beam catalog items attached to ceiling
- Skylight openings in ceiling mesh
- Ceiling-aware lighting (dimmer under lower eaves)
- Match cathedral ridge to roof pitch on exterior/site plan
- Auto cathedral for rooms tagged `vaulted` in blueprints
- Cut ceiling at open connections for single continuous great-room volume

---

## Quick reference: flat vs cathedral fields

| | Flat | Cathedral |
|--|------|-----------|
| `ceilingType` | `'flat'` | `'cathedral'` |
| `heightFt` | Wall + ceiling height | **Eave** height (wall top) |
| `peakHeightFt` | — | Ridge height (required) |
| `ridgeAxis` | — | `'width'` or `'depth'` |
| Wall mesh height | `heightFt` | `heightFt` (eave) |
| Ceiling mesh | Horizontal plane | Two sloped planes |

---

## Start here

1. **Phase 0** — types + `ceilingGeometry.ts` with tests
2. **Phase 1** — flat `RoomCeiling` in room planner only
3. **Phase 2** — cathedral + settings UI + placement capping
4. **Phase 3** — Kraenzlein preset + whole-home 3D

Switch to Agent mode and ask to “implement Phase 0 ceilings scaffold” when ready to code.
