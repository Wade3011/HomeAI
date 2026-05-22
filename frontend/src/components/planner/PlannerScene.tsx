'use client';

import { Canvas } from '@react-three/fiber';
import { Grid } from '@react-three/drei';
import { useMemo, useState } from 'react';
import type { CatalogItem, Placement, Room } from '@/types';
import { PlacementMesh } from '@/components/planner/PlacementMesh';
import { FloorClickPlane } from '@/components/planner/FloorClickPlane';
import { SceneControls } from '@/components/planner/SceneControls';
import {
  buildFootprints,
  catalogDimensionsFt,
  resolveCountertopPosition,
  resolvePlacementPosition,
} from '@/components/planner/placementCollision';
import { isCountertopItem } from '@/lib/placementHeight';
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
  placeRotationSteps = 0,
  onPlaceAt,
  onMovePlacement,
  onRotatePlacement,
}: {
  room: Room;
  placements: Placement[];
  catalogById: Record<string, CatalogItem>;
  catalogItemForPlace: CatalogItem | null;
  placeRotationSteps?: number;
  selectedPlacementId: string | null;
  onSelectPlacement: (id: string | null) => void;
  onPlaceAt: (x: number, z: number, rotationY: number) => boolean;
  onMovePlacement: (id: string, x: number, z: number) => void;
  onRotatePlacement: (id: string) => boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);

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

  const handlePlaceAt = (
    clickX: number,
    clickZ: number,
    catalogItem?: CatalogItem,
    wall?: RoomWallId,
  ): boolean => {
    if (!catalogItem) return false;
    const { widthFt, depthFt } = catalogDimensionsFt(catalogItem);
    const snapped = applyPlacementSnap(
      clickX,
      clickZ,
      catalogItem,
      placeRotationSteps,
      placements,
      catalogById,
      size.w,
      size.d,
      wall,
    );
    if (!snapped) return false;

    const rotationY = snapped.rotationY ?? rotationYFromSteps(placeRotationSteps);

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
        });
    if (!resolved) return false;
    return onPlaceAt(resolved.x, resolved.z, rotationY);
  };

  const selectedPlacement = placements.find((p) => p.placementId === selectedPlacementId);
  const selectedItem = selectedPlacement
    ? catalogById[selectedPlacement.catalogItemId]
    : undefined;

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
      className="relative h-full min-h-[480px] w-full rounded-xl border border-zinc-200 bg-zinc-100 outline-none focus:ring-2 focus:ring-blue-200"
      tabIndex={0}
      role="application"
      aria-label="Kitchen planner 3D view"
      onPointerDown={(e) => {
        if (e.currentTarget === e.target || (e.target as HTMLElement).tagName === 'CANVAS') {
          e.currentTarget.focus();
        }
      }}
    >
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-lg bg-white/90 px-3 py-2 text-xs text-zinc-600 shadow-sm">
        <p>
          <strong>Drag</strong> rotate · <strong>Shift+drag</strong> pan · <strong>Right/middle-drag</strong> pan ·{' '}
          <strong>Arrow keys</strong> move · <strong>Scroll</strong> zoom · click empty space to deselect
        </p>
      </div>
      <Canvas
        camera={{ position: cameraPosition, fov: 45 }}
        dpr={[1, 1.5]}
        performance={{ min: 0.5 }}
        onPointerMissed={() => {
          if (!catalogItemForPlace) onSelectPlacement(null);
        }}
      >
        <color attach="background" args={['#f4f4f5']} />
        <ambientLight intensity={0.65} />
        <directionalLight position={[8, 14, 6]} intensity={1.1} />
        <BaseCabinetHighlights
          placements={placements}
          catalogById={catalogById}
          active={placingCountertop}
        />
        <RoomFloorDimensions room={room} />
        {selectedPlacement && selectedItem && !isDragging && (
          <SelectedPlacementDimensions
            room={room}
            placement={selectedPlacement}
            item={selectedItem}
          />
        )}
        <Grid
          args={[size.w, size.d]}
          cellSize={1}
          sectionSize={1}
          cellColor="#d4d4d8"
          sectionColor="#a1a1aa"
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
            handlePlaceAt(clickX, clickZ, catalogItemForPlace ?? undefined, wall);
          }}
        />
        {placements.map((p) => {
          const item = catalogById[p.catalogItemId];
          if (!item) return null;
          const w = item.widthIn / INCHES_PER_FOOT;
          const d = item.depthIn / INCHES_PER_FOOT;
          const h = item.heightIn / INCHES_PER_FOOT;
          return (
            <PlacementMesh
              key={p.placementId}
              placement={p}
              item={item}
              width={w}
              depth={d}
              height={h}
              roomWidth={size.w}
              roomDepth={size.d}
              footprints={footprints}
              catalogById={catalogById}
              placements={placements}
              selected={p.placementId === selectedPlacementId}
              onSelect={() => onSelectPlacement(p.placementId)}
              onMove={(x, z) => onMovePlacement(p.placementId, x, z)}
              onDragStart={() => setIsDragging(true)}
              onDragEnd={() => setIsDragging(false)}
              onRotate={() => onRotatePlacement(p.placementId)}
            />
          );
        })}
        <FloorClickPlane
          width={size.w}
          depth={size.d}
          isPlacing={!!catalogItemForPlace && !placingWall}
          onPlace={(x, z) => {
            handlePlaceAt(x, z, catalogItemForPlace ?? undefined);
          }}
        />
        <SceneControls target={[size.w / 2, 0, size.d / 2]} isDraggingItem={isDragging} />
      </Canvas>
    </div>
  );
}
