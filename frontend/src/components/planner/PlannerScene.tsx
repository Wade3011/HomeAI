'use client';

import { Canvas } from '@react-three/fiber';
import { Grid } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState } from 'react';
import { endActiveDragSession } from '@/lib/planner/dragSession';
import type { CatalogItem, Placement, Room } from '@/types';
import { PlacementMesh } from '@/components/planner/PlacementMesh';
import { FloorClickPlane } from '@/components/planner/FloorClickPlane';
import { SceneControls } from '@/components/planner/SceneControls';
import {
  buildFootprints,
  catalogDimensionsFt,
  orientedDimensions,
  resolveCountertopPosition,
  resolvePlacementPosition,
} from '@/components/planner/placementCollision';
import { CABINET_GRID_FT, clampPlacementOrigin, snapToGrid } from '@/components/planner/plannerUtils';
import { isBaseCabinetItem, isCountertopItem } from '@/lib/placementHeight';
import { resolvePlacementItem } from '@/lib/placementItem';
import type { CustomItemSpec } from '@/types';
import { BaseCabinetHighlights } from '@/components/planner/BaseCabinetHighlights';
import { isWallCabinet } from '@/config/catalogCategories';
import { applyPlacementSnap, inferWallFromPlacement, type RoomWallId } from '@/lib/placementSnap';
import { rotationYFromSteps } from '@/components/planner/plannerUtils';
import { WallPlacementSurfaces } from '@/components/planner/WallPlacementSurfaces';
import {
  RoomFloorDimensions,
  SelectedPlacementDimensions,
} from '@/components/planner/SceneDimensions';

const INCHES_PER_FOOT = 12;

export function PlannerScene({
  room,
  placements,
  catalogById,
  selectedPlacementId,
  onSelectPlacement,
  catalogItemForPlace,
  customItemForPlace = null,
  placeRotationSteps = 0,
  onPlaceAt,
  onPlaceCustomAt,
  onMovePlacement,
  onRotatePlacement,
  onDeselect,
  onCancelPlaceMode,
}: {
  room: Room;
  placements: Placement[];
  catalogById: Record<string, CatalogItem>;
  catalogItemForPlace: CatalogItem | null;
  customItemForPlace?: CustomItemSpec | null;
  placeRotationSteps?: number;
  selectedPlacementId: string | null;
  onSelectPlacement: (id: string | null) => void;
  onPlaceAt: (x: number, z: number, rotationY: number) => boolean;
  onPlaceCustomAt: (x: number, z: number, rotationY: number) => boolean;
  onMovePlacement: (id: string, x: number, z: number) => void;
  onRotatePlacement: (id: string) => boolean;
  onDeselect?: () => void;
  onCancelPlaceMode?: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const setDragging = (value: boolean) => {
    isDraggingRef.current = value;
    setIsDragging(value);
  };

  useEffect(() => {
    const resetDrag = () => {
      endActiveDragSession();
      setDragging(false);
    };
    window.addEventListener('blur', resetDrag);
    return () => window.removeEventListener('blur', resetDrag);
  }, []);

  const footprints = useMemo(
    () => buildFootprints(placements, catalogById),
    [placements, catalogById],
  );

  const size = useMemo(
    () => ({ w: room.widthFt, d: room.depthFt, h: room.heightFt }),
    [room.widthFt, room.depthFt, room.heightFt],
  );

  const cameraPosition = useMemo(
    () => [size.w * 0.85, Math.max(size.h * 1.1, 10), size.d * 1.05] as [number, number, number],
    [size.w, size.d, size.h],
  );

  const placingWall =
    !!catalogItemForPlace && isWallCabinet(catalogItemForPlace);
  const placingCountertop =
    !!catalogItemForPlace && isCountertopItem(catalogItemForPlace);
  const placingFloorItem =
    !!catalogItemForPlace && !placingWall && !placingCountertop;
  const placingCustomFloor = !!customItemForPlace;
  const placementModeActive = !!catalogItemForPlace || placingCustomFloor;

  const handlePlaceAt = (
    clickX: number,
    clickZ: number,
    catalogItem?: CatalogItem,
    wall?: RoomWallId,
    rotationOverride?: number,
  ): boolean => {
    if (!catalogItem) return false;
    const { widthFt, depthFt } = catalogDimensionsFt(catalogItem);
    const rotationStepsForSnap =
      rotationOverride !== undefined
        ? (((Math.round(rotationOverride / (Math.PI / 2)) % 4) + 4) % 4)
        : placeRotationSteps;
    const snapped = applyPlacementSnap(
      clickX,
      clickZ,
      catalogItem,
      rotationStepsForSnap,
      placements,
      catalogById,
      size.w,
      size.d,
      wall,
    );
    if (!snapped) return false;

    const rotationY =
      rotationOverride ?? snapped.rotationY ?? rotationYFromSteps(placeRotationSteps);

    const resolved = isCountertopItem(catalogItem)
      ? resolveCountertopPosition({
          x: snapped.x,
          z: snapped.z,
          widthFt,
          depthFt,
          rotationY,
          roomWidthFt: size.w,
          roomDepthFt: size.d,
          footprints,
          catalogById,
          placingItem: catalogItem,
          nudgeFt: 1.5,
        })
      : resolvePlacementPosition({
          x: snapped.x,
          z: snapped.z,
          widthFt,
          depthFt,
          rotationY,
          roomWidthFt: size.w,
          roomDepthFt: size.d,
          footprints,
          placingItem: catalogItem,
          catalogById,
          nudgeFt: 2,
        });
    if (!resolved) return false;
    return onPlaceAt(resolved.x, resolved.z, rotationY);
  };

  const selectedPlacement = placements.find((p) => p.placementId === selectedPlacementId);
  const selectedItem = selectedPlacement?.catalogItemId
    ? catalogById[selectedPlacement.catalogItemId]
    : undefined;
  const selectedResolved = selectedPlacement
    ? resolvePlacementItem(selectedPlacement, catalogById)
    : null;

  const handleCustomPlaceAt = (clickX: number, clickZ: number): boolean => {
    if (!customItemForPlace) return false;
    const widthFt = customItemForPlace.widthIn / INCHES_PER_FOOT;
    const depthFt = customItemForPlace.depthIn / INCHES_PER_FOOT;
    const rotationY = rotationYFromSteps(placeRotationSteps);
    const o = orientedDimensions(widthFt, depthFt, rotationY);
    const clamped = clampPlacementOrigin(
      snapToGrid(clickX - o.widthFt / 2, CABINET_GRID_FT),
      snapToGrid(clickZ - o.depthFt / 2, CABINET_GRID_FT),
      o.widthFt,
      o.depthFt,
      size.w,
      size.d,
    );
    return onPlaceCustomAt(clamped.x, clamped.z, rotationY);
  };

  const selectedWallCabinetWall = useMemo((): RoomWallId | null => {
    if (!selectedPlacement || !selectedItem || !isWallCabinet(selectedItem)) return null;
    const { widthFt, depthFt } = catalogDimensionsFt(selectedItem);
    return inferWallFromPlacement(
      selectedPlacement.positionX,
      selectedPlacement.positionZ,
      widthFt,
      depthFt,
      selectedPlacement.rotationY,
      size.w,
      size.d,
    );
  }, [selectedPlacement, selectedItem, size.w, size.d]);

  return (
    <div
      className="relative h-full min-h-[480px] w-full overflow-hidden rounded-xl border border-stone-300 bg-[#ebe8e3] outline-none ring-1 ring-stone-200 focus-within:ring-[var(--sage-600)]"
      tabIndex={0}
      role="application"
      aria-label="Kitchen planner 3D view"
      onPointerDown={(e) => {
        if (e.currentTarget === e.target || (e.target as HTMLElement).tagName === 'CANVAS') {
          e.currentTarget.focus();
        }
      }}
    >
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-xl border border-white/50 bg-slate-900/75 px-3 py-2 text-xs text-slate-100 shadow-lg backdrop-blur-sm">
        <p>
          <strong>Drag</strong> rotate · <strong>Shift+drag</strong> pan · <strong>Right/middle-drag</strong> pan ·{' '}
          <strong>Arrow keys</strong> move · <strong>Scroll</strong> zoom · click floor to deselect · <strong>Esc</strong> cancel
        </p>
      </div>
      <Canvas
        camera={{ position: cameraPosition, fov: 45 }}
        dpr={[1, 1.25]}
        frameloop="demand"
        performance={{ min: 0.5 }}
        onPointerMissed={() => {
          if (isDraggingRef.current) return;
          onSelectPlacement(null);
        }}
      >
        <color attach="background" args={['#ebe8e3']} />
        <ambientLight intensity={0.65} />
        <directionalLight position={[8, 14, 6]} intensity={1.1} />
        <BaseCabinetHighlights
          placements={placements}
          catalogById={catalogById}
          active={placingCountertop}
        />
        <RoomFloorDimensions room={room} />
        {selectedPlacement && selectedResolved && (
          <SelectedPlacementDimensions
            room={room}
            placement={selectedPlacement}
            widthFt={selectedResolved.widthFt}
            depthFt={selectedResolved.depthFt}
          />
        )}
        <Grid
          args={[size.w, size.d]}
          cellSize={1}
          sectionSize={1}
          cellColor="#d6d3d1"
          sectionColor="#a8a29e"
          fadeDistance={50}
          position={[size.w / 2, 0.02, size.d / 2]}
          raycast={() => null}
        />
        <mesh position={[size.w / 2, size.h / 2, 0]} raycast={() => null}>
          <boxGeometry args={[size.w, size.h, 0.06]} />
          <meshStandardMaterial color="#e4e4e7" transparent opacity={0.4} />
        </mesh>
        <mesh position={[size.w / 2, size.h / 2, size.d]} raycast={() => null}>
          <boxGeometry args={[size.w, size.h, 0.06]} />
          <meshStandardMaterial color="#e4e4e7" transparent opacity={0.4} />
        </mesh>
        <mesh position={[0, size.h / 2, size.d / 2]} raycast={() => null}>
          <boxGeometry args={[0.06, size.h, size.d]} />
          <meshStandardMaterial color="#e4e4e7" transparent opacity={0.4} />
        </mesh>
        <WallPlacementSurfaces
          roomWidth={size.w}
          roomDepth={size.d}
          showGrids={placingWall || selectedWallCabinetWall !== null}
          activeWall={placingWall ? null : selectedWallCabinetWall}
          isPlacing={placingWall}
          onPlace={(clickX, clickZ, wall) => {
            if (!catalogItemForPlace) return;
            handlePlaceAt(clickX, clickZ, catalogItemForPlace, wall);
          }}
        />
        {placements.map((p) => {
          const resolved = resolvePlacementItem(p, catalogById);
          if (!resolved) return null;
          return (
            <PlacementMesh
              key={p.placementId}
              placement={p}
              resolved={resolved}
              roomWidth={size.w}
              roomDepth={size.d}
              footprints={footprints}
              catalogById={catalogById}
              placements={placements}
              selected={p.placementId === selectedPlacementId}
              countertopPlaceItem={placingCountertop ? catalogItemForPlace : null}
              onCountertopPlace={(clickX, clickZ, baseRotationY) => {
                if (!catalogItemForPlace) return;
                handlePlaceAt(clickX, clickZ, catalogItemForPlace, undefined, baseRotationY);
              }}
              onSelect={() => {
                onCancelPlaceMode?.();
                onSelectPlacement(p.placementId);
              }}
              onMove={(x, z) => onMovePlacement(p.placementId, x, z)}
              onDragStart={() => setDragging(true)}
              onDragEnd={() => setDragging(false)}
              onRotate={() => onRotatePlacement(p.placementId)}
            />
          );
        })}
        <FloorClickPlane
          width={size.w}
          depth={size.d}
          isPlacing={placingFloorItem || placingCustomFloor}
          onPlace={(x, z) => {
            if (placingCustomFloor) {
              handleCustomPlaceAt(x, z);
              return;
            }
            if (!catalogItemForPlace) return;
            handlePlaceAt(x, z, catalogItemForPlace);
          }}
          onDeselect={() => {
            onCancelPlaceMode?.();
            onSelectPlacement(null);
            onDeselect?.();
          }}
        />
        <SceneControls
          target={[size.w / 2, 0, size.d / 2]}
          isDraggingItem={isDragging}
          placementMode={placementModeActive}
        />
      </Canvas>
    </div>
  );
}
