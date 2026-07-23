# Home AI Tracker — Master Roadmap

Single backlog combining the **Home AI Tracker** Notion board with the exterior and ceilings development plans.

Related docs:

| Doc | Role |
|-----|------|
| [FINISHING_TOUCHES.md](./FINISHING_TOUCHES.md) | Exterior leftovers checklist |
| [AWS_SERVICES.md](./AWS_SERVICES.md) | Production AWS |

This file is the single roadmap for exterior, ceilings, and the Notion tracker items.

---

## Suggested build order

1. Close exterior leftovers (QA, docs, prod persistence when leaving mock)
2. **Ceilings** ✓ (Phases 0–3 MVP)
3. Quick UX: **Hide grid toggle** ✓
4. Site depth: **Fences** → **Breezeways** ✓ (MVP)
5. Product feel: **Presets** + **Materials / flooring FE** ✓ (MVP)
6. Bigger bets: **Export** ✓ · **Import plans** ✓ · **Stories** ✓ (incl. loft/attic partial) · Google Maps / lot import · Walkable rooms
7. **AI design coach** — **backend / Bedrock only. No AI on the frontend. Do not implement.**

---

## Notion board — all items

Status from Notion was empty; status below reflects codebase + docs as of 2026-07-22.

| # | Item | Status | Notes |
|---|------|--------|-------|
| — | **Exterior / site plan** (Part A) | Mostly done | Phases 0–4 built in mock; leftovers below |
| — | **Ceilings** (Part B) | **Done (MVP)** | Flat + cathedral; toggles; Kraenzlein vaulted living/dining |
| 1 | Fences | **Done (MVP)** | Draw fence runs; wood/vinyl/chain-link; 3D posts/rails |
| 2 | Breezeways | **Done (MVP)** | Draw or one-click house → garage/pole barn; 3D canopy |
| 3 | Google maps? | Not started | Lot context / GIS; related to lot import |
| 4 | Make it more life like | Partial (MVP) | Softer lighting + floor materials; more realism later |
| 5 | Export plan | **Done (MVP)** | SVG/PNG floor plan with room dims + house size; site later |
| 6 | More of the actual design of the product — flooring tile FE | **Done (MVP)** | Per-room floor finishes in 2D/3D + picker |
| 7 | Import house plans | **Done (MVP)** | Image underlay + scale + trace rooms; JSON layout import |
| 8 | Presets — modern, farmhouse, etc. | **Done (MVP)** | Style packs apply floors project-wide; Kraenzlein seeds farmhouse |
| 9 | Stand in the room, make it walkable | Not started | First-person / walkable camera |
| 10 | Stories (multi-level) | **Done (MVP)** | storyIndex + level switcher; loft/attic partial footprint |
| 10a | Second floor | **Done (MVP)** | Add upper / loft / attic; 3D Y stack |
| 10b | Basements | **Done (MVP)** | Add basement below grade; floor plan + 3D |
| 11 | Hide grid toggle | **Done** | Planner / whole-home 3D / floor plan / site plan |
| 12 | AI design coach | **Backend only — no FE** | Bedrock via Lambda later. **Do not implement any AI UI on the frontend.** |

---

# Part A — Exterior / site plan

> **v1 feature work is largely complete** in mock/dev. This section is the consolidated status + remaining work.

## Goals (shipped in mock)

| Feature | User can… |
|---------|-----------|
| **Driveway** | Draw / place paved area; move/resize; snap toward garage/porch doors; one-click “Driveway to garage” |
| **Detached garage / pole barn** | Place on lot; size, free 360° rotation, door side; open in 3D planner via linked room |
| **Shed** | Place small outbuilding; size + rotation; door |
| **Lot / roads** | Editable lot size; standard vs corner roads (28 ft); Site + home 3D toggle |

**Originally out of scope for exterior v1:** grading, landscaping catalog, fencing, pools, permit/export, exterior material pricing.

## Architecture (current)

```
Project
├── House layer     ← Rooms, connections, exterior doors
└── Site layer      ← SiteSettings + SiteStructure[]
      ├── Lot, roads, house offset
      └── Driveways, detached-garage, pole-barn, shed
```

Detached buildings are **`SiteStructure`**, not `Room`. Opening one in 3D creates a linked planner room (`linkedRoomId` ↔ `linkedSiteStructureId`).

Key files:

| Area | Path |
|------|------|
| Site editor | `frontend/src/components/planner/SitePlanEditor.tsx` |
| Site 3D | `SiteSceneLayer.tsx`, `HomeScene.tsx` |
| Layout math | `frontend/src/lib/siteLayout.ts`, `siteRoads.ts` |
| Presets | `frontend/src/config/siteStructurePresets.ts` |
| Mock / API | `mockStore.ts`, `mockApi.ts`, `api.ts` |

## Exterior phases — status

### Phase 0 — Scaffold — done
Types, presets, `siteLayout`, mock store/API, BFF routes, default lot init.

### Phase 1 — Site plan editor MVP — done
Lot boundary, house overlay, pan/zoom/rotate view, add driveway/buildings, move/resize, project page tab.

### Phase 2 — 3D site rendering — done
Lot ground, driveways, building boxes, Site + home toggle, expanded camera/grid bounds.

### Phase 3 — Detached building depth — done
Rotation (free 360°), door side, pole barn preset, “Open in 3D planner”, door mesh on 3D box.

### Phase 4 — Polish — mostly done
- [x] Driveway snap to exterior doors
- [x] Collision hint if building overlaps house
- [x] Duplicate / copy structure
- [x] One-click “Driveway to garage”
- [ ] Undo for site edits (stretch)
- [ ] Lambda + DynamoDB persistence

## Exterior leftovers (do before calling exterior “shipped”)

- [ ] Manual QA pass (see [FINISHING_TOUCHES.md](./FINISHING_TOUCHES.md))
- [ ] Undo for site edits
- [ ] Production persistence (DynamoDB Option A embed on project, or SiteStructures table)
- [ ] Optional: toast when driveway-to-garage has no door; sync linked room rotation; 3D overlap hint

## Exterior future (post v1) — overlaps Notion

- [ ] L-shaped / polyline driveways
- [ ] Walkways, patios, lawn zones
- [x] **Fences** (MVP) — polyline/gates still future
- [x] **Breezeways** (MVP) — refined attach still future
- [ ] Trees / lights — exterior catalog
- [ ] Material pricing ($/sq ft asphalt vs concrete)
- [ ] Import lot outline / **Google Maps?** GIS
- [ ] Snap garage door to driveway (reverse snap)

---

# Part B — Ceilings

> **MVP shipped** (mock/dev). Walls stay at eave height; cathedral is separate geometry.

## Goals

| Feature | User can… |
|---------|-----------|
| **Flat ceiling** | See a horizontal ceiling at wall height |
| **Cathedral ceiling** | Peaked/vaulted ceiling; ridge along width or depth |
| **Per-room control** | Set type + heights in room settings |
| **Toggle visibility** | Show/hide ceilings in 3D (like wall toggle) |

**Out of scope for ceilings v1:** tray, coffered, exposed beams, roof-pitch match, skylights, texture picker, soffits.

## Current state

Rooms render **floor + walls only**. `room.heightFt` = wall height. Kraenzlein “vaulted” rooms today just use taller flat walls (10 ft), not true cathedral geometry.

## Design decisions (summary)

1. Ceiling type is **per-room** on `Room`
2. Cathedral: `heightFt` = eave; `peakHeightFt` = ridge; `ridgeAxis` = `'width' | 'depth'`
3. Recommended: ceilings **on** in room planner, **off** in whole-home 3D by default
4. Open connections do **not** cut the ceiling in v1

## Data model

```typescript
export type CeilingType = 'flat' | 'cathedral';
export type RidgeAxis = 'width' | 'depth';

// On Room:
ceilingType?: CeilingType;      // default 'flat'
peakHeightFt?: number;          // cathedral only; > heightFt
ridgeAxis?: RidgeAxis;          // default 'width'
```

Validation: cathedral requires `peakHeightFt >= heightFt + 1`.

## Ceilings phases

### Phase 0 — Types & geometry — done
- [x] Ceiling fields on `Room`
- [x] `lib/ceilingGeometry.ts` + vitest (`npm test`)

### Phase 1 — Flat ceiling MVP — done
- [x] `RoomCeiling.tsx` + planner toggle (default on)
- [x] Omitted `ceilingType` treated as flat

### Phase 2 — Cathedral — done
- [x] Sloped mesh + settings UI (floor plan + planner)
- [x] Tall fixtures capped via `ceilingHeightAt` at placement
- [x] Whole-home toggle (default off)

### Phase 3 — Presets & polish — mostly done
- [x] Kraenzlein living/dining → cathedral (9 ft eave / 12 ft peak)
- [ ] Room type defaults in `roomTypes.ts` (optional)
- [ ] Lambda field pass-through when doing backend parity
- [ ] Further opacity / z-fighting polish if needed

### Ceilings future (not v1)
- Tray / coffered; beams; skylights; ceiling lighting; match ridge to exterior roof; cut ceiling at open great-room connections

---

# Part C — Notion features (detail)

Items from the Home AI Tracker board that are **not** fully covered by exterior/ceilings plans.

## 1. Fences — **done (MVP)**
- [x] `SiteStructureKind: 'fence'` — thin run (line drag)
- [x] Styles: wood / vinyl / chain-link
- [x] 2D site plan + 3D posts/rails
- [ ] Later: multi-segment polylines, gates, lot-edge snap

## 2. Breezeways — **done (MVP)**
- [x] `SiteStructureKind: 'breezeway'` — covered walk footprint (not a linked room)
- [x] Draw on plan or **Breezeway to garage** one-click
- [x] 3D floor + columns + roof
- [ ] Later: auto-attach ends to doors, open-air vs enclosed

## 3. Google maps?
- [ ] Spike: embed map for lot context vs import parcel outline
- [ ] Align with “import lot outline from survey / GIS” (exterior future)
- [ ] Privacy / API key / cost considerations

## 4. Make it more life like — **partial (MVP)**
- [x] Soft lighting (hemisphere + warm/cool key fill) in room + whole-home
- [x] Floor materials by finish (color/roughness) in 2D tint + 3D
- [ ] Better wall / site materials beyond floors
- [ ] Less “CAD box” feel (textures, trim, landscaping)
- [x] Overlaps materials/flooring work (#6)

## 5. Export plan — **done (MVP)**
- [x] Export floor plan as SVG + PNG (project page → Export plan)
- [x] House size (footprint W × D), total area, room count
- [x] Per-room measurements on plan + room schedule (W × D, sq ft)
- [ ] Optional: include site plan layer
- [ ] Optional: PDF / print stylesheet

## 6. Flooring / tile / product design FE — **done (MVP)**
- [x] Floor material types (oak, walnut, ceramic, marble, carpet, LVP, concrete)
- [x] Visual preview in 2D plan tint + 3D `RoomFloor`
- [x] Per-room finish picker (floor plan panel + room planner)
- [ ] Broader “actual product design” UI polish / textured floors

## 7. Import house plans — **done (MVP)**
- [x] Research spike: manual assist (image underlay + trace) — **no ML / no AI FE**
- [x] Scale calibration (two points + known length in feet)
- [x] Trace rectangles → `createRoom` on current project
- [x] JSON layout import (rooms + optional connections)
- [ ] Later: PDF page rasterize (pdf.js); auto-detect walls (out of scope)

## 8. Presets — modern, farmhouse, etc. — **done (MVP)**
- [x] Style pack concept (materials defaults: modern / farmhouse / coastal / industrial)
- [x] Apply pack to existing project (project page → flooring on all rooms)
- [x] New rooms inherit active pack; Kraenzlein / floor-plan presets seed farmhouse
- [ ] Later: pack also sets fixtures / wall colors; more layout presets beyond Kraenzlein

## 9. Stand in the room / walkable
- [ ] First-person or walk mode camera in planner / whole-home
- [ ] Collision with walls; eye-height camera
- [ ] Toggle with existing orbit view

## 10. Stories (multi-level) — **done (MVP)**

Shared XZ origin across levels. A story can be a **full floor plate** (main / upper / basement) or a **partial footprint** (loft / attic) that only covers part of the house.

### Shared model (build once)
- [x] `storyIndex` on rooms (`-1` basement, `0` main, `1+` upper/loft/attic)
- [x] Project `stories[]` with kind + `partialFootprint` + default height
- [x] Floor plan **level switcher**; ghost main outline under partial / non-main levels
- [ ] Stairs / vertical connections between stories (deferred)
- [x] Whole-home 3D: stack by story heights; focus one level at a time
- [x] Site plan footprint = **main** story only (lofts don’t enlarge the lot pad)

### 10a. Second floor / loft / attic
- [x] Add / remove upper, loft, or attic
- [x] Place rooms on that story (partial OK); ghost main for alignment
- [x] 3D Y offset by stacked story heights
- [ ] Ceiling / roof relationship beyond simple stack (later)

### 10b. Basements
- [x] Add basement below main
- [x] Floor plan editor for basement level
- [x] 3D below grade (`Y` negative)
- [ ] Stair mesh / cutaway ground (later)

## 11. Hide grid toggle — **done**
- [x] Toggle in `PlannerScene` + `HomeScene` (`GridToggleButton`)
- [x] Toggle on floor plan + site plan toolbars

## 12. AI design coach — **backend only (no frontend AI)**

**Rule: do not implement any AI assistant UI, chat, or Bedrock calls in the frontend.** This is a future backend item only ([AWS_SERVICES.md](./AWS_SERVICES.md) Phase 4).

**Backend (future):**
- [ ] Lambda + IAM: `bedrock:InvokeModel`
- [ ] Auth’d API route (e.g. `POST /assistant/chat`) with project context
- [ ] Model ID / region via env; logging + cost guards

**Frontend:** out of scope until explicitly reopened.

---

# Part D — Platform / prod (cross-cutting)

From AWS + finishing touches — required when leaving mock-only:

- [ ] Persist site settings + structures in DynamoDB
- [ ] Persist connections + exterior doors if still mock-only
- [ ] Ceiling fields on room PUT in Lambda
- [ ] Amazon Bedrock for Home AI assistant (backend only; FE deferred — see §12)
- [ ] S3 + CloudFront for catalog GLB assets
- [ ] Optional: WAF, split `homeaiApi` Lambda by domain

---

## How to use this file

1. Treat this as the **single status board** for product work.
2. Check boxes as work ships; update the Notion status column to match.
3. When starting a track, switch to Agent mode and ask to implement the next unchecked phase (e.g. “implement Ceilings Phase 0”).

*Created: 2026-07-22 — combines Notion Home AI Tracker + former EXTERIOR.md + CEILINGS.md (those files removed).*
