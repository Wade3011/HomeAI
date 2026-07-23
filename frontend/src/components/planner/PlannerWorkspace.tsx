'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  deleteRoom,
  fetchCatalog,
  fetchCatalogByIds,
  fetchConnections,
  fetchExteriorDoors,
  fetchProjectRooms,
  savePlacements,
  updateRoom,
} from '@/lib/api';
import { computePlacementEstimate } from '@/lib/estimate';
import { formatFeetInchesTriple } from '@/lib/imperialDimensions';
import { isWallCabinet } from '@/config/catalogCategories';
import { roomTypePreset, normalizeRoomType } from '@/config/roomTypes';
import {
  inferWallFromPlacement,
  snapWallCabinetFromClick,
  WALL_BASE_ROTATION,
} from '@/lib/placementSnap';
import {
  orientedDimensions,
  placementOriginAfterRotation,
  resolvePlacementPosition,
} from '@/components/planner/placementCollision';
import {
  CABINET_GRID_FT,
  clampPlacementOrigin,
  nextRotationSteps,
  rotationDegreesFromSteps,
  rotationStepsFromY,
  rotationYFromSteps,
  snapToGrid,
} from '@/components/planner/plannerUtils';
import {
  CeilingSettingsFields,
} from '@/components/planner/CeilingSettingsFields';
import { FloorFinishPicker } from '@/components/planner/FloorFinishPicker';
import {
  canPlaceItemAt,
  isCountertopItem,
  placementFailureReason,
  resolvePlacementY,
} from '@/lib/placementHeight';
import { resolvePlacementItem } from '@/lib/placementItem';
import { normalizeCustomItemSpec, sectionalBoundsFt } from '@/lib/sectionalGeometry';
import { PlacementInfoOverlay } from '@/components/planner/PlacementInfoOverlay';
import {
  buildFootprints,
  catalogDimensionsFt,
  overlapsAny,
} from '@/components/planner/placementCollision';
import { CollapsiblePanel } from '@/components/planner/CollapsiblePanel';
import { EstimatePanel } from '@/components/planner/EstimatePanel';
import { CustomItemsPanel } from '@/components/planner/CustomItemsPanel';
import { RoomSwitcher } from '@/components/planner/RoomSwitcher';
import { PlannerProvider, usePlanner } from '@/contexts/PlannerContext';
import { CatalogPanel } from '@/components/planner/CatalogPanel';
import { RoomSettingsPanel } from '@/components/planner/RoomSettingsPanel';
import type { CatalogItem, Room } from '@/types';

const PlannerScene = dynamic(
  () =>
    import('@/components/planner/PlannerScene').then((mod) => ({
      default: mod.PlannerScene,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[480px] items-center justify-center rounded-xl border border-stone-300 bg-[#ebe8e3]">
        <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-[var(--sage-600)]" />
      </div>
    ),
  },
);

function PlannerInner({
  projectId,
  roomId,
  initialRoom,
}: {
  projectId: string;
  roomId: string;
  initialRoom: Room;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [room, setRoom] = useState(initialRoom);

  useEffect(() => {
    setRoom(initialRoom);
  }, [initialRoom]);

  const roomPreset = roomTypePreset(room.type);

  const {
    placements,
    selectedPlacementId,
    catalogDragItem,
    setCatalogDragItem,
    customDragItem,
    setCustomDragItem,
    addCatalogPlacement,
    addCustomPlacement,
    updatePlacement,
    updateCustomItem,
    removePlacement,
    selectPlacement,
    cancelPlaceMode,
  } = usePlanner();

  const [catalogPanelOpen, setCatalogPanelOpen] = useState(false);

  const placementCatalogIds = useMemo(
    () =>
      [
        ...new Set(
          placements
            .map((p) => p.catalogItemId)
            .filter((id): id is string => typeof id === 'string' && id.length > 0),
        ),
      ],
    [placements],
  );

  const placementIdsKey = placementCatalogIds.slice().sort().join(',');

  const { data: sceneCatalogItems = [] } = useQuery({
    queryKey: ['catalog', 'ids', placementIdsKey],
    queryFn: () => fetchCatalogByIds(placementCatalogIds),
    enabled: placementCatalogIds.length > 0,
    staleTime: 5 * 60_000,
  });

  const sectionsKey = roomPreset.catalogSections.join(',');
  const { data: panelCatalogItems = [], isFetching: catalogPanelLoading } = useQuery({
    queryKey: ['catalog', 'sections', sectionsKey],
    queryFn: () => fetchCatalog({ sections: roomPreset.catalogSections }),
    enabled: roomPreset.catalogSections.length > 0 && catalogPanelOpen,
    staleTime: 10 * 60_000,
  });

  const catalog = useMemo(() => {
    const byId = new Map<string, CatalogItem>();
    for (const item of sceneCatalogItems) byId.set(item.itemId, item);
    for (const item of panelCatalogItems) byId.set(item.itemId, item);
    return Array.from(byId.values());
  }, [sceneCatalogItems, panelCatalogItems]);

  const { data: projectRooms = [] } = useQuery({
    queryKey: ['rooms', projectId],
    queryFn: () => fetchProjectRooms(projectId),
    staleTime: 60_000,
  });

  const { data: connections = [] } = useQuery({
    queryKey: ['connections', projectId],
    queryFn: () => fetchConnections(projectId),
    staleTime: 60_000,
  });

  const { data: exteriorDoors = [] } = useQuery({
    queryKey: ['exterior-doors', projectId],
    queryFn: () => fetchExteriorDoors(projectId),
    staleTime: 60_000,
  });

  const saveMutation = useMutation({
    mutationFn: () => savePlacements(room.roomId, placements),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['placements', room.roomId] });
    },
  });

  const roomMutation = useMutation({
    mutationFn: (
      patch: Partial<
        Pick<
          Room,
          | 'widthFt'
          | 'depthFt'
          | 'heightFt'
          | 'ceilingType'
          | 'peakHeightFt'
          | 'ridgeAxis'
          | 'floorFinishId'
        >
      >,
    ) => updateRoom(room.roomId, patch),
    onSuccess: ({ room: updated, adjustedRooms }) => {
      setRoom(updated);
      queryClient.setQueryData(['room', room.roomId], updated);

      const touched = new Map<string, Room>([[updated.roomId, updated]]);
      for (const adjusted of adjustedRooms) {
        touched.set(adjusted.roomId, adjusted);
      }
      queryClient.setQueryData<Room[] | undefined>(['rooms', projectId], (prev) =>
        prev?.map((r) => touched.get(r.roomId) ?? r),
      );
      queryClient.invalidateQueries({ queryKey: ['rooms', projectId] });
    },
  });

  const deleteRoomMutation = useMutation({
    mutationFn: () => deleteRoom(roomId),
    onSuccess: () => {
      queryClient.setQueryData<Room[] | undefined>(['rooms', projectId], (prev) =>
        prev?.filter((r) => r.roomId !== roomId),
      );
      queryClient.invalidateQueries({ queryKey: ['connections', projectId] });
      queryClient.invalidateQueries({ queryKey: ['exterior-doors', projectId] });
      queryClient.removeQueries({ queryKey: ['room', roomId] });
      queryClient.removeQueries({ queryKey: ['placements', roomId] });
      router.push(`/projects/${projectId}`);
    },
  });

  const confirmDeleteRoom = () => {
    const ok = window.confirm(
      `Delete "${room.name}"? Its layout, connections, and exterior doors will be removed. This cannot be undone.`,
    );
    if (ok) deleteRoomMutation.mutate();
  };

  const catalogById = useMemo(
    () =>
      catalog.reduce<Record<string, CatalogItem>>((acc, item) => {
        acc[item.itemId] = item;
        return acc;
      }, {}),
    [catalog],
  );

  const [placeRotationSteps, setPlaceRotationSteps] = useState(0);
  const [placeError, setPlaceError] = useState<string | null>(null);

  useEffect(() => {
    setPlaceRotationSteps(0);
    setPlaceError(null);
  }, [catalogDragItem?.itemId, customDragItem?.templateId]);

  useEffect(() => {
    cancelPlaceMode();
    selectPlacement(null);
  }, [room.roomId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      selectPlacement(null);
      cancelPlaceMode();
      setPlaceRotationSteps(0);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectPlacement, cancelPlaceMode]);

  const activeCatalogId = catalogDragItem?.itemId ?? null;
  const activeCustomId = customDragItem?.templateId ?? null;
  const selectedPlacement = placements.find((p) => p.placementId === selectedPlacementId);
  const selectedResolved = selectedPlacement
    ? resolvePlacementItem(selectedPlacement, catalogById)
    : null;

  const estimate = useMemo(
    () => computePlacementEstimate(placements, catalogById),
    [placements, catalogById],
  );

  const placingActive = !!catalogDragItem || !!customDragItem;

  const rotatePlacementBy = (placementId: string, deltaSteps: number) => {
    const p = placements.find((pl) => pl.placementId === placementId);
    if (!p) return;

    const resolved = resolvePlacementItem(p, catalogById);
    if (!resolved) return;

    const { widthFt, depthFt } = resolved;
    const item = resolved.catalogItem;
    let positionX = p.positionX;
    let positionZ = p.positionZ;
    let newRotation = rotationYFromSteps(
      nextRotationSteps(rotationStepsFromY(p.rotationY), deltaSteps),
    );

    if (item && isWallCabinet(item)) {
      const wall = inferWallFromPlacement(
        p.positionX,
        p.positionZ,
        widthFt,
        depthFt,
        p.rotationY,
        room.widthFt,
        room.depthFt,
      );
      const relSteps = rotationStepsFromY(p.rotationY - WALL_BASE_ROTATION[wall]);
      const newRel = nextRotationSteps(relSteps, deltaSteps);
      const o = orientedDimensions(widthFt, depthFt, p.rotationY);
      const snapped = snapWallCabinetFromClick(
        p.positionX + o.widthFt / 2,
        p.positionZ + o.depthFt / 2,
        widthFt,
        depthFt,
        newRel,
        room.widthFt,
        room.depthFt,
        wall,
      );
      positionX = snapped.x;
      positionZ = snapped.z;
      newRotation = snapped.rotationY ?? rotationYFromSteps(newRel);
    } else {
      const origin = placementOriginAfterRotation(
        p.positionX,
        p.positionZ,
        widthFt,
        depthFt,
        p.rotationY,
        newRotation,
      );
      const o = orientedDimensions(widthFt, depthFt, newRotation);
      const snapped = clampPlacementOrigin(
        snapToGrid(origin.positionX, CABINET_GRID_FT),
        snapToGrid(origin.positionZ, CABINET_GRID_FT),
        o.widthFt,
        o.depthFt,
        room.widthFt,
        room.depthFt,
      );
      positionX = snapped.x;
      positionZ = snapped.z;
    }

    const fps = buildFootprints(placements, catalogById);
    if (
      overlapsAny(
        positionX,
        positionZ,
        widthFt,
        depthFt,
        newRotation,
        fps,
        placementId,
        item,
        catalogById,
      )
    ) {
      return;
    }

    const patch: Partial<import('@/types').Placement> = {
      rotationY: newRotation,
      positionX,
      positionZ,
    };
    if (item && isCountertopItem(item)) {
      const y = resolvePlacementY(
        item,
        positionX,
        positionZ,
        newRotation,
        placements.filter((pl) => pl.placementId !== placementId),
        catalogById,
      );
      if (y === null) return;
      patch.positionY = y;
    }
    updatePlacement(placementId, patch);
  };

  const rotateSelected = () => {
    if (!selectedPlacementId) return;
    rotatePlacementBy(selectedPlacementId, 1);
  };

  const tryPlaceCustom = (x: number, z: number, rotationY: number) => {
    if (!customDragItem) return false;
    const spec = normalizeCustomItemSpec({
      label: customDragItem.label,
      shape: customDragItem.shape,
      widthIn: customDragItem.widthIn,
      depthIn: customDragItem.depthIn,
      heightIn: customDragItem.heightIn,
      sectionalRunIn: customDragItem.sectionalRunIn,
      sectionalArmDepthIn: customDragItem.sectionalArmDepthIn,
    });
    const { widthFt, depthFt } = sectionalBoundsFt(spec);
    const fps = buildFootprints(placements, catalogById);
    const resolved = resolvePlacementPosition({
      x,
      z,
      widthFt,
      depthFt,
      rotationY,
      roomWidthFt: room.widthFt,
      roomDepthFt: room.depthFt,
      footprints: fps,
      catalogById,
      nudgeFt: 2,
    });
    if (!resolved) return false;
    addCustomPlacement(spec, { x: resolved.x, z: resolved.z, rotationY });
    cancelPlaceMode();
    setPlaceRotationSteps(0);
    return true;
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-[var(--background)]">
      <header className="panel-header flex flex-wrap items-center justify-between gap-3 border-b border-[var(--sage-700)] px-4 py-3 shadow-sm">
        <div className="min-w-0">
          <h1 className="text-lg font-bold tracking-tight">{room.name}</h1>
          <p className="text-sm text-[var(--sage-100)]">
            {roomPreset.label} · {formatFeetInchesTriple(room.widthFt, room.depthFt, room.heightFt)} ·{' '}
            {placements.length} items
          </p>
          <div className="mt-2">
            <RoomSwitcher
              projectId={projectId}
              rooms={projectRooms}
              currentRoomId={room.roomId}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {roomPreset.hasCatalogPricing && (
            <span className="rounded-full bg-white px-3 py-1.5 text-sm font-bold text-stone-800 shadow-sm">
              Est. ${estimate.total.toLocaleString()}
              {estimate.itemCount > 0 && (
                <span className="ml-1 font-medium text-stone-500">
                  ({estimate.itemCount} priced)
                </span>
              )}
            </span>
          )}
          {!roomPreset.hasCatalogPricing && (
            <span className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-stone-600 shadow-sm">
              Layout only — no catalog pricing
            </span>
          )}
          {selectedPlacementId && !placingActive && (
            <>
              <button
                type="button"
                onClick={() => selectPlacement(null)}
                className="rounded-lg border border-white/30 bg-white/15 px-3 py-2 text-sm font-medium backdrop-blur transition hover:bg-white/25"
              >
                Deselect
              </button>
              <button
                type="button"
                onClick={rotateSelected}
                className="rounded-lg border border-white/30 bg-white/15 px-3 py-2 text-sm font-medium backdrop-blur transition hover:bg-white/25"
              >
                Rotate 90°
              </button>
              <button
                type="button"
                onClick={() => removePlacement(selectedPlacementId)}
                className="rounded-lg border border-red-200/50 bg-red-500/90 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-400"
              >
                Delete
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-stone-800 shadow-sm transition hover:bg-stone-100 disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving…' : 'Save layout'}
          </button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <CollapsiblePanel title="Room" side="left" defaultOpen={false} widthClass="w-52">
          <RoomSettingsPanel
            widthFt={room.widthFt}
            depthFt={room.depthFt}
            heightFt={room.heightFt}
            isSaving={roomMutation.isPending}
            onApply={(dims) => roomMutation.mutate(dims)}
            roomName={room.name}
            onDelete={confirmDeleteRoom}
            isDeleting={deleteRoomMutation.isPending}
            heightHint={
              (room.ceilingType ?? 'flat') === 'cathedral'
                ? 'Wall / eave height (set peak under Ceiling)'
                : undefined
            }
          />
          <div className="border-t border-stone-100 p-4">
            <FloorFinishPicker
              room={room}
              disabled={roomMutation.isPending}
              onChange={(floorFinishId) => roomMutation.mutate({ floorFinishId })}
            />
          </div>
          <div className="border-t border-stone-100 p-4">
            <CeilingSettingsFields
              room={room}
              disabled={roomMutation.isPending}
              onApply={(patch) => roomMutation.mutate(patch)}
            />
          </div>
        </CollapsiblePanel>
        {roomPreset.catalogSections.length > 0 && (
          <CollapsiblePanel
            title="Catalog"
            side="left"
            defaultOpen={false}
            widthClass="w-64"
            onOpenChange={setCatalogPanelOpen}
          >
            {catalogPanelLoading && panelCatalogItems.length === 0 ? (
              <p className="flex items-center gap-2 p-3 text-xs text-stone-500">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-stone-400" />
                Loading catalog…
              </p>
            ) : (
              <CatalogPanel
                items={catalog}
                activeItemId={activeCatalogId}
                allowedSections={roomPreset.catalogSections}
                onPick={(item) => {
                  setCustomDragItem(null);
                  if (catalogDragItem?.itemId === item.itemId) {
                    setCatalogDragItem(null);
                    setPlaceRotationSteps(0);
                  } else {
                    setCatalogDragItem(item);
                  }
                }}
              />
            )}
          </CollapsiblePanel>
        )}
        {roomPreset.allowsCustomItems && (
          <CollapsiblePanel title="Furniture" side="left" defaultOpen={false} widthClass="w-64">
            <CustomItemsPanel
              roomType={normalizeRoomType(room.type)}
              activeTemplateId={activeCustomId}
              onPick={(template) => {
                setCatalogDragItem(null);
                if (customDragItem?.templateId === template.templateId) {
                  cancelPlaceMode();
                  setPlaceRotationSteps(0);
                } else {
                  setCustomDragItem(template);
                }
              }}
            />
          </CollapsiblePanel>
        )}
        <main className="flex min-w-0 flex-1 flex-col p-3 sm:p-4">
          <div
            className={clsx(
              'mb-2 flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-sm shadow-sm',
              placingActive
                ? 'border-[var(--sage-600)] bg-[var(--sage-50)] text-[var(--sage-800)]'
                : 'border-stone-200 bg-white text-stone-600',
            )}
          >
            <p className="min-w-0 flex-1 font-medium">
              {catalogDragItem
                ? isCountertopItem(catalogDragItem)
                  ? `Click green bases to place countertop: ${catalogDragItem.name} (${rotationDegreesFromSteps(placeRotationSteps)}°)`
                  : isWallCabinet(catalogDragItem)
                    ? `Click a blue wall grid: ${catalogDragItem.name} (${rotationDegreesFromSteps(placeRotationSteps)}°)`
                    : `Click the floor to place: ${catalogDragItem.name} (${rotationDegreesFromSteps(placeRotationSteps)}°) · view locked`
                : customDragItem
                  ? `Click the floor to place: ${customDragItem.label} (${rotationDegreesFromSteps(placeRotationSteps)}°) · edit size after placing`
                  : roomPreset.allowsCustomItems && roomPreset.catalogSections.length > 0
                    ? 'Pick from Catalog or Furniture, then click to place. Drag empty space to orbit.'
                    : roomPreset.allowsCustomItems
                      ? 'Pick a furniture block, click the floor to place, then edit size in the selection panel.'
                      : 'Select a catalog item, then click the floor or wall grid. Drag to orbit when idle.'}
            </p>
            {placingActive && (
              <>
                {placeError && (
                  <p className="w-full text-xs font-medium text-red-700">{placeError}</p>
                )}
                <button
                  type="button"
                  onClick={() => setPlaceRotationSteps((s) => nextRotationSteps(s, 1))}
                  className="shrink-0 rounded-lg border border-[var(--sage-600)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--sage-700)] transition hover:bg-[var(--sage-50)]"
                >
                  ↻ Rotate ({rotationDegreesFromSteps(placeRotationSteps)}°)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    cancelPlaceMode();
                    setPlaceRotationSteps(0);
                  }}
                  className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
          <div className="relative min-h-0 flex-1">
            <PlacementInfoOverlay
              room={room}
              placement={selectedPlacement ?? null}
              resolved={selectedResolved}
              onRotateLeft={() =>
                selectedPlacementId && rotatePlacementBy(selectedPlacementId, -1)
              }
              onRotateRight={() => selectedPlacementId && rotateSelected()}
              onCustomChange={
                selectedPlacementId && selectedPlacement?.customItem
                  ? (patch) => updateCustomItem(selectedPlacementId, patch)
                  : undefined
              }
            />
            <PlannerScene
              room={room}
              placements={placements}
              catalogById={catalogById}
              projectRooms={projectRooms}
              connections={connections}
              exteriorDoors={exteriorDoors}
              catalogItemForPlace={catalogDragItem}
              customItemForPlace={customDragItem}
              placeRotationSteps={placeRotationSteps}
              selectedPlacementId={selectedPlacementId}
              onSelectPlacement={selectPlacement}
              onPlaceAt={(x, z, rotationY) => {
                if (!catalogDragItem) return false;
                setPlaceError(null);
                if (
                  !canPlaceItemAt(
                    catalogDragItem,
                    x,
                    z,
                    rotationY,
                    placements,
                    catalogById,
                    room,
                  )
                ) {
                  setPlaceError(
                    placementFailureReason(
                      catalogDragItem,
                      x,
                      z,
                      rotationY,
                      placements,
                      catalogById,
                      room,
                    ) ?? 'Cannot place here.',
                  );
                  return false;
                }
                const positionY = resolvePlacementY(
                  catalogDragItem,
                  x,
                  z,
                  rotationY,
                  placements,
                  catalogById,
                );
                if (positionY === null) return false;
                addCatalogPlacement(catalogDragItem, { x, z, rotationY, positionY });
                cancelPlaceMode();
                setPlaceRotationSteps(0);
                return true;
              }}
              onPlaceFailed={setPlaceError}
              onPlaceCustomAt={(x, z, rotationY) => tryPlaceCustom(x, z, rotationY)}
              onMovePlacement={(id, x, z) => {
                const p = placements.find((pl) => pl.placementId === id);
                if (!p) return;
                const resolved = resolvePlacementItem(p, catalogById);
                if (!resolved) return;
                const patch: Partial<import('@/types').Placement> = {
                  positionX: x,
                  positionZ: z,
                };
                if (resolved.catalogItem && isCountertopItem(resolved.catalogItem)) {
                  const y = resolvePlacementY(
                    resolved.catalogItem,
                    x,
                    z,
                    p.rotationY,
                    placements.filter((pl) => pl.placementId !== id),
                    catalogById,
                  );
                  if (y === null) return;
                  patch.positionY = y;
                }
                updatePlacement(id, patch);
              }}
              onRotatePlacement={(id) => {
                rotatePlacementBy(id, 1);
                return true;
              }}
              onDeselect={() => selectPlacement(null)}
              onCancelPlaceMode={() => {
                cancelPlaceMode();
                setPlaceRotationSteps(0);
              }}
            />
          </div>
        </main>
        {roomPreset.hasCatalogPricing && (
          <CollapsiblePanel title="Estimate" side="right" defaultOpen={false} widthClass="w-52">
            <EstimatePanel estimate={estimate} />
          </CollapsiblePanel>
        )}
      </div>
    </div>
  );
}

export function PlannerWorkspace({
  projectId,
  roomId,
  initialRoom,
  initialPlacements,
}: {
  projectId: string;
  roomId: string;
  initialRoom: Room;
  initialPlacements: import('@/types').Placement[];
}) {
  return (
    <PlannerProvider roomId={roomId} initialPlacements={initialPlacements}>
      <PlannerInner projectId={projectId} roomId={roomId} initialRoom={initialRoom} />
    </PlannerProvider>
  );
}
