'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createSiteStructure,
  deleteSiteStructure,
  fetchExteriorDoors,
  fetchSite,
  saveSiteSettings,
  saveSiteStructures,
} from '@/lib/api';
import { roomPlanFill } from '@/config/roomTypes';
import {
  BUILDING_SIZE_OPTIONS,
  isBuildingKind,
  SITE_STRUCTURE_PRESETS,
  type SiteStructurePreset,
} from '@/config/siteStructurePresets';
import {
  computeSiteBounds,
  moveStructure,
  snapSiteFt,
  structureBounds,
  updateStructureRect,
} from '@/lib/siteLayout';
import type { Room, SiteCorner, SiteRoadSide, SiteSettings, SiteStructure, SiteStructureKind } from '@/types';
import { formatFeetInchesPair } from '@/lib/imperialDimensions';
import {
  CORNER_ROAD_SIDES,
  computeRoadSegments,
  cornerFromRoadSides,
  DEFAULT_ROAD_WIDTH_FT,
  isCornerLot,
  normalizeRoadSides,
  roadSidesLabel,
} from '@/lib/siteRoads';

const PLAN_SCALE = 6;
const PLAN_PAD_FT = 12;
const MIN_RECT_FT = 4;
const MIN_LOT_FT = 20;
const VIEWPORT_W = 900;
const VIEWPORT_H = 560;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 4;
const PAN_DRAG_THRESHOLD_PX = 5;

type SiteMode =
  | 'select'
  | 'pan'
  | 'add-driveway'
  | 'add-detached-garage'
  | 'add-pole-barn'
  | 'add-shed';

type DraftRect = { x1: number; z1: number; x2: number; z2: number };

type PendingBuildingSize = { widthFt: number; depthFt: number; heightFt: number };

type DragKind =
  | { type: 'move'; structureId: string; startX: number; startZ: number; origCenterX: number; origCenterZ: number }
  | { type: 'resize'; structureId: string; corner: 'se' | 'sw' | 'ne' | 'nw'; anchorMinX: number; anchorMinZ: number; anchorMaxX: number; anchorMaxZ: number };

function clampBuildingFt(value: number, min = MIN_RECT_FT) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.round(value));
}

function modeToBuildingKind(mode: SiteMode): SiteStructureKind | null {
  if (mode === 'add-detached-garage') return 'detached-garage';
  if (mode === 'add-pole-barn') return 'pole-barn';
  if (mode === 'add-shed') return 'shed';
  return null;
}

function isBuildingAddMode(mode: SiteMode) {
  return modeToBuildingKind(mode) !== null;
}

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

function shouldBeginPan(e: React.PointerEvent, mode: SiteMode, spacePressed: boolean) {
  if (e.button === 1 || e.button === 2) return true;
  if (spacePressed && e.button === 0) return true;
  if (mode === 'pan' && e.button === 0) return true;
  return false;
}

export function SitePlanEditor({
  projectId,
  rooms,
}: {
  projectId: string;
  rooms: Room[];
}) {
  const queryClient = useQueryClient();
  const svgRef = useRef<SVGSVGElement>(null);
  const worldRef = useRef<SVGGElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<SiteMode>('select');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftRect, setDraftRect] = useState<DraftRect | null>(null);
  const [drag, setDrag] = useState<DragKind | null>(null);
  const [localStructures, setLocalStructures] = useState<SiteStructure[] | null>(null);
  const [pendingBuildingSize, setPendingBuildingSize] = useState<PendingBuildingSize | null>(null);

  const [viewZoom, setViewZoom] = useState(1);
  const [viewRotation, setViewRotation] = useState(0);
  const [viewPan, setViewPan] = useState({ x: 0, y: 0 });
  const [viewPanDrag, setViewPanDrag] = useState<{
    startClientX: number;
    startClientY: number;
    origPanX: number;
    origPanY: number;
  } | null>(null);
  const [panPending, setPanPending] = useState<{
    startClientX: number;
    startClientY: number;
    origPanX: number;
    origPanY: number;
  } | null>(null);
  const [spacePressed, setSpacePressed] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement)) {
        e.preventDefault();
        setSpacePressed(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpacePressed(false);
    };
    const onBlur = () => setSpacePressed(false);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  const siteQuery = useQuery({
    queryKey: ['site', projectId],
    queryFn: () => fetchSite(projectId),
  });

  const exteriorDoorsQuery = useQuery({
    queryKey: ['exterior-doors', projectId],
    queryFn: () => fetchExteriorDoors(projectId),
  });

  const site = siteQuery.data?.site;
  const committedStructures = siteQuery.data?.structures ?? [];
  const structures = localStructures ?? committedStructures;
  const exteriorDoors = exteriorDoorsQuery.data ?? [];

  const bounds = useMemo(() => {
    if (!site) {
      return computeSiteBounds(
        { projectId, lotWidthFt: 120, lotDepthFt: 150 },
        rooms,
        structures,
      );
    }
    return computeSiteBounds(site, rooms, structures);
  }, [site, rooms, structures, projectId]);

  const planOriginX = bounds.minX - PLAN_PAD_FT;
  const planOriginZ = bounds.minZ - PLAN_PAD_FT;
  const planTransform = `translate(${-planOriginX * PLAN_SCALE}, ${-planOriginZ * PLAN_SCALE})`;

  const lotCenterPx = useMemo(() => {
    const ox = site?.houseOffsetX ?? 0;
    const oz = site?.houseOffsetZ ?? 0;
    const lw = site?.lotWidthFt ?? 120;
    const ld = site?.lotDepthFt ?? 150;
    return {
      x: (ox + lw / 2) * PLAN_SCALE,
      z: (oz + ld / 2) * PLAN_SCALE,
    };
  }, [site]);

  const selected = structures.find((s) => s.structureId === selectedId) ?? null;

  const saveMutation = useMutation({
    mutationFn: (next: SiteStructure[]) => saveSiteStructures(projectId, next),
    onSuccess: (saved) => {
      queryClient.setQueryData(['site', projectId], (prev: Awaited<ReturnType<typeof fetchSite>> | undefined) =>
        prev ? { ...prev, structures: saved } : prev,
      );
      setLocalStructures(null);
    },
  });

  const createMutation = useMutation({
    mutationFn: (input: Parameters<typeof createSiteStructure>[1]) =>
      createSiteStructure(projectId, input),
    onSuccess: (structure) => {
      queryClient.setQueryData(['site', projectId], (prev: Awaited<ReturnType<typeof fetchSite>> | undefined) =>
        prev ? { ...prev, structures: [...prev.structures, structure] } : prev,
      );
      setSelectedId(structure.structureId);
      setLocalStructures(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSiteStructure,
    onSuccess: (_result, structureId) => {
      queryClient.setQueryData(['site', projectId], (prev: Awaited<ReturnType<typeof fetchSite>> | undefined) =>
        prev
          ? { ...prev, structures: prev.structures.filter((s) => s.structureId !== structureId) }
          : prev,
      );
      setSelectedId(null);
      setLocalStructures(null);
    },
  });

  const saveSiteMutation = useMutation({
    mutationFn: (patch: Partial<SiteSettings>) => {
      if (!site) throw new Error('Site settings not loaded');
      return saveSiteSettings(projectId, { ...site, ...patch });
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(['site', projectId], (prev: Awaited<ReturnType<typeof fetchSite>> | undefined) =>
        prev ? { ...prev, site: saved } : prev,
      );
    },
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!selectedId) return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteMutation.mutate(selectedId);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedId, deleteMutation]);

  useEffect(() => {
    const kind = modeToBuildingKind(mode);
    if (!kind) {
      setPendingBuildingSize(null);
      return;
    }
    const preset = SITE_STRUCTURE_PRESETS[kind];
    setPendingBuildingSize({
      widthFt: preset.widthFt,
      depthFt: preset.depthFt,
      heightFt: preset.heightFt ?? 10,
    });
  }, [mode]);

  const clientToSite = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    const world = worldRef.current;
    if (!svg || !world) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = world.getScreenCTM()?.inverse();
    if (!ctm) return null;
    const local = pt.matrixTransform(ctm);
    return {
      x: snapSiteFt(local.x / PLAN_SCALE),
      z: snapSiteFt(local.y / PLAN_SCALE),
    };
  }, []);

  const patchStructures = (updater: (prev: SiteStructure[]) => SiteStructure[]) => {
    setLocalStructures(updater(structures));
  };

  const commitStructures = (next: SiteStructure[]) => {
    saveMutation.mutate(next);
  };

  const patchStructure = (structure: SiteStructure, patch: Partial<SiteStructure>) => {
    const b = structureBounds(structure);
    if (!b) return;
    const widthFt = clampBuildingFt(patch.widthFt ?? structure.widthFt ?? b.widthFt);
    const depthFt = clampBuildingFt(patch.depthFt ?? structure.depthFt ?? b.depthFt);
    const centerX = structure.centerX ?? b.centerX;
    const centerZ = structure.centerZ ?? b.centerZ;
    const minX = centerX - widthFt / 2;
    const minZ = centerZ - depthFt / 2;
    const updated = updateStructureRect(structure, minX, minZ, minX + widthFt, minZ + depthFt);
    const next = structures.map((s) =>
      s.structureId === structure.structureId ? { ...updated, ...patch, name: patch.name ?? s.name } : s,
    );
    commitStructures(next);
  };

  const placeBuildingAt = (kind: SiteStructureKind, pt: { x: number; z: number }) => {
    if (!pendingBuildingSize) return;
    createMutation.mutate({
      kind,
      centerX: pt.x,
      centerZ: pt.z,
      widthFt: pendingBuildingSize.widthFt,
      depthFt: pendingBuildingSize.depthFt,
      heightFt: pendingBuildingSize.heightFt,
    });
    setMode('select');
  };

  const resetView = () => {
    setViewZoom(1);
    setViewRotation(0);
    setViewPan({ x: 0, y: 0 });
  };

  const rotateView = (deltaDeg: number) => {
    setViewRotation((r) => {
      const next = (((r + deltaDeg) % 360) + 360) % 360;
      return next;
    });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.shiftKey) {
      setViewPan((p) => ({
        x: p.x - e.deltaY * 0.5,
        y: p.y - e.deltaX * 0.5,
      }));
      return;
    }
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setViewZoom((z) => clampZoom(z * factor));
  };

  const beginPan = (e: React.PointerEvent) => {
    e.preventDefault();
    const target = svgRef.current ?? e.currentTarget;
    (target as Element).setPointerCapture(e.pointerId);
    setPanPending(null);
    setViewPanDrag({
      startClientX: e.clientX,
      startClientY: e.clientY,
      origPanX: viewPan.x,
      origPanY: viewPan.y,
    });
  };

  const beginSelectPanPending = (e: React.PointerEvent) => {
    setSelectedId(null);
    setPanPending({
      startClientX: e.clientX,
      startClientY: e.clientY,
      origPanX: viewPan.x,
      origPanY: viewPan.y,
    });
  };

  const onSvgPointerDown = (e: React.PointerEvent) => {
    if (mode === 'select' && e.button === 0 && !spacePressed) {
      beginSelectPanPending(e);
      return;
    }
    if (!shouldBeginPan(e, mode, spacePressed)) return;
    beginPan(e);
  };

  const finishDraftRect = (rect: DraftRect) => {
    const minX = Math.min(rect.x1, rect.x2);
    const maxX = Math.max(rect.x1, rect.x2);
    const minZ = Math.min(rect.z1, rect.z2);
    const maxZ = Math.max(rect.z1, rect.z2);
    if (maxX - minX < MIN_RECT_FT || maxZ - minZ < MIN_RECT_FT) return;

    const kind: SiteStructureKind =
      mode === 'add-driveway'
        ? 'driveway'
        : mode === 'add-detached-garage'
          ? 'detached-garage'
          : mode === 'add-pole-barn'
            ? 'pole-barn'
            : 'shed';

    createMutation.mutate({
      kind,
      centerX: (minX + maxX) / 2,
      centerZ: (minZ + maxZ) / 2,
      widthFt: maxX - minX,
      depthFt: maxZ - minZ,
      snapToDoors: kind === 'driveway',
    });
    setDraftRect(null);
    setMode('select');
  };

  const onCanvasPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;

    if (mode === 'select' && !spacePressed) {
      beginSelectPanPending(e);
      e.stopPropagation();
      return;
    }

    if (shouldBeginPan(e, mode, spacePressed)) {
      beginPan(e);
      e.stopPropagation();
      return;
    }

    const pt = clientToSite(e.clientX, e.clientY);
    if (!pt) return;

    const buildingKind = modeToBuildingKind(mode);
    if (buildingKind) {
      e.preventDefault();
      e.stopPropagation();
      placeBuildingAt(buildingKind, pt);
      return;
    }

    if (mode.startsWith('add-')) {
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      setDraftRect({ x1: pt.x, z1: pt.z, x2: pt.x, z2: pt.z });
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (viewPanDrag) {
      setViewPan({
        x: viewPanDrag.origPanX + (e.clientX - viewPanDrag.startClientX),
        y: viewPanDrag.origPanY + (e.clientY - viewPanDrag.startClientY),
      });
      return;
    }

    if (panPending) {
      const dx = e.clientX - panPending.startClientX;
      const dy = e.clientY - panPending.startClientY;
      if (Math.hypot(dx, dy) >= PAN_DRAG_THRESHOLD_PX) {
        setViewPanDrag({
          startClientX: panPending.startClientX,
          startClientY: panPending.startClientY,
          origPanX: panPending.origPanX,
          origPanY: panPending.origPanY,
        });
        setPanPending(null);
        setViewPan({
          x: panPending.origPanX + dx,
          y: panPending.origPanY + dy,
        });
      }
      return;
    }

    const pt = clientToSite(e.clientX, e.clientY);
    if (!pt) return;

    if (draftRect) {
      setDraftRect((prev) => (prev ? { ...prev, x2: pt.x, z2: pt.z } : null));
      return;
    }

    if (!drag) return;

    if (drag.type === 'move') {
      const dx = pt.x - drag.startX;
      const dz = pt.z - drag.startZ;
      patchStructures((prev) =>
        prev.map((s) =>
          s.structureId === drag.structureId
            ? moveStructure(s, drag.origCenterX + dx, drag.origCenterZ + dz)
            : s,
        ),
      );
      return;
    }

    if (drag.type === 'resize') {
      patchStructures((prev) =>
        prev.map((s) => {
          if (s.structureId !== drag.structureId) return s;
          switch (drag.corner) {
            case 'se':
              return updateStructureRect(s, drag.anchorMinX, drag.anchorMinZ, pt.x, pt.z);
            case 'nw':
              return updateStructureRect(s, pt.x, pt.z, drag.anchorMaxX, drag.anchorMaxZ);
            case 'ne':
              return updateStructureRect(s, drag.anchorMinX, pt.z, pt.x, drag.anchorMaxZ);
            case 'sw':
              return updateStructureRect(s, pt.x, drag.anchorMinZ, drag.anchorMaxX, pt.z);
          }
        }),
      );
    }
  };

  const onPointerUp = () => {
    if (viewPanDrag) {
      setViewPanDrag(null);
      return;
    }

    if (panPending) {
      setPanPending(null);
      return;
    }

    if (draftRect) {
      finishDraftRect(draftRect);
      return;
    }

    if (drag) {
      commitStructures(localStructures ?? structures);
      setDrag(null);
    }
  };

  const startMove = (structure: SiteStructure, e: React.PointerEvent) => {
    if (mode !== 'select' || e.button !== 0) return;
    e.stopPropagation();
    const pt = clientToSite(e.clientX, e.clientY);
    if (!pt) return;
    const b = structureBounds(structure);
    if (!b) return;
    setSelectedId(structure.structureId);
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setDrag({
      type: 'move',
      structureId: structure.structureId,
      startX: pt.x,
      startZ: pt.z,
      origCenterX: b.centerX,
      origCenterZ: b.centerZ,
    });
  };

  const startResize = (
    structure: SiteStructure,
    corner: 'se' | 'sw' | 'ne' | 'nw',
    e: React.PointerEvent,
  ) => {
    if (mode !== 'select' || e.button !== 0) return;
    e.stopPropagation();
    const b = structureBounds(structure);
    if (!b) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setDrag({
      type: 'resize',
      structureId: structure.structureId,
      corner,
      anchorMinX: b.minX,
      anchorMinZ: b.minZ,
      anchorMaxX: b.maxX,
      anchorMaxZ: b.maxZ,
    });
  };

  const viewTransform = `translate(${viewPan.x}, ${viewPan.y}) translate(${lotCenterPx.x}, ${lotCenterPx.z}) scale(${viewZoom}) rotate(${viewRotation}) translate(${-lotCenterPx.x}, ${-lotCenterPx.z})`;

  if (siteQuery.isLoading) {
    return <p className="text-sm text-stone-600">Loading site plan…</p>;
  }

  return (
    <div className="space-y-4">
      <SiteOverviewPanel
        site={site}
        featureCount={structures.length}
        saving={saveSiteMutation.isPending}
        onSave={(patch) => saveSiteMutation.mutate(patch)}
      />

      {structures.length > 0 && (
        <SiteFeaturesList
          structures={structures}
          selectedId={selectedId}
          deletingId={deleteMutation.isPending ? deleteMutation.variables : null}
          saving={saveMutation.isPending}
          onSelect={setSelectedId}
          onRemove={(structureId) => deleteMutation.mutate(structureId)}
          onResize={patchStructure}
        />
      )}

      {pendingBuildingSize && modeToBuildingKind(mode) && (
        <AddBuildingSizePanel
          kind={modeToBuildingKind(mode)!}
          size={pendingBuildingSize}
          onChange={setPendingBuildingSize}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Add site feature
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <ModeButton active={mode === 'select'} onClick={() => setMode('select')}>
              Select
            </ModeButton>
            <ModeButton active={mode === 'pan'} onClick={() => setMode('pan')}>
              Pan
            </ModeButton>
            <AddFeatureButton
              active={mode === 'add-driveway'}
              onClick={() => setMode('add-driveway')}
              label="Driveway"
              description="Paved path"
              color="#4b5563"
            />
            <AddFeatureButton
              active={mode === 'add-detached-garage'}
              onClick={() => setMode('add-detached-garage')}
              label="Detached garage"
              description="2-car"
              color="#64748b"
            />
            <AddFeatureButton
              active={mode === 'add-pole-barn'}
              onClick={() => setMode('add-pole-barn')}
              label="Pole barn"
              description="Large span"
              color="#78716c"
            />
            <AddFeatureButton
              active={mode === 'add-shed'}
              onClick={() => setMode('add-shed')}
              label="Shed"
              description="Storage"
              color="#a8a29e"
            />
          </div>
          <p className="text-xs text-stone-500">
            {mode === 'pan' || spacePressed
              ? 'Drag to pan. Scroll to zoom (Shift+scroll to pan). Use Rotate to orient the road toward any side.'
              : mode === 'select'
                ? 'Click a feature to select it and edit size below. Drag empty space to pan. Delete key removes the selected feature.'
                : isBuildingAddMode(mode)
                  ? 'Set width, depth, and height below, then click on the lot to place the building.'
                  : 'Click and drag on the lot to draw a driveway. Hold Space to pan.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {selected && mode === 'select' && (
            <button
              type="button"
              onClick={() => deleteMutation.mutate(selected.structureId)}
              disabled={deleteMutation.isPending}
              className="mr-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
            >
              {deleteMutation.isPending ? 'Removing…' : `Remove ${selected.name}`}
            </button>
          )}
          <ViewControlButton onClick={() => setViewZoom((z) => clampZoom(z / 1.2))} title="Zoom out">
            −
          </ViewControlButton>
          <span className="min-w-[3rem] text-center text-xs font-medium text-stone-600">
            {Math.round(viewZoom * 100)}%
          </span>
          <ViewControlButton onClick={() => setViewZoom((z) => clampZoom(z * 1.2))} title="Zoom in">
            +
          </ViewControlButton>
          <ViewControlButton onClick={() => rotateView(-90)} title="Rotate counter-clockwise">
            ↺
          </ViewControlButton>
          <ViewControlButton onClick={() => rotateView(90)} title="Rotate clockwise">
            ↻
          </ViewControlButton>
          <ViewControlButton onClick={resetView} title="Reset view">
            Reset
          </ViewControlButton>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div
          ref={viewportRef}
          className="relative min-w-0 flex-1 overflow-hidden rounded-2xl border border-stone-200 bg-[#eef3ea] shadow-inner"
          style={{ height: 'min(70vh, 620px)' }}
          onWheel={handleWheel}
          onContextMenu={(e) => e.preventDefault()}
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEWPORT_W} ${VIEWPORT_H}`}
            className={clsx(
              'h-full w-full touch-none',
              (mode === 'pan' || spacePressed || viewPanDrag) && 'cursor-grab',
              viewPanDrag && 'cursor-grabbing',
              mode.startsWith('add-') && !spacePressed && 'cursor-crosshair',
            )}
            onPointerDown={onSvgPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            <defs>
              <pattern
                id="siteGridMinor"
                width={PLAN_SCALE}
                height={PLAN_SCALE}
                patternUnits="userSpaceOnUse"
              >
                <path
                  d={`M ${PLAN_SCALE} 0 L 0 0 0 ${PLAN_SCALE}`}
                  fill="none"
                  stroke="#8a9288"
                  strokeWidth="0.65"
                />
              </pattern>
              <pattern
                id="siteGridMajor"
                width={PLAN_SCALE * 10}
                height={PLAN_SCALE * 10}
                patternUnits="userSpaceOnUse"
              >
                <path
                  d={`M ${PLAN_SCALE * 10} 0 L 0 0 0 ${PLAN_SCALE * 10}`}
                  fill="none"
                  stroke="#4b5549"
                  strokeWidth="1.15"
                />
              </pattern>
            </defs>
            <rect width={VIEWPORT_W} height={VIEWPORT_H} fill="#eef3ea" />

            <g transform={viewTransform}>
              <rect
                x={-VIEWPORT_W * 2}
                y={-VIEWPORT_H * 2}
                width={VIEWPORT_W * 4}
                height={VIEWPORT_H * 4}
                fill="transparent"
                onPointerDown={onCanvasPointerDown}
              />

              <rect
                x={-VIEWPORT_W}
                y={-VIEWPORT_H}
                width={VIEWPORT_W * 3}
                height={VIEWPORT_H * 3}
                fill="url(#siteGridMinor)"
                pointerEvents="none"
              />
              <rect
                x={-VIEWPORT_W}
                y={-VIEWPORT_H}
                width={VIEWPORT_W * 3}
                height={VIEWPORT_H * 3}
                fill="url(#siteGridMajor)"
                pointerEvents="none"
              />

              <g ref={worldRef} transform={planTransform}>
                {site &&
                  computeRoadSegments(site).map((segment, index) => (
                    <g key={`road-${index}`}>
                      <rect
                        x={(segment.centerX - segment.widthFt / 2) * PLAN_SCALE}
                        y={(segment.centerZ - segment.depthFt / 2) * PLAN_SCALE}
                        width={segment.widthFt * PLAN_SCALE}
                        height={segment.depthFt * PLAN_SCALE}
                        fill="#52525b"
                        fillOpacity={0.88}
                        stroke="#27272a"
                        strokeWidth={0.8}
                        pointerEvents="none"
                      />
                      <line
                        x1={
                          (segment.widthFt >= segment.depthFt
                            ? segment.centerX - segment.widthFt / 2 + 2
                            : segment.centerX) * PLAN_SCALE
                        }
                        y1={
                          (segment.widthFt >= segment.depthFt
                            ? segment.centerZ
                            : segment.centerZ - segment.depthFt / 2 + 2) * PLAN_SCALE
                        }
                        x2={
                          (segment.widthFt >= segment.depthFt
                            ? segment.centerX + segment.widthFt / 2 - 2
                            : segment.centerX) * PLAN_SCALE
                        }
                        y2={
                          (segment.widthFt >= segment.depthFt
                            ? segment.centerZ
                            : segment.centerZ + segment.depthFt / 2 - 2) * PLAN_SCALE
                        }
                        stroke="#a1a1aa"
                        strokeWidth={0.6}
                        strokeDasharray="8 6"
                        pointerEvents="none"
                      />
                    </g>
                  ))}

                {site && (
                  <rect
                    x={(site.houseOffsetX ?? 0) * PLAN_SCALE}
                    y={(site.houseOffsetZ ?? 0) * PLAN_SCALE}
                    width={site.lotWidthFt * PLAN_SCALE}
                    height={site.lotDepthFt * PLAN_SCALE}
                    fill="#dcfce7"
                    fillOpacity={0.55}
                    stroke="#86efac"
                    strokeWidth={1}
                    pointerEvents="none"
                  />
                )}

                <rect
                  x={bounds.lotMinX * PLAN_SCALE}
                  y={bounds.lotMinZ * PLAN_SCALE}
                  width={(site?.lotWidthFt ?? bounds.widthFt) * PLAN_SCALE}
                  height={(site?.lotDepthFt ?? bounds.depthFt) * PLAN_SCALE}
                  fill="transparent"
                  onPointerDown={onCanvasPointerDown}
                />

                {rooms.map((room) => (
                  <rect
                    key={room.roomId}
                    x={(room.layoutX ?? 0) * PLAN_SCALE}
                    y={(room.layoutZ ?? 0) * PLAN_SCALE}
                    width={room.widthFt * PLAN_SCALE}
                    height={room.depthFt * PLAN_SCALE}
                    fill={roomPlanFill(room.type)}
                    fillOpacity={0.35}
                    stroke="#78716c"
                    strokeWidth={0.8}
                    pointerEvents="none"
                  />
                ))}

                {exteriorDoors.map((door) => {
                  const room = rooms.find((r) => r.roomId === door.roomId);
                  if (!room) return null;
                  const lx = (room.layoutX ?? 0) * PLAN_SCALE;
                  const lz = (room.layoutZ ?? 0) * PLAN_SCALE;
                  const w = (door.widthFt ?? 3) * PLAN_SCALE;
                  const wall = 1;
                  let x = lx;
                  let y = lz;
                  let rw = w;
                  let rh = wall;
                  if (door.side === 'back') {
                    x = lx + door.offsetFt * PLAN_SCALE - w / 2;
                  } else if (door.side === 'front') {
                    x = lx + door.offsetFt * PLAN_SCALE - w / 2;
                    y = lz + room.depthFt * PLAN_SCALE - wall;
                  } else if (door.side === 'left') {
                    y = lz + door.offsetFt * PLAN_SCALE - w / 2;
                    rw = wall;
                    rh = w;
                  } else {
                    x = lx + room.widthFt * PLAN_SCALE - wall;
                    y = lz + door.offsetFt * PLAN_SCALE - w / 2;
                    rw = wall;
                    rh = w;
                  }
                  return (
                    <rect
                      key={door.doorId}
                      x={x}
                      y={y}
                      width={rw}
                      height={rh}
                      fill="#d97706"
                      pointerEvents="none"
                    />
                  );
                })}

                {structures.map((structure) => {
                  const b = structureBounds(structure);
                  if (!b) return null;
                  const preset = SITE_STRUCTURE_PRESETS[structure.kind];
                  const isSelected = selectedId === structure.structureId;
                  return (
                    <g key={structure.structureId}>
                      <rect
                        x={b.minX * PLAN_SCALE}
                        y={b.minZ * PLAN_SCALE}
                        width={b.widthFt * PLAN_SCALE}
                        height={b.depthFt * PLAN_SCALE}
                        fill={preset.planFill}
                        fillOpacity={isSelected ? 0.92 : 0.78}
                        stroke={isSelected ? '#1c1917' : preset.planStroke}
                        strokeWidth={isSelected ? 2 : 1.2}
                        className={mode === 'select' ? 'cursor-grab' : undefined}
                        style={{ pointerEvents: mode.startsWith('add-') || mode === 'pan' ? 'none' : 'auto' }}
                        onPointerDown={(e) => startMove(structure, e)}
                      />
                      <text
                        x={b.centerX * PLAN_SCALE}
                        y={b.centerZ * PLAN_SCALE}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={11}
                        fill="#fafaf9"
                        pointerEvents="none"
                        style={{ userSelect: 'none' }}
                      >
                        {structure.name}
                      </text>
                      {isSelected &&
                        mode === 'select' &&
                        (['nw', 'ne', 'sw', 'se'] as const).map((corner) => {
                          const hx = (corner.includes('w') ? b.minX : b.maxX) * PLAN_SCALE;
                          const hz = (corner.includes('n') ? b.minZ : b.maxZ) * PLAN_SCALE;
                          return (
                            <rect
                              key={corner}
                              x={hx - 5}
                              y={hz - 5}
                              width={10}
                              height={10}
                              fill="#ffffff"
                              stroke="#1c1917"
                              strokeWidth={1}
                              className="cursor-nwse-resize"
                              onPointerDown={(e) => startResize(structure, corner, e)}
                            />
                          );
                        })}
                    </g>
                  );
                })}

                {draftRect && (
                  <rect
                    x={Math.min(draftRect.x1, draftRect.x2) * PLAN_SCALE}
                    y={Math.min(draftRect.z1, draftRect.z2) * PLAN_SCALE}
                    width={Math.abs(draftRect.x2 - draftRect.x1) * PLAN_SCALE}
                    height={Math.abs(draftRect.z2 - draftRect.z1) * PLAN_SCALE}
                    fill="#4b5563"
                    fillOpacity={0.35}
                    stroke="#374151"
                    strokeWidth={1.2}
                    strokeDasharray="6 4"
                    pointerEvents="none"
                  />
                )}
              </g>
            </g>

            {/* Compass — rotates with the plan so "up" on screen matches plan north */}
            <g
              transform={`translate(${VIEWPORT_W - 52}, 52) rotate(${viewRotation})`}
              pointerEvents="none"
            >
              <circle r={18} fill="white" fillOpacity={0.85} stroke="#a8a29e" strokeWidth={1} />
              <text y={-5} textAnchor="middle" fontSize={10} fontWeight="bold" fill="#57534e">
                N
              </text>
              <path d="M 0,-14 L 4,4 L 0,1 L -4,4 Z" fill="#57534e" />
            </g>
          </svg>
        </div>

        {selected && (
          <SiteStructurePanel
            structure={selected}
            preset={SITE_STRUCTURE_PRESETS[selected.kind]}
            saving={saveMutation.isPending}
            deleting={deleteMutation.isPending}
            onChange={(patch) => patchStructure(selected, patch)}
            onDelete={() => deleteMutation.mutate(selected.structureId)}
          />
        )}
      </div>
    </div>
  );
}

function SiteFeaturesList({
  structures,
  selectedId,
  deletingId,
  saving,
  onSelect,
  onRemove,
  onResize,
}: {
  structures: SiteStructure[];
  selectedId: string | null;
  deletingId: string | null | undefined;
  saving: boolean;
  onSelect: (structureId: string) => void;
  onRemove: (structureId: string) => void;
  onResize: (structure: SiteStructure, patch: Partial<SiteStructure>) => void;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Site features</p>
      <p className="mt-1 text-xs text-stone-500">
        Click a feature to select it and edit its size. Use Remove to delete.
      </p>
      <ul className="mt-3 divide-y divide-stone-100 rounded-xl border border-stone-200">
        {structures.map((structure) => {
          const preset = SITE_STRUCTURE_PRESETS[structure.kind];
          const isSelected = selectedId === structure.structureId;
          const isDeleting = deletingId === structure.structureId;
          const b = structureBounds(structure);
          const widthFt = structure.widthFt ?? b?.widthFt ?? preset.widthFt;
          const depthFt = structure.depthFt ?? b?.depthFt ?? preset.depthFt;
          const heightFt = structure.heightFt ?? preset.heightFt;
          const isBuilding = isBuildingKind(structure.kind);

          return (
            <li
              key={structure.structureId}
              className={clsx('px-3 py-2.5', isSelected && 'bg-stone-50')}
            >
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onSelect(structure.structureId)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-stone-800">
                    <span
                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                      style={{ backgroundColor: preset.planFill }}
                    />
                    {structure.name}
                  </span>
                  <span className="text-xs text-stone-500">
                    {preset.label}
                    {!isSelected && (
                      <>
                        {' · '}
                        {formatFeetInchesPair(widthFt, depthFt)}
                        {isBuilding && heightFt ? ` · ${heightFt} ft tall` : ''}
                      </>
                    )}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(structure.structureId)}
                  disabled={isDeleting}
                  className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                >
                  {isDeleting ? 'Removing…' : 'Remove'}
                </button>
              </div>

              {isSelected && isBuilding && (
                <div className="mt-3 border-t border-stone-100 pt-3">
                  <BuildingSizeFields
                    widthFt={widthFt}
                    depthFt={depthFt}
                    heightFt={heightFt ?? 10}
                    sizeOptions={BUILDING_SIZE_OPTIONS[structure.kind]}
                    disabled={saving}
                    onApply={(size) =>
                      onResize(structure, {
                        widthFt: size.widthFt,
                        depthFt: size.depthFt,
                        heightFt: size.heightFt,
                      })
                    }
                  />
                </div>
              )}

              {isSelected && structure.kind === 'driveway' && (
                <div className="mt-3 border-t border-stone-100 pt-3">
                  <BuildingSizeFields
                    widthFt={widthFt}
                    depthFt={depthFt}
                    showHeight={false}
                    disabled={saving}
                    onApply={(size) =>
                      onResize(structure, { widthFt: size.widthFt, depthFt: size.depthFt })
                    }
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function AddBuildingSizePanel({
  kind,
  size,
  onChange,
}: {
  kind: SiteStructureKind;
  size: PendingBuildingSize;
  onChange: (size: PendingBuildingSize) => void;
}) {
  const preset = SITE_STRUCTURE_PRESETS[kind];
  return (
    <div className="rounded-2xl border border-stone-300 bg-stone-50 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        {preset.label} size
      </p>
      <p className="mt-1 text-xs text-stone-600">
        Choose a preset or enter custom dimensions, then click on the lot to place.
      </p>
      <div className="mt-3">
        <BuildingSizeFields
          widthFt={size.widthFt}
          depthFt={size.depthFt}
          heightFt={size.heightFt}
          sizeOptions={BUILDING_SIZE_OPTIONS[kind]}
          onApply={(next) => onChange(next)}
        />
      </div>
    </div>
  );
}

function BuildingSizeFields({
  widthFt,
  depthFt,
  heightFt,
  sizeOptions,
  showHeight = true,
  disabled = false,
  onApply,
}: {
  widthFt: number;
  depthFt: number;
  heightFt?: number;
  sizeOptions?: { label: string; widthFt: number; depthFt: number; heightFt?: number }[];
  showHeight?: boolean;
  disabled?: boolean;
  onApply: (size: { widthFt: number; depthFt: number; heightFt: number }) => void;
}) {
  const applyField = (patch: Partial<{ widthFt: number; depthFt: number; heightFt: number }>) => {
    onApply({
      widthFt: clampBuildingFt(patch.widthFt ?? widthFt),
      depthFt: clampBuildingFt(patch.depthFt ?? depthFt),
      heightFt: clampBuildingFt(patch.heightFt ?? heightFt ?? 10, 6),
    });
  };

  return (
    <div className="space-y-3">
      {sizeOptions && sizeOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {sizeOptions.map((option) => {
            const active =
              option.widthFt === widthFt &&
              option.depthFt === depthFt &&
              (option.heightFt ?? heightFt) === heightFt;
            return (
              <button
                key={option.label}
                type="button"
                disabled={disabled}
                onClick={() =>
                  onApply({
                    widthFt: option.widthFt,
                    depthFt: option.depthFt,
                    heightFt: option.heightFt ?? heightFt ?? 10,
                  })
                }
                className={clsx(
                  'rounded-lg border px-2.5 py-1 text-xs font-semibold transition disabled:opacity-50',
                  active
                    ? 'border-stone-800 bg-stone-800 text-white'
                    : 'border-stone-300 bg-white text-stone-700 hover:border-stone-400',
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
      <div className={clsx('grid gap-2', showHeight ? 'grid-cols-3' : 'grid-cols-2')}>
        <label className="text-xs text-stone-600">
          Width (ft)
          <input
            key={`w-${widthFt}`}
            type="number"
            min={MIN_RECT_FT}
            step={1}
            defaultValue={widthFt}
            disabled={disabled}
            onBlur={(e) => applyField({ widthFt: Number(e.target.value) })}
            className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm disabled:bg-stone-50"
          />
        </label>
        <label className="text-xs text-stone-600">
          Depth (ft)
          <input
            key={`d-${depthFt}`}
            type="number"
            min={MIN_RECT_FT}
            step={1}
            defaultValue={depthFt}
            disabled={disabled}
            onBlur={(e) => applyField({ depthFt: Number(e.target.value) })}
            className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm disabled:bg-stone-50"
          />
        </label>
        {showHeight && (
          <label className="text-xs text-stone-600">
            Height (ft)
            <input
              key={`h-${heightFt}`}
              type="number"
              min={6}
              step={1}
              defaultValue={heightFt ?? 10}
              disabled={disabled}
              onBlur={(e) => applyField({ heightFt: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm disabled:bg-stone-50"
            />
          </label>
        )}
      </div>
    </div>
  );
}

function SiteOverviewPanel({
  site,
  featureCount,
  saving,
  onSave,
}: {
  site: SiteSettings | undefined;
  featureCount: number;
  saving: boolean;
  onSave: (patch: Partial<SiteSettings>) => void;
}) {
  const lotWidthFt = site?.lotWidthFt ?? 120;
  const lotDepthFt = site?.lotDepthFt ?? 150;
  const roadSides = normalizeRoadSides(site?.roadSides);
  const roadWidthFt = site?.roadWidthFt ?? DEFAULT_ROAD_WIDTH_FT;
  const corner = cornerFromRoadSides(roadSides);
  const frontageMode = isCornerLot(roadSides) ? 'corner' : 'standard';

  const commitLotDimension = (field: 'lotWidthFt' | 'lotDepthFt', raw: string) => {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    const next = Math.max(MIN_LOT_FT, Math.round(parsed));
    const current = field === 'lotWidthFt' ? lotWidthFt : lotDepthFt;
    if (next === current) return;
    onSave({ [field]: next });
  };

  const commitRoadWidth = (raw: string) => {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    const next = Math.max(16, Math.round(parsed));
    if (next === roadWidthFt) return;
    onSave({ roadWidthFt: next });
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Site overview</p>
          <p className="mt-1 text-sm text-stone-700">
            {formatFeetInchesPair(lotWidthFt, lotDepthFt)} lot · {roadSidesLabel(roadSides)} ·{' '}
            {featureCount} site feature{featureCount === 1 ? '' : 's'}
            {saving ? ' · Saving…' : ''}
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:max-w-md">
        <label className="text-xs text-stone-600">
          Lot width (ft)
          <input
            key={`lot-w-${lotWidthFt}`}
            type="number"
            min={MIN_LOT_FT}
            step={1}
            defaultValue={lotWidthFt}
            disabled={!site || saving}
            onBlur={(e) => commitLotDimension('lotWidthFt', e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm disabled:bg-stone-50"
          />
        </label>
        <label className="text-xs text-stone-600">
          Lot depth (ft)
          <input
            key={`lot-d-${lotDepthFt}`}
            type="number"
            min={MIN_LOT_FT}
            step={1}
            defaultValue={lotDepthFt}
            disabled={!site || saving}
            onBlur={(e) => commitLotDimension('lotDepthFt', e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm disabled:bg-stone-50"
          />
        </label>
      </div>

      <div className="mt-5 border-t border-stone-100 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Street / road</p>
        <p className="mt-1 text-[11px] text-stone-500">
          Set where the public road runs. Use corner lot when your property faces two streets.
          Rotate the plan view to match your preferred orientation.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <FrontageModeButton
            active={frontageMode === 'standard'}
            disabled={!site || saving}
            onClick={() => onSave({ roadSides: [roadSides[0] ?? 'south'] })}
            label="Standard lot"
            description="One street"
          />
          <FrontageModeButton
            active={frontageMode === 'corner'}
            disabled={!site || saving}
            onClick={() => onSave({ roadSides: CORNER_ROAD_SIDES[corner ?? 'south-west'] })}
            label="Corner lot"
            description="Two streets"
          />
        </div>

        {frontageMode === 'standard' ? (
          <div className="mt-3">
            <p className="text-xs text-stone-600">Street runs along</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(['north', 'south', 'east', 'west'] as SiteRoadSide[]).map((side) => (
                <RoadSideButton
                  key={side}
                  active={roadSides[0] === side}
                  disabled={!site || saving}
                  onClick={() => onSave({ roadSides: [side] })}
                  label={side.charAt(0).toUpperCase() + side.slice(1)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-xs text-stone-600">Streets meet at corner</p>
            <div className="mt-2 grid grid-cols-2 gap-1.5 sm:max-w-xs">
              {(
                ['north-west', 'north-east', 'south-west', 'south-east'] as SiteCorner[]
              ).map((cornerOption) => (
                <RoadSideButton
                  key={cornerOption}
                  active={corner === cornerOption}
                  disabled={!site || saving}
                  onClick={() => onSave({ roadSides: CORNER_ROAD_SIDES[cornerOption] })}
                  label={cornerOption.replace('-', ' ')}
                />
              ))}
            </div>
          </div>
        )}

        <label className="mt-3 block max-w-[10rem] text-xs text-stone-600">
          Road width (ft)
          <input
            key={`road-w-${roadWidthFt}`}
            type="number"
            min={16}
            step={1}
            defaultValue={roadWidthFt}
            disabled={!site || saving}
            onBlur={(e) => commitRoadWidth(e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm disabled:bg-stone-50"
          />
        </label>
      </div>

      <p className="mt-3 text-[11px] text-stone-500">
        Lot and road settings save automatically. Gray pavement on the plan is the public street.
      </p>
    </div>
  );
}

function FrontageModeButton({
  active,
  disabled,
  onClick,
  label,
  description,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
  description: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        'rounded-xl border px-3 py-2 text-left transition disabled:opacity-50',
        active
          ? 'border-stone-800 bg-stone-900 text-white shadow-sm'
          : 'border-stone-300 bg-white text-stone-800 hover:border-stone-400',
      )}
    >
      <span className="block text-sm font-semibold">{label}</span>
      <span className={clsx('text-[11px]', active ? 'text-stone-300' : 'text-stone-500')}>
        {description}
      </span>
    </button>
  );
}

function RoadSideButton({
  active,
  disabled,
  onClick,
  label,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        'rounded-lg border px-2.5 py-1.5 text-xs font-semibold capitalize transition disabled:opacity-50',
        active
          ? 'border-stone-800 bg-stone-800 text-white'
          : 'border-stone-300 bg-white text-stone-700 hover:border-stone-400',
      )}
    >
      {label}
    </button>
  );
}

function ViewControlButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex h-8 min-w-8 items-center justify-center rounded-lg border border-stone-300 bg-white px-2 text-sm font-semibold text-stone-700 hover:border-stone-400"
    >
      {children}
    </button>
  );
}

function SiteStructurePanel({
  structure,
  preset,
  saving,
  deleting,
  onChange,
  onDelete,
}: {
  structure: SiteStructure;
  preset: SiteStructurePreset;
  saving: boolean;
  deleting: boolean;
  onChange: (patch: Partial<SiteStructure>) => void;
  onDelete: () => void;
}) {
  const b = structureBounds(structure);
  const widthFt = structure.widthFt ?? b?.widthFt ?? preset.widthFt;
  const depthFt = structure.depthFt ?? b?.depthFt ?? preset.depthFt;
  const heightFt = structure.heightFt ?? preset.heightFt ?? 10;
  const isBuilding = isBuildingKind(structure.kind);

  return (
    <div className="w-full shrink-0 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm lg:w-72">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{preset.label}</p>
      <label className="mt-3 block text-xs text-stone-600">
        Name
        <input
          type="text"
          defaultValue={structure.name}
          onBlur={(e) => onChange({ name: e.target.value.trim() || preset.name })}
          className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
        />
      </label>

      <div className="mt-3">
        <p className="text-xs font-medium text-stone-600">Footprint size</p>
        <div className="mt-2">
          <BuildingSizeFields
            widthFt={widthFt}
            depthFt={depthFt}
            heightFt={heightFt}
            sizeOptions={isBuilding ? BUILDING_SIZE_OPTIONS[structure.kind] : undefined}
            showHeight={isBuilding}
            disabled={saving}
            onApply={(size) =>
              onChange(
                isBuilding
                  ? { widthFt: size.widthFt, depthFt: size.depthFt, heightFt: size.heightFt }
                  : { widthFt: size.widthFt, depthFt: size.depthFt },
              )
            }
          />
        </div>
      </div>

      {structure.kind === 'driveway' && (
        <label className="mt-3 block text-xs text-stone-600">
          Material
          <select
            defaultValue={structure.material ?? 'asphalt'}
            onChange={(e) =>
              onChange({ material: e.target.value as SiteStructure['material'] })
            }
            className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
          >
            <option value="asphalt">Asphalt</option>
            <option value="concrete">Concrete</option>
            <option value="gravel">Gravel</option>
            <option value="pavers">Pavers</option>
          </select>
        </label>
      )}
      <p className="mt-3 text-[11px] text-stone-500">
        {formatFeetInchesPair(widthFt, depthFt)}
        {structure.heightFt ? ` · ${structure.heightFt} ft tall` : ''}
      </p>
      <button
        type="button"
        onClick={onDelete}
        disabled={deleting || saving}
        className="mt-4 w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
      >
        {deleting ? 'Removing…' : 'Remove from site'}
      </button>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'rounded-xl border px-3 py-2 text-xs font-semibold transition',
        active
          ? 'border-stone-800 bg-stone-800 text-white'
          : 'border-stone-300 bg-white text-stone-700 hover:border-stone-400',
      )}
    >
      {children}
    </button>
  );
}

function AddFeatureButton({
  active,
  onClick,
  label,
  description,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  description: string;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex min-w-[7.5rem] flex-col rounded-xl border px-3 py-2 text-left transition',
        active
          ? 'border-stone-800 bg-stone-900 text-white shadow-md'
          : 'border-stone-300 bg-white text-stone-800 hover:border-stone-400',
      )}
    >
      <span className="flex items-center gap-2 text-sm font-semibold">
        <span
          className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
          style={{ backgroundColor: color }}
        />
        {label}
      </span>
      <span className={clsx('text-[11px]', active ? 'text-stone-300' : 'text-stone-500')}>
        {description}
      </span>
    </button>
  );
}
