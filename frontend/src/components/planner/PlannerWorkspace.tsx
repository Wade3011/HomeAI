'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { fetchCatalog, fetchRoom, savePlacements, updateRoom } from '@/lib/api';
import { computePlacementEstimate } from '@/lib/estimate';
import { isWallCabinet } from '@/config/catalogCategories';
import {
  inferWallFromPlacement,
  snapWallCabinetFromClick,
  WALL_BASE_ROTATION,
} from '@/lib/placementSnap';
import { orientedDimensions } from '@/components/planner/placementCollision';
import {
  nextRotationSteps,
  rotationDegreesFromSteps,
  rotationStepsFromY,
  rotationYFromSteps,
} from '@/components/planner/plannerUtils';
import {
  canPlaceItemAt,
  isCountertopItem,
  resolvePlacementY,
} from '@/lib/placementHeight';
import { PlacementInfoOverlay } from '@/components/planner/PlacementInfoOverlay';
import {
  buildFootprints,
  catalogDimensionsFt,
  overlapsAny,
} from '@/components/planner/placementCollision';
import { CollapsiblePanel } from '@/components/planner/CollapsiblePanel';
import { EstimatePanel } from '@/components/planner/EstimatePanel';
import { PlannerProvider, usePlanner } from '@/contexts/PlannerContext';
import { CatalogPanel } from '@/components/planner/CatalogPanel';
import { PlannerScene } from '@/components/planner/PlannerScene';
import { RoomSettingsPanel } from '@/components/planner/RoomSettingsPanel';
import type { CatalogItem, Room } from '@/types';

function PlannerInner({ initialRoom }: { initialRoom: Room }) {
  const queryClient = useQueryClient();
  const [room, setRoom] = useState(initialRoom);

  useEffect(() => {
    setRoom(initialRoom);
  }, [initialRoom]);

  const {
    placements,
    selectedPlacementId,
    catalogDragItem,
    setCatalogDragItem,
    addPlacement,
    updatePlacement,
    removePlacement,
    selectPlacement,
  } = usePlanner();

  const { data: catalog = [] } = useQuery({
    queryKey: ['catalog'],
    queryFn: () => fetchCatalog(),
  });

  const saveMutation = useMutation({
    mutationFn: () => savePlacements(room.roomId, placements),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['placements', room.roomId] });
    },
  });

  const roomMutation = useMutation({
    mutationFn: (dims: { widthFt: number; depthFt: number; heightFt: number }) =>
      updateRoom(room.roomId, dims),
    onSuccess: (updated) => {
      setRoom(updated);
      queryClient.setQueryData(['room', room.roomId], updated);
    },
  });

  const catalogById = useMemo(
    () =>
      catalog.reduce<Record<string, CatalogItem>>((acc, item) => {
        acc[item.itemId] = item;
        return acc;
      }, {}),
    [catalog],
  );

  const [placeRotationSteps, setPlaceRotationSteps] = useState(0);

  useEffect(() => {
    setPlaceRotationSteps(0);
  }, [catalogDragItem?.itemId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      selectPlacement(null);
      setCatalogDragItem(null);
      setPlaceRotationSteps(0);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectPlacement, setCatalogDragItem]);

  const activeCatalogId = catalogDragItem?.itemId ?? null;
  const selectedPlacement = placements.find((p) => p.placementId === selectedPlacementId);
  const selectedItem = selectedPlacement
    ? catalogById[selectedPlacement.catalogItemId]
    : null;

  const estimate = useMemo(
    () => computePlacementEstimate(placements, catalogById),
    [placements, catalogById],
  );

  const rotatePlacementBy = (placementId: string, deltaSteps: number) => {
    const p = placements.find((pl) => pl.placementId === placementId);
    const item = p ? catalogById[p.catalogItemId] : undefined;
    if (!p || !item) return;
    const { widthFt, depthFt } = catalogDimensionsFt(item);
    let positionX = p.positionX;
    let positionZ = p.positionZ;
    let newRotation = rotationYFromSteps(
      nextRotationSteps(rotationStepsFromY(p.rotationY), deltaSteps),
    );

    if (isWallCabinet(item)) {
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
    if (isCountertopItem(item)) {
      const y = resolvePlacementY(
        item,
        p.positionX,
        p.positionZ,
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

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">{room.name}</h1>
          <p className="text-sm text-zinc-500">
            {room.widthFt}&apos; × {room.depthFt}&apos; × {room.heightFt}&apos; · {placements.length}{' '}
            items
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800">
            Est. ${estimate.total.toLocaleString()}
            {estimate.itemCount > 0 && (
              <span className="ml-1 font-normal text-emerald-700">
                ({estimate.itemCount} items)
              </span>
            )}
          </span>
          {selectedPlacementId && (
            <>
              <button
                type="button"
                onClick={rotateSelected}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                Rotate 90°
              </button>
              <button
                type="button"
                onClick={() => removePlacement(selectedPlacementId)}
                className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
              >
                Delete
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
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
          />
        </CollapsiblePanel>
        <CollapsiblePanel title="Catalog" side="left" defaultOpen={false} widthClass="w-64">
          <CatalogPanel
            items={catalog}
            activeItemId={activeCatalogId}
            onPick={(item) => {
              if (catalogDragItem?.itemId === item.itemId) {
                setCatalogDragItem(null);
                setPlaceRotationSteps(0);
              } else {
                setCatalogDragItem(item);
              }
            }}
          />
        </CollapsiblePanel>
        <main className="flex min-w-0 flex-1 flex-col p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-zinc-600">
            <p className="min-w-0 flex-1">
              {catalogDragItem
                ? isCountertopItem(catalogDragItem)
                  ? `Click green base cabinets to place countertop: ${catalogDragItem.name} (${rotationDegreesFromSteps(placeRotationSteps)}°)`
                  : isWallCabinet(catalogDragItem)
                    ? `Click a blue wall grid to place: ${catalogDragItem.name} (${rotationDegreesFromSteps(placeRotationSteps)}°) · 6" grid`
                    : `Click the floor to place: ${catalogDragItem.name} (${rotationDegreesFromSteps(placeRotationSteps)}°)`
                : 'Select a catalog item, then click the floor. Drag empty floor to rotate the view.'}
            </p>
            {catalogDragItem && (
              <button
                type="button"
                onClick={() =>
                  setPlaceRotationSteps((s) => nextRotationSteps(s, 1))
                }
                className="shrink-0 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              >
                ↻ Rotate ({rotationDegreesFromSteps(placeRotationSteps)}°)
              </button>
            )}
          </div>
          <div className="relative min-h-0 flex-1">
            <PlacementInfoOverlay
              room={room}
              placement={selectedPlacement ?? null}
              item={selectedItem}
              onRotateLeft={() =>
                selectedPlacementId && rotatePlacementBy(selectedPlacementId, -1)
              }
              onRotateRight={() => selectedPlacementId && rotateSelected()}
            />
            <PlannerScene
              room={room}
              placements={placements}
              catalogById={catalogById}
              catalogItemForPlace={catalogDragItem}
              placeRotationSteps={placeRotationSteps}
              selectedPlacementId={selectedPlacementId}
              onSelectPlacement={selectPlacement}
              onPlaceAt={(x, z, rotationY) => {
                if (!catalogDragItem) return false;
                if (
                  !canPlaceItemAt(
                    catalogDragItem,
                    x,
                    z,
                    rotationY,
                    placements,
                    catalogById,
                  )
                ) {
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
                addPlacement(catalogDragItem, { x, z, rotationY, positionY });
                setCatalogDragItem(null);
                setPlaceRotationSteps(0);
                return true;
              }}
              onMovePlacement={(id, x, z) => {
                const p = placements.find((pl) => pl.placementId === id);
                const item = p ? catalogById[p.catalogItemId] : undefined;
                if (!p || !item) return;
                let positionX = x;
                let positionZ = z;

                const patch: Partial<import('@/types').Placement> = {
                  positionX: x,
                  positionZ: z,
                };
                if (isCountertopItem(item)) {
                  const y = resolvePlacementY(
                    item,
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
            />
          </div>
        </main>
        <CollapsiblePanel title="Estimate" side="right" defaultOpen={false} widthClass="w-52">
          <EstimatePanel estimate={estimate} />
        </CollapsiblePanel>
      </div>
    </div>
  );
}

export function PlannerWorkspace({
  roomId,
  initialPlacements,
}: {
  roomId: string;
  initialPlacements: import('@/types').Placement[];
}) {
  const { data: room, isLoading } = useQuery({
    queryKey: ['room', roomId],
    queryFn: () => fetchRoom(roomId),
  });

  if (isLoading || !room) {
    return <p className="p-8 text-zinc-600">Loading planner…</p>;
  }

  return (
    <PlannerProvider roomId={roomId} initialPlacements={initialPlacements}>
      <PlannerInner initialRoom={room} />
    </PlannerProvider>
  );
}
