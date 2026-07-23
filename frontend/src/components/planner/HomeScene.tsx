'use client';

import { Canvas, useThree } from '@react-three/fiber';
import { Grid, OrbitControls, Environment } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type {
  CatalogItem,
  ExteriorDoor,
  Placement,
  Room,
  RoomConnection,
  SiteSettings,
  SiteStructure,
  StoryDef,
} from '@/types';
import { SiteSceneLayer } from '@/components/planner/SiteSceneLayer';
import { computeSiteSceneBounds } from '@/lib/siteLayout';
import { resolvePlacementItem } from '@/lib/placementItem';
import { resolvePlacementY } from '@/lib/placementHeight';
import { CustomItemMesh } from '@/components/planner/CustomItemMesh';
import { CatalogItemMesh } from '@/components/planner/CatalogItemMesh';
import { meshColorForResolved } from '@/lib/planner/meshColors';
import { CeilingToggleButton } from '@/components/planner/CeilingToggleButton';
import { GridToggleButton } from '@/components/planner/GridToggleButton';
import { RoomCeiling } from '@/components/planner/RoomCeiling';
import { RoomFloor } from '@/components/planner/RoomFloor';
import { WallToggleButton } from '@/components/planner/WallToggleButton';
import { ceilingHeightAt } from '@/lib/ceilingGeometry';
import { RoomConnectionWalls } from '@/components/planner/RoomConnectionWalls';
import { orientedDimensions } from '@/components/planner/placementCollision';
import {
  computeProjectBounds,
  planRoomWalls,
  type RoomWallPlan,
} from '@/lib/homeLayout';
import { preloadCatalogModels } from '@/lib/planner/catalogMeshModels';
import {
  normalizeStories,
  resolveRoomStoryIndex,
  siteFootprintRooms,
  storyFloorYFt,
} from '@/lib/stories';

export function HomeScene({
  rooms,
  displayRooms,
  connections,
  exteriorDoors = [],
  placementsByRoomId,
  catalogById,
  focusRoomId,
  onSelectRoom,
  showSite = false,
  site,
  structures = [],
  onToggleSite,
  stories,
  focusStoryIndex = null,
}: {
  rooms: Room[];
  /** Rooms to render in 3D; defaults to all `rooms`. Site + home view omits linked outbuilding interiors. */
  displayRooms?: Room[];
  connections: RoomConnection[];
  exteriorDoors?: ExteriorDoor[];
  placementsByRoomId: Record<string, Placement[]>;
  catalogById: Record<string, CatalogItem>;
  focusRoomId: string | null;
  onSelectRoom?: (roomId: string) => void;
  showSite?: boolean;
  site?: SiteSettings;
  structures?: SiteStructure[];
  onToggleSite?: (show: boolean) => void;
  stories?: StoryDef[];
  /** When set, dim rooms on other stories (null = show all levels equally). */
  focusStoryIndex?: number | null;
}) {
  const [showWalls, setShowWalls] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showCeilings, setShowCeilings] = useState(false);
  const storyList = useMemo(() => normalizeStories(stories), [stories]);
  const visibleRooms = useMemo(() => {
    const base = displayRooms ?? rooms;
    if (focusStoryIndex == null) return base;
    return base.filter((r) => resolveRoomStoryIndex(r) === focusStoryIndex);
  }, [displayRooms, rooms, focusStoryIndex]);
  const footprintRooms = useMemo(() => siteFootprintRooms(rooms), [rooms]);
  const houseBounds = useMemo(
    () => computeProjectBounds(focusStoryIndex == null ? footprintRooms : visibleRooms),
    [footprintRooms, visibleRooms, focusStoryIndex],
  );
  const sceneBounds = useMemo(() => {
    if (showSite && site) {
      return computeSiteSceneBounds(site, footprintRooms, structures);
    }
    return houseBounds;
  }, [showSite, site, footprintRooms, structures, houseBounds]);

  useEffect(() => {
    preloadCatalogModels();
  }, []);

  const stackTopY = useMemo(() => {
    const source = displayRooms ?? rooms;
    if (source.length === 0) return 12;
    return Math.max(
      ...source.map(
        (r) =>
          storyFloorYFt(storyList, resolveRoomStoryIndex(r)) +
          (r.peakHeightFt ?? r.heightFt),
      ),
      12,
    );
  }, [displayRooms, rooms, storyList]);

  const cameraPosition: [number, number, number] = useMemo(() => {
    const diag = Math.hypot(sceneBounds.widthFt, sceneBounds.depthFt);
    const lift = showSite ? 1.15 : 1;
    return [
      sceneBounds.centerX + diag * 0.55 * lift,
      Math.max(diag * 0.72 * lift, stackTopY * 1.15, showSite ? 24 : 18),
      sceneBounds.centerZ + diag * 0.82 * lift,
    ];
  }, [sceneBounds, showSite, stackTopY]);

  const target: [number, number, number] = [
    sceneBounds.centerX,
    Math.max(0, stackTopY * 0.25),
    sceneBounds.centerZ,
  ];

  return (
    <div className="relative h-full min-h-[520px] w-full overflow-hidden rounded-xl border border-stone-300 bg-[#ebe8e3]">
      <div className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-2">
        {onToggleSite && site && (
          <div className="flex overflow-hidden rounded-lg border border-stone-300 bg-white/95 shadow-sm backdrop-blur">
            <button
              type="button"
              onClick={() => onToggleSite(false)}
              className={`px-3 py-1.5 text-xs font-semibold transition ${
                !showSite ? 'bg-stone-800 text-white' : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              Home only
            </button>
            <button
              type="button"
              onClick={() => onToggleSite(true)}
              className={`px-3 py-1.5 text-xs font-semibold transition ${
                showSite ? 'bg-stone-800 text-white' : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              Site + home
            </button>
          </div>
        )}
      </div>
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
      <Canvas
        camera={{ position: cameraPosition, fov: 45 }}
        dpr={[1, 1.25]}
        frameloop="demand"
        performance={{ min: 0.5 }}
      >
        <color attach="background" args={[showSite ? '#c8dcc8' : '#ebe8e3']} />
        <Environment
          preset={showSite ? 'park' : 'apartment'}
          environmentIntensity={showSite ? 0.68 : 0.62}
        />
        <ambientLight intensity={showSite ? 0.85 : 0.8} />
        <hemisphereLight
          args={showSite ? ['#dce9f5', '#9aab8c', 0.42] : ['#f5f0e8', '#c4b8a8', 0.35]}
        />
        <directionalLight
          position={[20, 28, 14]}
          intensity={showSite ? 1.05 : 0.95}
          color="#fff8f0"
          castShadow={false}
        />
        <directionalLight
          position={[-12, 18, -8]}
          intensity={showSite ? 0.38 : 0.28}
          color="#e8eef5"
        />

        {showSite && site ? <SiteSceneLayer site={site} structures={structures} /> : null}

        {showGrid ? (
          <Grid
            args={[sceneBounds.widthFt + (showSite ? 40 : 24), sceneBounds.depthFt + (showSite ? 40 : 24)]}
            cellSize={1}
            sectionSize={showSite ? 10 : 5}
            cellColor={showSite ? '#8a9288' : '#d6d3d1'}
            sectionColor={showSite ? '#4b5549' : '#a8a29e'}
            fadeDistance={Math.max(sceneBounds.widthFt, sceneBounds.depthFt) * (showSite ? 4 : 3)}
            position={[sceneBounds.centerX, 0.005, sceneBounds.centerZ]}
            raycast={() => null}
          />
        ) : null}

        {(displayRooms ?? rooms).map((room) => {
          if (
            focusStoryIndex != null &&
            resolveRoomStoryIndex(room) !== focusStoryIndex
          ) {
            return null;
          }
          const focused = focusRoomId === null || focusRoomId === room.roomId;
          const storyPeers = rooms.filter(
            (r) => resolveRoomStoryIndex(r) === resolveRoomStoryIndex(room),
          );
          const wallPlans = planRoomWalls(
            room,
            storyPeers,
            connections,
            exteriorDoors,
          );
          const placements = placementsByRoomId[room.roomId] ?? [];
          const floorY = storyFloorYFt(storyList, resolveRoomStoryIndex(room));
          return (
            <RoomVolume
              key={room.roomId}
              room={room}
              floorY={floorY}
              wallPlans={wallPlans}
              placements={placements}
              catalogById={catalogById}
              focused={focused}
              showWalls={showWalls}
              showCeilings={showCeilings}
              onClick={() => onSelectRoom?.(room.roomId)}
            />
          );
        })}

        <FocusCameraEffect
          rooms={rooms}
          stories={storyList}
          focusRoomId={focusRoomId}
          fallbackTarget={target}
          fallbackPosition={cameraPosition}
        />

        <OrbitControls
          makeDefault
          target={target}
          enableDamping
          dampingFactor={0.12}
          maxPolarAngle={Math.PI / 2.05}
          minDistance={4}
          maxDistance={Math.max(sceneBounds.widthFt, sceneBounds.depthFt) * (showSite ? 8 : 6) + 20}
        />
      </Canvas>
    </div>
  );
}

function FocusCameraEffect({
  rooms,
  stories,
  focusRoomId,
  fallbackTarget,
  fallbackPosition,
}: {
  rooms: Room[];
  stories: StoryDef[];
  focusRoomId: string | null;
  fallbackTarget: [number, number, number];
  fallbackPosition: [number, number, number];
}) {
  const { camera, controls, invalidate } = useThree((s) => ({
    camera: s.camera,
    controls: s.controls as unknown as {
      target: THREE.Vector3;
      update: () => void;
    } | null,
    invalidate: s.invalidate,
  }));

  const lastFocus = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (lastFocus.current === focusRoomId) return;
    lastFocus.current = focusRoomId;

    const room = focusRoomId
      ? rooms.find((r) => r.roomId === focusRoomId) ?? null
      : null;

    let targetX = fallbackTarget[0];
    let targetY = fallbackTarget[1];
    let targetZ = fallbackTarget[2];
    let camX = fallbackPosition[0];
    let camY = fallbackPosition[1];
    let camZ = fallbackPosition[2];

    if (room) {
      const floorY = storyFloorYFt(stories, resolveRoomStoryIndex(room));
      const cx = (room.layoutX ?? 0) + room.widthFt / 2;
      const cz = (room.layoutZ ?? 0) + room.depthFt / 2;
      const diag = Math.hypot(room.widthFt, room.depthFt);
      targetX = cx;
      targetY = floorY + room.heightFt * 0.35;
      targetZ = cz;
      camX = cx + diag * 0.55;
      camY = floorY + Math.max(diag * 0.75, room.heightFt * 1.4);
      camZ = cz + diag * 0.85;
    }

    camera.position.set(camX, camY, camZ);
    if (controls) {
      controls.target.set(targetX, targetY, targetZ);
      controls.update();
    }
    camera.lookAt(targetX, targetY, targetZ);
    invalidate();
  }, [
    focusRoomId,
    rooms,
    stories,
    camera,
    controls,
    invalidate,
    fallbackTarget,
    fallbackPosition,
  ]);

  return null;
}

function RoomVolume({
  room,
  floorY,
  wallPlans,
  placements,
  catalogById,
  focused,
  showWalls,
  showCeilings,
  onClick,
}: {
  room: Room;
  floorY: number;
  wallPlans: RoomWallPlan[];
  placements: Placement[];
  catalogById: Record<string, CatalogItem>;
  focused: boolean;
  showWalls: boolean;
  showCeilings: boolean;
  onClick: () => void;
}) {
  const lx = room.layoutX ?? 0;
  const lz = room.layoutZ ?? 0;
  const opacity = focused ? 1 : 0.25;
  const wallColor = focused ? '#efeae3' : '#d4d0cb';

  return (
    <group
      position={[lx, floorY, lz]}
      onPointerDown={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <RoomFloor room={room} opacity={opacity} transparent={!focused} y={0.01} />

      {/* Room label floating just above floor */}
      <RoomLabel
        x={room.widthFt / 2}
        z={room.depthFt / 2}
        label={room.name}
        focused={focused}
      />

      {showWalls || wallPlans.some((w) => w.openings.length > 0) ? (
        <RoomConnectionWalls
          room={room}
          wallPlans={wallPlans}
          showWalls={showWalls && focused}
          showConnectionMarkers={focused && wallPlans.some((w) => w.openings.length > 0)}
          wallColor={wallColor}
          wallOpacity={opacity}
        />
      ) : null}

      {showCeilings ? (
        <RoomCeiling room={room} opacity={focused ? 0.85 : 0.2} transparent={!focused} />
      ) : null}

      {placements.map((p) => (
        <PlacementBlock
          key={p.placementId}
          room={room}
          placement={p}
          placements={placements}
          catalogById={catalogById}
          opacity={opacity}
          transparent={!focused}
        />
      ))}
    </group>
  );
}

function RoomLabel({
  x,
  z,
  label,
  focused,
}: {
  x: number;
  z: number;
  label: string;
  focused: boolean;
}) {
  return (
    <mesh position={[x, 0.015, z]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
      <planeGeometry args={[label.length * 0.45 + 1.5, 1.3]} />
      <meshBasicMaterial
        color={focused ? '#ffffff' : '#ffffff'}
        transparent
        opacity={focused ? 0.65 : 0.25}
      />
    </mesh>
  );
}

function PlacementBlock({
  room,
  placement,
  placements,
  catalogById,
  opacity,
  transparent,
}: {
  room: Room;
  placement: Placement;
  placements: Placement[];
  catalogById: Record<string, CatalogItem>;
  opacity: number;
  transparent: boolean;
}) {
  const resolved = resolvePlacementItem(placement, catalogById);
  if (!resolved) return null;

  const oriented = orientedDimensions(resolved.widthFt, resolved.depthFt, placement.rotationY);
  let y = placement.positionY;
  if (resolved.catalogItem) {
    const computedY = resolvePlacementY(
      resolved.catalogItem,
      placement.positionX,
      placement.positionZ,
      placement.rotationY,
      placements,
      catalogById,
    );
    if (computedY !== null) y = computedY;
  }

  const x = placement.positionX + oriented.widthFt / 2;
  const z = placement.positionZ + oriented.depthFt / 2;
  const cy = y + resolved.heightFt / 2;
  const ceilingCapFt = ceilingHeightAt(room, x, z);

  return (
    <group position={[x, cy, z]} rotation={[0, placement.rotationY, 0]}>
      {resolved.isCustom && resolved.customItem ? (
        <CustomItemMesh
          spec={resolved.customItem}
          resolved={resolved}
          selected={false}
          pickable={false}
          opacity={opacity}
          transparent={transparent}
        />
      ) : resolved.catalogItem ? (
        <CatalogItemMesh
          item={resolved.catalogItem}
          resolved={resolved}
          selected={false}
          pickable={false}
          opacity={opacity}
          transparent={transparent}
          roomHeightFt={ceilingCapFt}
        />
      ) : (
        <mesh raycast={() => null}>
          <boxGeometry args={[resolved.widthFt, resolved.heightFt, resolved.depthFt]} />
          <meshLambertMaterial
            color={meshColorForResolved(resolved, false)}
            transparent={transparent}
            opacity={opacity}
          />
        </mesh>
      )}
    </group>
  );
}
