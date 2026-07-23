'use client';

import { Canvas } from '@react-three/fiber';
import { Grid, Environment } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState } from 'react';
import { endActiveDragSession } from '@/lib/planner/dragSession';
import type { CatalogItem, CustomItemSpec, ExteriorDoor, Placement, Room, RoomConnection } from '@/types';
import { PlacementMesh } from '@/components/planner/PlacementMesh';
import { FloorClickPlane } from '@/components/planner/FloorClickPlane';
import { SceneControls } from '@/components/planner/SceneControls';
import {
  buildWallPlans,
  RoomConnectionWalls,
} from '@/components/planner/RoomConnectionWalls';
import {
  buildFootprints,
  catalogDimensionsFt,
  orientedDimensions,
  resolveCountertopPosition,
  resolvePlacementPosition,
} from '@/components/planner/placementCollision';
import { CABINET_GRID_FT, clampPlacementOrigin, snapToGrid } from '@/components/planner/plannerUtils';
import { isBaseCabinetItem, isCountertopItem, isShowerItem, isToiletItem, placementFailureReason } from '@/lib/placementHeight';
import { resolvePlacementItem } from '@/lib/placementItem';
import { normalizeCustomItemSpec, sectionalBoundsFt } from '@/lib/sectionalGeometry';
import { BaseCabinetHighlights } from '@/components/planner/BaseCabinetHighlights';
import { isWallCabinet } from '@/config/catalogCategories';
import { applyPlacementSnap, inferWallFromPlacement, type RoomWallId } from '@/lib/placementSnap';
import { rotationYFromSteps } from '@/components/planner/plannerUtils';
import { WallPlacementSurfaces } from '@/components/planner/WallPlacementSurfaces';
import {
  RoomFloorDimensions,
  SelectedPlacementDimensions,
} from '@/components/planner/SceneDimensions';
import { CeilingToggleButton } from '@/components/planner/CeilingToggleButton';
import { GridToggleButton } from '@/components/planner/GridToggleButton';
import { RoomCeiling } from '@/components/planner/RoomCeiling';
import { RoomFloor } from '@/components/planner/RoomFloor';
import { WallToggleButton } from '@/components/planner/WallToggleButton';
import { ceilingHeightAt } from '@/lib/ceilingGeometry';
import { preloadCatalogModels } from '@/lib/planner/catalogMeshModels';

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
  onPlaceFailed,
  onPlaceCustomAt,
  onMovePlacement,
  onRotatePlacement,
  onDeselect,
  onCancelPlaceMode,
  projectRooms = [],
  connections = [],
  exteriorDoors = [],
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
  onPlaceFailed?: (message: string) => void;
  onPlaceCustomAt: (x: number, z: number, rotationY: number) => boolean;
  onMovePlacement: (id: string, x: number, z: number) => void;
  onRotatePlacement: (id: string) => boolean;
  onDeselect?: () => void;
  onCancelPlaceMode?: () => void;
  projectRooms?: Room[];
  connections?: RoomConnection[];
  exteriorDoors?: ExteriorDoor[];
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [showWalls, setShowWalls] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showCeilings, setShowCeilings] = useState(true);
  const isDraggingRef = useRef(false);
  const setDragging = (value: boolean) => {
    isDraggingRef.current = value;
    setIsDragging(value);
  };

  useEffect(() => {
    preloadCatalogModels();
  }, []);

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

  const wallPlans = useMemo(
    () => buildWallPlans(room, projectRooms, connections, exteriorDoors),
    [room, projectRooms, connections, exteriorDoors],
  );

  const hasConnections = wallPlans.some((w) => w.openings.length > 0);

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

    const isCabinet =
      isBaseCabinetItem(catalogItem) || isWallCabinet(catalogItem);
    const isLargeFloorFixture =
      isShowerItem(catalogItem) || isToiletItem(catalogItem);

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
          nudgeFt: isCabinet ? 0 : isLargeFloorFixture ? 3 : 2,
        });
    if (!resolved) {
      onPlaceFailed?.(
        placementFailureReason(
          catalogItem,
          snapped.x,
          snapped.z,
          rotationY,
          placements,
          catalogById,
          room,
        ) ?? 'No clear floor space here. Try another spot or rotate the item.',
      );
      return false;
    }
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
    const spec = normalizeCustomItemSpec(customItemForPlace);
    const { widthFt, depthFt } = sectionalBoundsFt(spec);
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
      <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-2">
        <WallToggleButton
          showWalls={showWalls}
          onToggle={() => setShowWalls((v) => !v)}
        />
        <CeilingToggleButton
          showCeilings={showCeilings}
          onToggle={() => setShowCeilings((v) => !v)}
        />
        <GridToggleButton
          showGrid={showGrid}
          onToggle={() => setShowGrid((v) => !v)}
        />
      </div>
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
        <color attach="background" args={['#e7e2da']} />
        <Environment preset="apartment" environmentIntensity={0.62} />
        <ambientLight intensity={0.82} />
        <hemisphereLight args={['#f5f0e8', '#c4b8a8', 0.35]} />
        <directionalLight position={[8, 14, 6]} intensity={0.95} color="#fff8f0" />
        <directionalLight position={[-6, 10, -4]} intensity={0.28} color="#e8eef5" />
        <BaseCabinetHighlights
          placements={placements}
          catalogById={catalogById}
          active={placingCountertop}
        />
        <RoomFloor room={room} y={0.008} />
        <RoomFloorDimensions room={room} />
        {selectedPlacement && selectedResolved && (
          <SelectedPlacementDimensions
            room={room}
            placement={selectedPlacement}
            widthFt={selectedResolved.widthFt}
            depthFt={selectedResolved.depthFt}
          />
        )}
        {showGrid ? (
          <Grid
            args={[size.w, size.d]}
            cellSize={1}
            sectionSize={1}
            cellColor="#d6d3d1"
            sectionColor="#a8a29e"
            fadeDistance={50}
            position={[size.w / 2, 0.025, size.d / 2]}
            raycast={() => null}
          />
        ) : null}
        <RoomConnectionWalls
          room={room}
          wallPlans={wallPlans}
          showWalls={showWalls}
          showConnectionMarkers={hasConnections}
        />
        {showCeilings ? <RoomCeiling room={room} opacity={0.92} /> : null}
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
              roomHeight={(() => {
                const o = orientedDimensions(
                  resolved.widthFt,
                  resolved.depthFt,
                  p.rotationY,
                );
                return ceilingHeightAt(
                  room,
                  p.positionX + o.widthFt / 2,
                  p.positionZ + o.depthFt / 2,
                );
              })()}
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
