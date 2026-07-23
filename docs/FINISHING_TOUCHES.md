# Finishing Touches — Remaining Work

Living changelog for work **not yet done** after the site/exterior v1 build (Phases 0–4). Check items off as you ship them.

Related plans: [HOME_AI_TRACKER.md](./HOME_AI_TRACKER.md) · [AWS_SERVICES.md](./AWS_SERVICES.md)

---

## Exterior / site plan — v1 leftovers

These were in Phase 4 but intentionally deferred.

- [ ] **Undo for site edits** — revert last move, resize, rotate, add, or delete (stretch goal; no history stack today)
- [ ] **Production persistence** — site settings + structures in Lambda/DynamoDB (still mock-only via `mockStore.ts` / `mockApi.ts`)
  - [ ] Extend DynamoDB project record (Option A embed on project — see HOME_AI_TRACKER) or add `SiteStructures` table
  - [ ] Add API Gateway routes: `GET/PUT /projects/{id}/site`, site-structures CRUD, `POST …/link-room`
  - [ ] Wire BFF routes to real backend when `DEV_SKIP_AUTH` is off
  - [ ] Cascade delete site data on project delete

---

## Exterior — docs & QA

- [ ] **Manual test pass** (dev, Kraenzlein or similar project):
  - [ ] Create project → default lot (120×150) loads
  - [ ] Add driveway → reload → persisted
  - [ ] **Driveway to garage** one-click → aligned to garage door
  - [ ] Move driveway near garage door → snaps on release
  - [ ] Detached garage / pole barn / shed → move, resize, rotate (any angle) → reload → preserved
  - [ ] Overlap warning when outbuilding crosses house footprint
  - [ ] Duplicate structure → copy offset from original
  - [ ] **Open in 3D planner** on outbuilding → linked room created once, reused on second open
  - [ ] Whole-home 3D **Site + home** → lot, roads, driveway, buildings match 2D plan
  - [ ] Delete outbuilding with linked room → interior room removed too

---

## Exterior — future (post v1)

From HOME_AI_TRACKER exterior future — not required for first ship.

- [ ] L-shaped / polyline driveways (polygon schema already supports more than 4 points)
- [ ] Walkways, patios, lawn zones
- [ ] Exterior catalog (trees, lights, fence segments)
- [ ] Material pricing ($/sq ft asphalt vs concrete)
- [ ] Import lot outline from survey / GIS
- [ ] Driveway rotation in 2D (3D supports `rotationY`; editor uses axis-aligned rects for driveways)
- [ ] Snap detached garage door to driveway (reverse of current garage-door snap)
- [ ] Walkway connection from house porch to detached structure

---

## Optional refactors (nice, not blocking)

- [ ] Split `SiteSceneLayer.tsx` into planned `SiteGround.tsx`, `DrivewayMesh.tsx`, `SiteStructureMesh.tsx` (behavior exists; files were consolidated)
- [ ] Toast instead of silent disable when **Driveway to garage** has no target door
- [ ] Overlap hint in whole-home 3D view (2D plan only today)
- [ ] Sync linked planner room **rotation** when outbuilding rotates on site plan

---

## Ceilings feature (separate track)

Full plan in [HOME_AI_TRACKER.md](./HOME_AI_TRACKER.md) Part B. Not started.

- [ ] Phase 0 — types, mock store, API, presets
- [ ] Phase 1 — room ceiling fields in floor plan / room panel
- [ ] Phase 2 — flat ceiling mesh in `PlannerScene` + `HomeScene`
- [ ] Phase 3 — cathedral / vaulted geometry
- [ ] Phase 4 — toggle, polish, prod persistence

---

## AWS / platform (cross-cutting)

From [AWS_SERVICES.md](./AWS_SERVICES.md) — beyond site data.

- [ ] Persist **connections** and **exterior doors** in DynamoDB (if still mock-only)
- [ ] S3 + CloudFront for catalog GLB assets (Phase 5)
- [ ] WAF / rate limiting on API Gateway (optional)
- [ ] Split monolithic `homeaiApi` Lambda by domain when route count grows

---

## How to use this file

1. Pick a section and check off items as they ship.
2. Add new rows under the right heading when scope grows.
3. When a section is empty, add a one-line “Done as of YYYY-MM-DD” note or remove the section.

*Last updated: 2026-07-06 — after exterior Phases 0–4 (mock dev).*
