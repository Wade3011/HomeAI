'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createRoom,
  deleteRoom,
  fetchConnections,
  fetchExteriorDoors,
  saveConnections,
  saveExteriorDoors,
  updateRoom,
} from '@/lib/api';
import { getFloorFinish, resolveFloorFinishId } from '@/config/floorFinishes';
import {
  ROOM_TYPE_PRESETS,
  ROOM_TYPES,
  normalizeRoomType,
  roomTypePreset,
  type RoomTypePreset,
} from '@/config/roomTypes';
import {
  computeFloorPlanOverview,
  computeProjectBounds,
  DOOR_WIDTH_FT,
  findConnection,
  oppositeWallSide,
  pickExteriorWallAtPoint,
  roomRect,
  roomsAreAdjacent,
  sharedEdge,
  WALL_THICKNESS_FT,
} from '@/lib/homeLayout';
import {
  findConnectedRoomGroups,
  GROUP_FILL,
  GROUP_STROKE,
  internalConnectionLabels,
  segmentToLine,
  unionBoundarySegments,
} from '@/lib/floorPlanGroups';
import type { ExteriorDoor, Room, RoomConnection, RoomType, RoomWallSide } from '@/types';
import { formatFeetInches, formatFeetInchesPair, snapLayoutFt } from '@/lib/imperialDimensions';
import { ExportFloorPlanButton } from '@/components/planner/ExportFloorPlanButton';
import {
  ImportFloorPlanPanel,
  type ImportTool,
} from '@/components/planner/ImportFloorPlanPanel';
import { FloorPlanRoomPanel } from '@/components/planner/FloorPlanRoomPanel';
import {
  distanceFt,
  rectToRoomLayout,
  rescaleUnderlayByCalibration,
  unionBoundsWithUnderlay,
  type PlanPoint,
  type PlanUnderlay,
} from '@/lib/importFloorPlan';
import {
  findFreeRoomSlot,
  roomToRect,
  snapAndResolveRoomPosition,
  type RoomRect,
} from '@/lib/floorPlanSnap';
import {
  getStory,
  MAIN_STORY_INDEX,
  normalizeStories,
  roomsOnStory,
  shouldGhostMainFootprint,
} from '@/lib/stories';
import { StoryLevelBar } from '@/components/planner/StoryLevelBar';
import type { StoryDef } from '@/types';

const PLAN_SCALE = 8; // px per foot on floor plan canvas
const PLAN_PAD_FT = 8;
const WALL_COLOR = '#3f3a35';
/**
 * Stroke that visually represents wall thickness on the SVG plan.
 * SVG strokes are centered on the path, so a stroke of 2 × wall thickness
 * results in `wall thickness` painted outside the room footprint (the inside
 * half is hidden under the floor fill painted on top).
 *
 * Rooms are placed with a `ROOM_GAP_FT` (= wall thickness) gap between them,
 * so the outside halves of two adjacent rooms' wall strokes overlap perfectly
 * inside the gap → one shared visible wall.
 */
const WALL_STROKE_PX = WALL_THICKNESS_FT * PLAN_SCALE * 2;

type Mode = 'arrange' | 'connect' | 'exterior-doors';

export function FloorPlanEditor({
  projectId,
  projectName = 'Floor plan',
  stories: storiesProp,
  rooms: allRooms,
  onStoriesChange,
  storiesSaving,
}: {
  projectId: string;
  projectName?: string;
  stories?: StoryDef[];
  rooms: Room[];
  onStoriesChange?: (stories: StoryDef[]) => void;
  storiesSaving?: boolean;
}) {
  const houseRooms = useMemo(
    () => allRooms.filter((room) => !room.linkedSiteStructureId),
    [allRooms],
  );
  const stories = useMemo(() => normalizeStories(storiesProp), [storiesProp]);
  const [activeStoryIndex, setActiveStoryIndex] = useState(MAIN_STORY_INDEX);
  const activeStory = getStory(stories, activeStoryIndex) ?? stories[0];

  useEffect(() => {
    if (!stories.some((s) => s.storyIndex === activeStoryIndex)) {
      setActiveStoryIndex(MAIN_STORY_INDEX);
    }
  }, [stories, activeStoryIndex]);

  const rooms = useMemo(
    () => roomsOnStory(houseRooms, activeStory.storyIndex),
    [houseRooms, activeStory.storyIndex],
  );
  const ghostMainRooms = useMemo(() => {
    if (!shouldGhostMainFootprint(activeStory)) return [];
    return roomsOnStory(houseRooms, MAIN_STORY_INDEX);
  }, [houseRooms, activeStory]);

  const queryClient = useQueryClient();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [adding, setAdding] = useState(false);
  const [mode, setMode] = useState<Mode>('arrange');
  const [connectPick, setConnectPick] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [underlay, setUnderlay] = useState<PlanUnderlay | null>(null);
  const [importTool, setImportTool] = useState<ImportTool>('off');
  const [calibrateA, setCalibrateA] = useState<PlanPoint | null>(null);
  const [calibrateB, setCalibrateB] = useState<PlanPoint | null>(null);
  const [knownFeetInput, setKnownFeetInput] = useState('20');
  const [traceRoomType, setTraceRoomType] = useState<RoomType>('living');
  const [traceDraft, setTraceDraft] = useState<{
    x1: number;
    z1: number;
    x2: number;
    z2: number;
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Local layout overrides (room positions during drag). Committed to the
  // server only on pointerup so dragging stays smooth.
  const [layoutOverrides, setLayoutOverrides] = useState<
    Record<string, { layoutX: number; layoutZ: number }>
  >({});

  // Merge committed room positions with local drag overrides for display.
  const displayRooms = useMemo(
    () =>
      rooms.map((r) => {
        const ov = layoutOverrides[r.roomId];
        if (!ov) return r;
        return { ...r, layoutX: ov.layoutX, layoutZ: ov.layoutZ };
      }),
    [rooms, layoutOverrides],
  );

  const connectionsQuery = useQuery({
    queryKey: ['connections', projectId],
    queryFn: () => fetchConnections(projectId),
  });
  const allConnections = connectionsQuery.data ?? [];
  const storyRoomIds = useMemo(
    () => new Set(rooms.map((r) => r.roomId)),
    [rooms],
  );
  const connections = useMemo(
    () =>
      allConnections.filter(
        (c) => storyRoomIds.has(c.roomAId) && storyRoomIds.has(c.roomBId),
      ),
    [allConnections, storyRoomIds],
  );

  const exteriorDoorsQuery = useQuery({
    queryKey: ['exterior-doors', projectId],
    queryFn: () => fetchExteriorDoors(projectId),
  });
  const allExteriorDoors = exteriorDoorsQuery.data ?? [];
  const exteriorDoors = useMemo(
    () => allExteriorDoors.filter((d) => storyRoomIds.has(d.roomId)),
    [allExteriorDoors, storyRoomIds],
  );

  const overview = useMemo(
    () => computeFloorPlanOverview(displayRooms),
    [displayRooms],
  );
  const planBounds = useMemo(() => {
    const forBounds =
      ghostMainRooms.length > 0
        ? [...displayRooms, ...ghostMainRooms]
        : displayRooms;
    return computeProjectBounds(forBounds);
  }, [displayRooms, ghostMainRooms]);

  const roomGroups = useMemo(
    () => findConnectedRoomGroups(displayRooms, connections),
    [displayRooms, connections],
  );

  const mergedGroupByRoomId = useMemo(() => {
    const map = new Map<string, (typeof roomGroups)[number]>();
    for (const group of roomGroups) {
      if (group.rooms.length <= 1) continue;
      for (const room of group.rooms) {
        map.set(room.roomId, group);
      }
    }
    return map;
  }, [roomGroups]);

  const mergedGroups = useMemo(
    () => roomGroups.filter((g) => g.rooms.length > 1),
    [roomGroups],
  );

  const canvasBounds = useMemo(
    () =>
      unionBoundsWithUnderlay(
        planBounds,
        underlay,
        displayRooms.length + ghostMainRooms.length,
      ),
    [planBounds, underlay, displayRooms.length, ghostMainRooms.length],
  );

  useEffect(() => {
    return () => {
      if (underlay?.url.startsWith('blob:')) URL.revokeObjectURL(underlay.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revoke only on unmount
  }, []);

  const planOriginX = canvasBounds.minX - PLAN_PAD_FT;
  const planOriginZ = canvasBounds.minZ - PLAN_PAD_FT;
  const canvasW = (canvasBounds.widthFt + PLAN_PAD_FT * 2) * PLAN_SCALE;
  const canvasH = (canvasBounds.depthFt + PLAN_PAD_FT * 2) * PLAN_SCALE;
  const planTransform = `translate(${-planOriginX * PLAN_SCALE}, ${-planOriginZ * PLAN_SCALE})`;
  const importCaptureActive = importTool === 'calibrate' || importTool === 'trace';

  const clientToPlanFt = (clientX: number, clientY: number): PlanPoint => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, z: 0 };
    const rect = svg.getBoundingClientRect();
    const xPx = clientX - rect.left;
    const zPx = clientY - rect.top;
    return {
      x: xPx / PLAN_SCALE + planOriginX,
      z: zPx / PLAN_SCALE + planOriginZ,
    };
  };

  const addMutation = useMutation({
    mutationFn: async (type: RoomType) => {
      const preset = ROOM_TYPE_PRESETS[type];
      const siblings: RoomRect[] = rooms.map((r) => roomToRect(r));
      const seed = rooms.length * 2;
      const { x: layoutX, z: layoutZ } = findFreeRoomSlot(
        preset.widthFt,
        preset.depthFt,
        siblings,
        seed,
        seed,
      );
      return createRoom(projectId, {
        type,
        name: nextRoomName(type, rooms),
        widthFt: preset.widthFt,
        depthFt: preset.depthFt,
        heightFt: activeStory.defaultHeightFt ?? preset.heightFt,
        storyIndex: activeStory.storyIndex,
        layoutX,
        layoutZ,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms', projectId] });
      setAdding(false);
    },
  });

  const traceRoomMutation = useMutation({
    mutationFn: async (layout: {
      layoutX: number;
      layoutZ: number;
      widthFt: number;
      depthFt: number;
    }) => {
      const preset = ROOM_TYPE_PRESETS[traceRoomType];
      return createRoom(projectId, {
        type: traceRoomType,
        name: nextRoomName(traceRoomType, rooms),
        widthFt: layout.widthFt,
        depthFt: layout.depthFt,
        heightFt: activeStory.defaultHeightFt ?? preset.heightFt,
        storyIndex: activeStory.storyIndex,
        layoutX: layout.layoutX,
        layoutZ: layout.layoutZ,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms', projectId] });
      setImportError(null);
    },
    onError: (err) => {
      setImportError(err instanceof Error ? err.message : 'Could not create room');
    },
  });

  const applyCalibration = () => {
    if (!underlay || !calibrateA || !calibrateB) return;
    setImportError(null);
    try {
      const next = rescaleUnderlayByCalibration(
        underlay,
        calibrateA,
        calibrateB,
        Number(knownFeetInput),
      );
      setUnderlay(next);
      setCalibrateA(null);
      setCalibrateB(null);
      setImportTool('trace');
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Calibration failed');
    }
  };

  const clearCalibrationPicks = () => {
    setCalibrateA(null);
    setCalibrateB(null);
  };

  const layoutMutation = useMutation({
    mutationFn: ({
      roomId,
      layoutX,
      layoutZ,
    }: {
      roomId: string;
      layoutX: number;
      layoutZ: number;
    }) => updateRoom(roomId, { layoutX, layoutZ }),
    onSuccess: ({ room, adjustedRooms }) => {
      const touched = new Map<string, Room>([[room.roomId, room]]);
      for (const adjusted of adjustedRooms) {
        touched.set(adjusted.roomId, adjusted);
      }
      patchRoomsInCache(touched);
      setLayoutOverrides((prev) => {
        const next = { ...prev };
        delete next[room.roomId];
        return next;
      });
    },
    onError: (_err, vars) => {
      // Keep the override visible so the room doesn't snap back on failure.
      setLayoutOverrides((prev) => ({
        ...prev,
        [vars.roomId]: { layoutX: vars.layoutX, layoutZ: vars.layoutZ },
      }));
    },
  });

  const connectionsMutation = useMutation({
    mutationFn: (next: RoomConnection[]) => saveConnections(projectId, next),
    onSuccess: (saved) => {
      queryClient.setQueryData(['connections', projectId], saved);
    },
  });

  const exteriorDoorsMutation = useMutation({
    mutationFn: (next: ExteriorDoor[]) => saveExteriorDoors(projectId, next),
    onSuccess: (saved) => {
      queryClient.setQueryData(['exterior-doors', projectId], saved);
    },
  });

  const patchRoomsInCache = (touched: Map<string, Room>) => {
    queryClient.setQueryData<Room[] | undefined>(['rooms', projectId], (prev) =>
      prev?.map((r) => touched.get(r.roomId) ?? r),
    );
  };

  const flipMutation = useMutation({
    mutationFn: (room: Room) =>
      updateRoom(room.roomId, {
        widthFt: room.depthFt,
        depthFt: room.widthFt,
      }),
    onSuccess: ({ room, adjustedRooms }) => {
      const touched = new Map<string, Room>([[room.roomId, room]]);
      for (const adjusted of adjustedRooms) {
        touched.set(adjusted.roomId, adjusted);
      }
      patchRoomsInCache(touched);
      queryClient.invalidateQueries({ queryKey: ['rooms', projectId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (roomId: string) => deleteRoom(roomId),
    onSuccess: (_result, roomId) => {
      queryClient.setQueryData<Room[] | undefined>(['rooms', projectId], (prev) =>
        prev?.filter((r) => r.roomId !== roomId),
      );
      queryClient.invalidateQueries({ queryKey: ['connections', projectId] });
      queryClient.invalidateQueries({ queryKey: ['exterior-doors', projectId] });
      queryClient.removeQueries({ queryKey: ['room', roomId] });
      queryClient.removeQueries({ queryKey: ['placements', roomId] });
      setLayoutOverrides((prev) => {
        const next = { ...prev };
        delete next[roomId];
        return next;
      });
      if (connectPick === roomId) setConnectPick(null);
      if (draggingId === roomId) setDraggingId(null);
      if (selectedRoomId === roomId) setSelectedRoomId(null);
    },
  });

  const roomDetailsMutation = useMutation({
    mutationFn: ({
      roomId,
      patch,
    }: {
      roomId: string;
      patch: { name: string; type: RoomType };
    }) => updateRoom(roomId, patch),
    onSuccess: ({ room, adjustedRooms }) => {
      const touched = new Map<string, Room>([[room.roomId, room]]);
      for (const adjusted of adjustedRooms) {
        touched.set(adjusted.roomId, adjusted);
      }
      patchRoomsInCache(touched);
    },
  });

  const roomDimensionsMutation = useMutation({
    mutationFn: ({
      roomId,
      dims,
    }: {
      roomId: string;
      dims: { widthFt: number; depthFt: number; heightFt: number };
    }) => updateRoom(roomId, dims),
    onSuccess: ({ room, adjustedRooms }) => {
      const touched = new Map<string, Room>([[room.roomId, room]]);
      for (const adjusted of adjustedRooms) {
        touched.set(adjusted.roomId, adjusted);
      }
      patchRoomsInCache(touched);
    },
  });

  const roomCeilingMutation = useMutation({
    mutationFn: ({
      roomId,
      patch,
    }: {
      roomId: string;
      patch: {
        ceilingType: Room['ceilingType'];
        peakHeightFt?: number;
        ridgeAxis?: Room['ridgeAxis'];
      };
    }) => updateRoom(roomId, patch),
    onSuccess: ({ room, adjustedRooms }) => {
      const touched = new Map<string, Room>([[room.roomId, room]]);
      for (const adjusted of adjustedRooms) {
        touched.set(adjusted.roomId, adjusted);
      }
      patchRoomsInCache(touched);
    },
  });

  const roomFloorMutation = useMutation({
    mutationFn: ({
      roomId,
      floorFinishId,
    }: {
      roomId: string;
      floorFinishId: NonNullable<Room['floorFinishId']>;
    }) => updateRoom(roomId, { floorFinishId }),
    onSuccess: ({ room, adjustedRooms }) => {
      const touched = new Map<string, Room>([[room.roomId, room]]);
      for (const adjusted of adjustedRooms) {
        touched.set(adjusted.roomId, adjusted);
      }
      patchRoomsInCache(touched);
    },
  });

  const selectedRoom = useMemo(
    () => rooms.find((r) => r.roomId === selectedRoomId) ?? null,
    [rooms, selectedRoomId],
  );

  const confirmDeleteRoom = (room: Room) => {
    const ok = window.confirm(
      `Delete "${room.name}"? Its layout, connections, and exterior doors will be removed. This cannot be undone.`,
    );
    if (ok) deleteMutation.mutate(room.roomId);
  };

  // Reset connection picker when leaving connect mode
  useEffect(() => {
    if (mode !== 'connect') setConnectPick(null);
  }, [mode]);

  useEffect(() => {
    if (mode !== 'arrange') setSelectedRoomId(null);
  }, [mode]);

  const otherStoryConnections = useMemo(
    () =>
      allConnections.filter(
        (c) => !storyRoomIds.has(c.roomAId) || !storyRoomIds.has(c.roomBId),
      ),
    [allConnections, storyRoomIds],
  );
  const otherStoryExteriorDoors = useMemo(
    () => allExteriorDoors.filter((d) => !storyRoomIds.has(d.roomId)),
    [allExteriorDoors, storyRoomIds],
  );

  const toggleExteriorDoor = (room: Room, clickXFt: number, clickZFt: number) => {
    const hit = pickExteriorWallAtPoint(room, clickXFt, clickZFt, displayRooms);
    if (!hit) return;

    const existing = exteriorDoors.find(
      (d) =>
        d.roomId === room.roomId &&
        d.side === hit.side &&
        Math.abs(d.offsetFt - hit.offsetFt) < 2.5,
    );
    if (existing) {
      exteriorDoorsMutation.mutate([
        ...otherStoryExteriorDoors,
        ...exteriorDoors.filter((d) => d.doorId !== existing.doorId),
      ]);
      return;
    }

    exteriorDoorsMutation.mutate([
      ...otherStoryExteriorDoors,
      ...exteriorDoors,
      {
        doorId: `ext-${crypto.randomUUID()}`,
        projectId,
        roomId: room.roomId,
        side: hit.side,
        offsetFt: hit.offsetFt,
        widthFt: DOOR_WIDTH_FT,
      },
    ]);
  };

  const toggleConnection = (
    roomA: Room,
    roomB: Room,
    kind: RoomConnection['kind'],
  ) => {
    const roomAId = roomA.roomId;
    const roomBId = roomB.roomId;
    const existing = findConnection(connections, roomAId, roomBId);
    let next: RoomConnection[];
    if (existing && existing.kind === kind) {
      next = connections.filter((c) => c.connectionId !== existing.connectionId);
    } else if (existing) {
      next = connections.map((c) =>
        c.connectionId === existing.connectionId ? { ...c, kind } : c,
      );
    } else {
      const edge = sharedEdge(roomRect(roomA), roomRect(roomB));
      next = [
        ...connections,
        {
          connectionId: `conn-${crypto.randomUUID()}`,
          projectId,
          roomAId,
          roomBId,
          kind,
          sideA: edge?.side,
          sideB: edge ? oppositeWallSide(edge.side) : undefined,
        },
      ];
    }
    connectionsMutation.mutate([...otherStoryConnections, ...next]);
  };

  const onPickForConnect = (roomId: string) => {
    if (!connectPick) {
      setConnectPick(roomId);
      return;
    }
    if (connectPick === roomId) {
      setConnectPick(null);
      return;
    }
    const a = rooms.find((r) => r.roomId === connectPick);
    const b = rooms.find((r) => r.roomId === roomId);
    if (a && b && roomsAreAdjacent(a, b)) {
      // Toggle through: no connection -> open -> door -> no connection
      const existing = findConnection(connections, a.roomId, b.roomId);
      const nextKind: RoomConnection['kind'] | null = !existing
        ? 'open'
        : existing.kind === 'open'
          ? 'door'
          : null;
      if (nextKind) {
        toggleConnection(a, b, nextKind);
      } else {
        connectionsMutation.mutate([
          ...otherStoryConnections,
          ...connections.filter((c) => c.connectionId !== existing!.connectionId),
        ]);
      }
    }
    setConnectPick(null);
  };

  return (
    <div className="space-y-4">
      {onStoriesChange && (
        <StoryLevelBar
          stories={stories}
          rooms={houseRooms}
          activeStoryIndex={activeStory.storyIndex}
          busy={storiesSaving}
          onSelectStory={setActiveStoryIndex}
          onChangeStories={onStoriesChange}
        />
      )}

      <FloorPlanOverviewPanel
        overview={overview}
        storyLabel={activeStory.label}
        partialFootprint={Boolean(activeStory.partialFootprint)}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-1.5 rounded-full bg-stone-100 p-1 text-xs">
            <ModeButton active={mode === 'arrange'} onClick={() => setMode('arrange')}>
              Arrange
            </ModeButton>
            <ModeButton active={mode === 'connect'} onClick={() => setMode('connect')}>
              Connect rooms
            </ModeButton>
            <ModeButton
              active={mode === 'exterior-doors'}
              onClick={() => setMode('exterior-doors')}
            >
              Exterior doors
            </ModeButton>
          </div>
          <p className="text-xs text-stone-500">
            {importTool === 'calibrate'
              ? 'Import: click two points on a known wall length, then enter the real feet and Apply.'
              : importTool === 'trace'
                ? 'Import: drag rectangles on the underlay to create rooms. Set room type in Import plan.'
                : mode === 'arrange'
                  ? 'Click a room to edit it, or drag to reposition. Rooms snap edge-to-edge and cannot overlap.'
                  : mode === 'connect'
                    ? connectPick
                      ? 'Click an adjacent room to toggle: open → door → none.'
                      : 'Click a room to start, then click another adjacent room to connect.'
                    : 'Click an exterior wall (not shared with another room) to add or remove a 3ft door.'}
          </p>
          {importError && <p className="text-xs text-red-600">{importError}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowGrid((v) => !v)}
            aria-pressed={showGrid}
            className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:border-[var(--sage-600)]"
          >
            {showGrid ? 'Hide grid' : 'Show grid'}
          </button>
          <ExportFloorPlanButton projectName={projectName} rooms={displayRooms} />
          <ImportFloorPlanPanel
            projectId={projectId}
            underlay={underlay}
            importTool={importTool}
            calibratePickCount={(calibrateA ? 1 : 0) + (calibrateB ? 1 : 0)}
            knownFeetInput={knownFeetInput}
            traceRoomType={traceRoomType}
            calibratedDistanceFt={
              calibrateA && calibrateB ? distanceFt(calibrateA, calibrateB) : null
            }
            onUnderlayChange={(next) => {
              if (underlay?.url.startsWith('blob:') && underlay.url !== next?.url) {
                URL.revokeObjectURL(underlay.url);
              }
              setUnderlay(next);
              clearCalibrationPicks();
              setTraceDraft(null);
              setImportError(null);
            }}
            onImportToolChange={(tool) => {
              setImportTool(tool);
              if (tool !== 'calibrate') clearCalibrationPicks();
              if (tool !== 'trace') setTraceDraft(null);
              if (tool !== 'off') setMode('arrange');
            }}
            onKnownFeetInputChange={setKnownFeetInput}
            onTraceRoomTypeChange={setTraceRoomType}
            onApplyCalibration={applyCalibration}
            onClearCalibrationPicks={clearCalibrationPicks}
            existingConnections={allConnections}
            defaultStoryIndex={activeStory.storyIndex}
            onLayoutImported={() => {
              queryClient.invalidateQueries({ queryKey: ['rooms', projectId] });
              queryClient.invalidateQueries({ queryKey: ['connections', projectId] });
            }}
          />
          <Link
            href={`/projects/${projectId}/3d`}
            className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:border-[var(--sage-600)]"
          >
            View whole home in 3D →
          </Link>
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="btn-primary text-sm"
          >
            + Add room
          </button>
        </div>
      </div>

      {adding && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ROOM_TYPES.map((type) => (
            <AddRoomCard
              key={type}
              preset={ROOM_TYPE_PRESETS[type]}
              pending={addMutation.isPending}
              onAdd={() => addMutation.mutate(type)}
            />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div
          className="relative min-w-0 flex-1 overflow-auto rounded-2xl border border-stone-200 bg-[#f5f3f0] shadow-inner"
          style={{ maxHeight: 'min(70vh, 560px)' }}
          onPointerDown={() => {
            if (mode === 'arrange') setSelectedRoomId(null);
          }}
        >
          <svg
            ref={svgRef}
            width={canvasW}
            height={canvasH}
            className="block"
            data-floor-plan-svg
            style={{ minWidth: canvasW, minHeight: canvasH }}
          >
          <defs>
            <pattern
              id="planGrid"
              width={PLAN_SCALE}
              height={PLAN_SCALE}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M ${PLAN_SCALE} 0 L 0 0 0 ${PLAN_SCALE}`}
                fill="none"
                stroke="#d6d3d1"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          {showGrid ? <rect width={canvasW} height={canvasH} fill="url(#planGrid)" /> : null}

          <g transform={planTransform}>
            {underlay && (
              <image
                href={underlay.url}
                x={underlay.originX * PLAN_SCALE}
                y={underlay.originZ * PLAN_SCALE}
                width={underlay.widthFt * PLAN_SCALE}
                height={underlay.heightFt * PLAN_SCALE}
                opacity={underlay.opacity}
                preserveAspectRatio="none"
                style={{ pointerEvents: 'none' }}
              />
            )}

            {displayRooms.length > 0 && (
              <FootprintDimensionBox bounds={overview.bounds} />
            )}

            {ghostMainRooms.length > 0 && (
              <g className="pointer-events-none" opacity={0.45}>
                {ghostMainRooms.map((room) => (
                  <rect
                    key={`ghost-${room.roomId}`}
                    x={(room.layoutX ?? 0) * PLAN_SCALE}
                    y={(room.layoutZ ?? 0) * PLAN_SCALE}
                    width={room.widthFt * PLAN_SCALE}
                    height={room.depthFt * PLAN_SCALE}
                    fill="none"
                    stroke="#a8a29e"
                    strokeWidth={1.25}
                    strokeDasharray="5 4"
                    rx={2}
                  />
                ))}
                <text
                  x={planBounds.centerX * PLAN_SCALE}
                  y={(planBounds.minZ - 1.25) * PLAN_SCALE}
                  textAnchor="middle"
                  fill="#78716c"
                  style={{ fontSize: 10, fontWeight: 600 }}
                >
                  Main level (ghost)
                </text>
              </g>
            )}

            {/* All wall strokes paint in one pass so touching rooms share a
                single visible wall instead of stacking. Room floor fills are
                painted afterwards in the room loop below, covering the inside
                half of every stroke. */}
            <g pointerEvents="none">
              {displayRooms.map((room) =>
                mergedGroupByRoomId.has(room.roomId) ? null : (
                  <RoomWallRing
                    key={`wall-${room.roomId}`}
                    layoutX={room.layoutX ?? 0}
                    layoutZ={room.layoutZ ?? 0}
                    widthFt={room.widthFt}
                    depthFt={room.depthFt}
                  />
                ),
              )}
              {mergedGroups.map((group) => (
                <MergedGroupWalls key={`wall-group-${group.id}`} group={group} />
              ))}
            </g>

            {mergedGroups.map((group) => (
              <ConnectedRoomGroupBlock
                key={group.id}
                group={group}
                connections={connections}
              />
            ))}

            <g style={{ pointerEvents: importCaptureActive ? 'none' : undefined }}>
              {displayRooms.map((room) => (
                <RoomBlock
                  key={room.roomId}
                  room={room}
                  mode={mode}
                  inMergedGroup={mergedGroupByRoomId.has(room.roomId)}
                  isDragging={draggingId === room.roomId}
                  isSelected={selectedRoomId === room.roomId}
                  isConnectPick={connectPick === room.roomId}
                  projectId={projectId}
                  planOriginX={planOriginX}
                  planOriginZ={planOriginZ}
                  siblings={displayRooms
                    .filter((r) => r.roomId !== room.roomId)
                    .map((r) => roomToRect(r))}
                  onConnect={onPickForConnect}
                  onExteriorDoor={toggleExteriorDoor}
                  onFlip={() => flipMutation.mutate(room)}
                  flipPending={flipMutation.isPending}
                  onDragStart={() => setDraggingId(room.roomId)}
                  onDragMove={(layoutX, layoutZ) =>
                    setLayoutOverrides((prev) => ({
                      ...prev,
                      [room.roomId]: { layoutX, layoutZ },
                    }))
                  }
                  onDragEnd={(layoutX, layoutZ, moved) => {
                    setDraggingId(null);
                    if (!moved && mode === 'arrange') {
                      setSelectedRoomId(room.roomId);
                      setLayoutOverrides((prev) => {
                        const next = { ...prev };
                        delete next[room.roomId];
                        return next;
                      });
                      return;
                    }
                    const committed = rooms.find((r) => r.roomId === room.roomId);
                    const committedX = committed?.layoutX ?? 0;
                    const committedZ = committed?.layoutZ ?? 0;
                    if (
                      Math.abs(committedX - layoutX) < 0.01 &&
                      Math.abs(committedZ - layoutZ) < 0.01
                    ) {
                      setLayoutOverrides((prev) => {
                        const next = { ...prev };
                        delete next[room.roomId];
                        return next;
                      });
                      return;
                    }
                    layoutMutation.mutate({
                      roomId: room.roomId,
                      layoutX,
                      layoutZ,
                    });
                  }}
                />
              ))}
            </g>

            {exteriorDoors.map((door) => {
              const room = displayRooms.find((r) => r.roomId === door.roomId);
              if (!room) return null;
              return (
                <ExteriorDoorMarker
                  key={door.doorId}
                  room={room}
                  door={door}
                />
              );
            })}

            {/* Connection labels on shared walls (skip pairs inside a merged group) */}
            {connections.flatMap((conn) => {
            const a = displayRooms.find((r) => r.roomId === conn.roomAId);
            const b = displayRooms.find((r) => r.roomId === conn.roomBId);
            if (!a || !b) return [];
            const groupA = mergedGroupByRoomId.get(conn.roomAId);
            const groupB = mergedGroupByRoomId.get(conn.roomBId);
            if (groupA && groupB && groupA.id === groupB.id) return [];

            return ([
              { room: a, other: b },
              { room: b, other: a },
            ] as const).flatMap(({ room, other }) => {
              const edge = sharedEdge(roomRect(room), roomRect(other));
              if (!edge) return [];
              const pos = connectionLabelPosition(room, edge);
              const stroke = conn.kind === 'open' ? '#5c7a6a' : '#a78bfa';
              const fill = conn.kind === 'open' ? '#3f5b4d' : '#7c3aed';
              const label = `${conn.kind === 'open' ? '↔' : 'door'} ${edgeSideLabel(edge.side)} · ${other.name}`;

              return [
                <g key={`${conn.connectionId}-${room.roomId}`} className="pointer-events-none">
                  <rect
                    x={pos.x - label.length * 2.8}
                    y={pos.y - 9}
                    width={label.length * 5.6}
                    height={16}
                    rx={4}
                    fill="white"
                    stroke={stroke}
                    strokeWidth={1}
                    opacity={0.95}
                  />
                  <text
                    x={pos.x}
                    y={pos.y + 3}
                    textAnchor="middle"
                    style={{ fontSize: 9, fontWeight: 700 }}
                    fill={fill}
                  >
                    {label}
                  </text>
                </g>,
              ];
            });
          })}

            {importCaptureActive && (
              <rect
                x={planOriginX * PLAN_SCALE}
                y={planOriginZ * PLAN_SCALE}
                width={(canvasBounds.widthFt + PLAN_PAD_FT * 2) * PLAN_SCALE}
                height={(canvasBounds.depthFt + PLAN_PAD_FT * 2) * PLAN_SCALE}
                fill="transparent"
                style={{
                  cursor: importTool === 'trace' ? 'crosshair' : 'cell',
                  touchAction: 'none',
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  const pt = clientToPlanFt(e.clientX, e.clientY);
                  if (importTool === 'calibrate') {
                    if (!calibrateA) {
                      setCalibrateA(pt);
                      setCalibrateB(null);
                    } else if (!calibrateB) {
                      setCalibrateB(pt);
                    } else {
                      setCalibrateA(pt);
                      setCalibrateB(null);
                    }
                    return;
                  }
                  (e.currentTarget as SVGRectElement).setPointerCapture?.(e.pointerId);
                  setTraceDraft({ x1: pt.x, z1: pt.z, x2: pt.x, z2: pt.z });
                }}
                onPointerMove={(e) => {
                  if (importTool !== 'trace' || !traceDraft) return;
                  const pt = clientToPlanFt(e.clientX, e.clientY);
                  setTraceDraft((prev) =>
                    prev ? { ...prev, x2: pt.x, z2: pt.z } : prev,
                  );
                }}
                onPointerUp={(e) => {
                  if (importTool !== 'trace' || !traceDraft) return;
                  const pt = clientToPlanFt(e.clientX, e.clientY);
                  const draft = { ...traceDraft, x2: pt.x, z2: pt.z };
                  setTraceDraft(null);
                  const layout = rectToRoomLayout(
                    draft.x1,
                    draft.z1,
                    draft.x2,
                    draft.z2,
                  );
                  if (!layout) {
                    setImportError('Room must be at least 3′ × 3′ — drag a larger rectangle.');
                    return;
                  }
                  traceRoomMutation.mutate(layout);
                }}
              />
            )}

            {calibrateA && (
              <circle
                cx={calibrateA.x * PLAN_SCALE}
                cy={calibrateA.z * PLAN_SCALE}
                r={5}
                fill="#b45309"
                className="pointer-events-none"
              />
            )}
            {calibrateB && (
              <circle
                cx={calibrateB.x * PLAN_SCALE}
                cy={calibrateB.z * PLAN_SCALE}
                r={5}
                fill="#b45309"
                className="pointer-events-none"
              />
            )}
            {calibrateA && calibrateB && (
              <line
                x1={calibrateA.x * PLAN_SCALE}
                y1={calibrateA.z * PLAN_SCALE}
                x2={calibrateB.x * PLAN_SCALE}
                y2={calibrateB.z * PLAN_SCALE}
                stroke="#b45309"
                strokeWidth={2}
                strokeDasharray="4 3"
                className="pointer-events-none"
              />
            )}
            {traceDraft && (
              <rect
                x={Math.min(traceDraft.x1, traceDraft.x2) * PLAN_SCALE}
                y={Math.min(traceDraft.z1, traceDraft.z2) * PLAN_SCALE}
                width={Math.abs(traceDraft.x2 - traceDraft.x1) * PLAN_SCALE}
                height={Math.abs(traceDraft.z2 - traceDraft.z1) * PLAN_SCALE}
                fill="rgba(63, 91, 77, 0.2)"
                stroke="#3f5b4d"
                strokeWidth={2}
                className="pointer-events-none"
              />
            )}
          </g>
        </svg>
        </div>

        {mode === 'arrange' && !importCaptureActive && selectedRoom && (
          <FloorPlanRoomPanel
            room={selectedRoom}
            projectId={projectId}
            onClose={() => setSelectedRoomId(null)}
            onSaveDetails={(patch) =>
              roomDetailsMutation.mutate({ roomId: selectedRoom.roomId, patch })
            }
            onApplyDimensions={(dims) =>
              roomDimensionsMutation.mutate({ roomId: selectedRoom.roomId, dims })
            }
            onSaveCeiling={(patch) =>
              roomCeilingMutation.mutate({ roomId: selectedRoom.roomId, patch })
            }
            onSaveFloorFinish={(floorFinishId) =>
              roomFloorMutation.mutate({ roomId: selectedRoom.roomId, floorFinishId })
            }
            onDelete={() => confirmDeleteRoom(selectedRoom)}
            isSavingDetails={roomDetailsMutation.isPending}
            isSavingDimensions={roomDimensionsMutation.isPending}
            isSavingCeiling={roomCeilingMutation.isPending}
            isSavingFloor={roomFloorMutation.isPending}
            isDeleting={deleteMutation.isPending}
          />
        )}
      </div>

      {exteriorDoors.length > 0 && (
        <div className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-600">
          <p className="mb-1 font-semibold text-stone-700">Exterior doors</p>
          <ul className="space-y-1">
            {exteriorDoors.map((door) => {
              const room = rooms.find((r) => r.roomId === door.roomId);
              if (!room) return null;
              return (
                <li key={door.doorId} className="flex items-center justify-between">
                  <span>
                    {room.name} · {edgeSideLabel(door.side)} wall
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      exteriorDoorsMutation.mutate([
                        ...otherStoryExteriorDoors,
                        ...exteriorDoors.filter((d) => d.doorId !== door.doorId),
                      ])
                    }
                    className="text-[11px] text-stone-500 hover:text-stone-800"
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {connections.length > 0 && (
        <div className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-600">
          <p className="mb-1 font-semibold text-stone-700">Open connections</p>
          <ul className="space-y-1">
            {connections.map((conn) => {
              const a = rooms.find((r) => r.roomId === conn.roomAId);
              const b = rooms.find((r) => r.roomId === conn.roomBId);
              if (!a || !b) return null;
              return (
                <li
                  key={conn.connectionId}
                  className="flex items-center justify-between"
                >
                  <span>
                    {a.name} ↔ {b.name}{' '}
                    <span
                      className={clsx(
                        'ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase',
                        conn.kind === 'open'
                          ? 'bg-[var(--sage-100)] text-[var(--sage-800)]'
                          : 'bg-violet-100 text-violet-700',
                      )}
                    >
                      {conn.kind}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      connectionsMutation.mutate(
                        connections.filter(
                          (c) => c.connectionId !== conn.connectionId,
                        ),
                      )
                    }
                    className="text-[11px] text-stone-500 hover:text-stone-800"
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <ul className="grid gap-2 sm:grid-cols-2">
        {rooms.map((room) => {
          const preset = roomTypePreset(room.type);
          const isSelected = mode === 'arrange' && selectedRoomId === room.roomId;
          return (
            <li
              key={room.roomId}
              className={clsx(
                'flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition',
                isSelected
                  ? 'border-[var(--sage-600)] bg-[var(--sage-50)] ring-1 ring-[var(--sage-600)]'
                  : 'border-stone-200 bg-white',
                mode === 'arrange' && 'cursor-pointer hover:border-stone-300',
              )}
              onClick={() => {
                if (mode === 'arrange') setSelectedRoomId(room.roomId);
              }}
            >
              <div>
                <p className="font-semibold text-stone-800">{room.name}</p>
                <p className="text-xs text-stone-500">
                  {preset.label}
                  {preset.hasCatalogPricing
                    ? ' · catalog pricing'
                    : ' · custom blocks only'}
                </p>
              </div>
              {isSelected && (
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    disabled={flipMutation.isPending}
                    onClick={(e) => {
                      e.stopPropagation();
                      flipMutation.mutate(room);
                    }}
                    className="rounded-full border border-stone-200 px-2 py-0.5 text-[11px] font-semibold text-stone-600 hover:border-[var(--sage-600)] hover:text-[var(--sage-800)] disabled:opacity-50"
                    title="Swap width and length"
                  >
                    Flip ↻
                  </button>
                  <button
                    type="button"
                    disabled={deleteMutation.isPending}
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmDeleteRoom(room);
                    }}
                    className="rounded-full border border-red-200 px-2 py-0.5 text-[11px] font-semibold text-red-600 hover:border-red-400 hover:text-red-800 disabled:opacity-50"
                    title="Delete room"
                  >
                    Delete
                  </button>
                  <Link
                    href={`/planner/${projectId}/${room.roomId}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs font-semibold text-[var(--sage-700)] hover:underline"
                  >
                    Plan →
                  </Link>
                </div>
              )}
            </li>
          );
        })}
      </ul>
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
        'rounded-full px-3 py-1 font-semibold transition',
        active
          ? 'bg-white text-stone-800 shadow-sm'
          : 'text-stone-500 hover:text-stone-700',
      )}
    >
      {children}
    </button>
  );
}

function FloorPlanOverviewPanel({
  overview,
  storyLabel,
  partialFootprint,
}: {
  overview: ReturnType<typeof computeFloorPlanOverview>;
  storyLabel?: string;
  partialFootprint?: boolean;
}) {
  const w = formatFeetInches(overview.footprintWidthFt);
  const d = formatFeetInches(overview.footprintDepthFt);

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">
        Overview{storyLabel ? ` · ${storyLabel}` : ''}
      </h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <OverviewStat label="Level area" value={`${overview.totalSqFt.toLocaleString()} sq ft`} />
        <OverviewStat label="Level footprint" value={`${w} × ${d}`} />
        <OverviewStat label="Rooms" value={String(overview.roomCount)} />
      </div>
      <p className="mt-2 text-xs text-stone-500">
        Stats are for the active story only.
        {partialFootprint
          ? ' This level is marked partial (loft/attic) — dashed lines show the main floor below.'
          : ' Footprint is the bounding box of rooms on this level.'}
      </p>
    </section>
  );
}

function OverviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-stone-50 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-0.5 text-lg font-bold text-stone-900">{value}</p>
    </div>
  );
}

function RoomWallRing({
  layoutX,
  layoutZ,
  widthFt,
  depthFt,
}: {
  layoutX: number;
  layoutZ: number;
  widthFt: number;
  depthFt: number;
}) {
  const x = layoutX * PLAN_SCALE;
  const y = layoutZ * PLAN_SCALE;
  const w = widthFt * PLAN_SCALE;
  const h = depthFt * PLAN_SCALE;
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      fill="none"
      stroke={WALL_COLOR}
      strokeWidth={WALL_STROKE_PX}
    />
  );
}

function MergedGroupWalls({
  group,
}: {
  group: ReturnType<typeof findConnectedRoomGroups>[number];
}) {
  const rects = group.rooms.map(roomRect);
  const boundary = unionBoundarySegments(rects);
  return (
    <g>
      {boundary.map((seg, i) => {
        const line = segmentToLine(seg, PLAN_SCALE);
        return (
          <line
            key={`wall-${i}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={WALL_COLOR}
            strokeWidth={WALL_STROKE_PX}
            strokeLinecap="square"
          />
        );
      })}
    </g>
  );
}

function ConnectedRoomGroupBlock({
  group,
  connections,
}: {
  group: ReturnType<typeof findConnectedRoomGroups>[number];
  connections: RoomConnection[];
}) {
  const rects = group.rooms.map(roomRect);
  const boundary = unionBoundarySegments(rects);
  const labels = internalConnectionLabels(group, connections);

  return (
    <g className="pointer-events-none">
      {group.rooms.map((room) => {
        const x = (room.layoutX ?? 0) * PLAN_SCALE;
        const y = (room.layoutZ ?? 0) * PLAN_SCALE;
        const w = room.widthFt * PLAN_SCALE;
        const h = room.depthFt * PLAN_SCALE;
        return (
          <rect key={`fill-${room.roomId}`} x={x} y={y} width={w} height={h} fill={GROUP_FILL} />
        );
      })}
      {boundary.map((seg, i) => {
        const line = segmentToLine(seg, PLAN_SCALE);
        return (
          <line
            key={`edge-${i}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={GROUP_STROKE}
            strokeWidth={1.25}
            strokeLinecap="square"
          />
        );
      })}
      {labels.map((label) => {
        const stroke = label.kind === 'open' ? '#5c7a6a' : '#a78bfa';
        const fill = label.kind === 'open' ? '#3f5b4d' : '#7c3aed';
        const text = `${label.kind === 'open' ? '↔' : 'door'} ${edgeSideLabel(label.side)} · ${label.otherName}`;
        const pos = mergedGroupLabelPosition(label.labelX, label.labelZ, label.side);
        return (
          <g key={label.connectionId}>
            <rect
              x={pos.x - text.length * 2.8}
              y={pos.y - 9}
              width={text.length * 5.6}
              height={16}
              rx={4}
              fill="white"
              stroke={stroke}
              strokeWidth={1}
              opacity={0.95}
            />
            <text
              x={pos.x}
              y={pos.y + 3}
              textAnchor="middle"
              style={{ fontSize: 9, fontWeight: 700 }}
              fill={fill}
            >
              {text}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function mergedGroupLabelPosition(
  labelXFt: number,
  labelZFt: number,
  side: RoomWallSide,
): { x: number; y: number } {
  const x = labelXFt * PLAN_SCALE;
  const y = labelZFt * PLAN_SCALE;
  switch (side) {
    case 'back':
      return { x, y: y - 6 };
    case 'front':
      return { x, y: y + 14 };
    case 'left':
      return { x: x - 6, y };
    case 'right':
      return { x: x + 6, y };
  }
}

function FootprintDimensionBox({
  bounds,
}: {
  bounds: ReturnType<typeof computeFloorPlanOverview>['bounds'];
}) {
  const wallPad = WALL_THICKNESS_FT * PLAN_SCALE;
  const x = bounds.minX * PLAN_SCALE - wallPad;
  const y = bounds.minZ * PLAN_SCALE - wallPad;
  const w = bounds.widthFt * PLAN_SCALE + wallPad * 2;
  const h = bounds.depthFt * PLAN_SCALE + wallPad * 2;
  const wLabel = formatFeetInches(bounds.widthFt);
  const dLabel = formatFeetInches(bounds.depthFt);

  return (
    <g className="pointer-events-none">
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill="none"
        stroke="#78716c"
        strokeWidth={1.5}
        strokeDasharray="6 4"
        rx={2}
      />
      <text
        x={x + w / 2}
        y={y - 8}
        textAnchor="middle"
        fill="#57534e"
        style={{ fontSize: 11, fontWeight: 700 }}
      >
        {wLabel} wide
      </text>
      <text
        x={x - 8}
        y={y + h / 2}
        textAnchor="middle"
        fill="#57534e"
        transform={`rotate(-90 ${x - 8} ${y + h / 2})`}
        style={{ fontSize: 11, fontWeight: 700 }}
      >
        {dLabel} long
      </text>
    </g>
  );
}

function ExteriorDoorMarker({
  room,
  door,
}: {
  room: Room;
  door: ExteriorDoor;
}) {
  const lx = room.layoutX ?? 0;
  const lz = room.layoutZ ?? 0;
  const width = door.widthFt ?? DOOR_WIDTH_FT;
  const half = width / 2;
  const pos = doorPositionOnWall(room, door.side, door.offsetFt, half);

  return (
    <g className="pointer-events-none">
      <line
        x1={pos.x1}
        y1={pos.y1}
        x2={pos.x2}
        y2={pos.y2}
        stroke="#d97706"
        strokeWidth={4}
        strokeLinecap="round"
      />
      <text
        x={pos.labelX}
        y={pos.labelY}
        textAnchor="middle"
        fill="#92400e"
        style={{ fontSize: 8, fontWeight: 700 }}
      >
        OUT
      </text>
    </g>
  );
}

function doorPositionOnWall(
  room: Room,
  side: RoomWallSide,
  offsetFt: number,
  halfWidthFt: number,
): { x1: number; y1: number; x2: number; y2: number; labelX: number; labelY: number } {
  const lx = (room.layoutX ?? 0) * PLAN_SCALE;
  const lz = (room.layoutZ ?? 0) * PLAN_SCALE;
  const w = room.widthFt * PLAN_SCALE;
  const h = room.depthFt * PLAN_SCALE;
  const o = offsetFt * PLAN_SCALE;
  const hw = halfWidthFt * PLAN_SCALE;

  switch (side) {
    case 'back':
      return {
        x1: lx + o - hw,
        y1: lz,
        x2: lx + o + hw,
        y2: lz,
        labelX: lx + o,
        labelY: lz - 4,
      };
    case 'front':
      return {
        x1: lx + o - hw,
        y1: lz + h,
        x2: lx + o + hw,
        y2: lz + h,
        labelX: lx + o,
        labelY: lz + h + 10,
      };
    case 'left':
      return {
        x1: lx,
        y1: lz + o - hw,
        x2: lx,
        y2: lz + o + hw,
        labelX: lx - 4,
        labelY: lz + o + 3,
      };
    case 'right':
      return {
        x1: lx + w,
        y1: lz + o - hw,
        x2: lx + w,
        y2: lz + o + hw,
        labelX: lx + w + 4,
        labelY: lz + o + 3,
      };
  }
}

function RoomBlock({
  room,
  mode,
  inMergedGroup,
  isDragging,
  isSelected,
  isConnectPick,
  projectId,
  planOriginX,
  planOriginZ,
  siblings,
  onConnect,
  onExteriorDoor,
  onFlip,
  flipPending,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  room: Room;
  mode: Mode;
  inMergedGroup: boolean;
  isDragging: boolean;
  isSelected: boolean;
  isConnectPick: boolean;
  projectId: string;
  planOriginX: number;
  planOriginZ: number;
  siblings: RoomRect[];
  onConnect: (roomId: string) => void;
  onExteriorDoor: (room: Room, clickXFt: number, clickZFt: number) => void;
  onFlip: () => void;
  flipPending: boolean;
  onDragStart: () => void;
  onDragMove: (layoutX: number, layoutZ: number) => void;
  onDragEnd: (layoutX: number, layoutZ: number, moved: boolean) => void;
}) {
  const lx = room.layoutX ?? 0;
  const lz = room.layoutZ ?? 0;
  const preset = roomTypePreset(room.type);
  const x = lx * PLAN_SCALE;
  const y = lz * PLAN_SCALE;
  const w = room.widthFt * PLAN_SCALE;
  const h = room.depthFt * PLAN_SCALE;
  const fill = getFloorFinish(resolveFloorFinishId(room)).planTint;

  // Drag state lives in refs so pointermove handler stays stable & cheap.
  const dragRef = useRef<{
    startClientX: number;
    startClientY: number;
    startLayoutX: number;
    startLayoutZ: number;
    moved: boolean;
  } | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const beginDrag = (e: React.PointerEvent<SVGRectElement>) => {
    if (mode !== 'arrange') return;
    e.preventDefault();
    (e.currentTarget as SVGRectElement).setPointerCapture?.(e.pointerId);
    dragRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      startLayoutX: lx,
      startLayoutZ: lz,
      moved: false,
    };
    onDragStart();
  };

  const onPointerMove = (e: React.PointerEvent<SVGRectElement>) => {
    const state = dragRef.current;
    if (!state) return;
    const dx = (e.clientX - state.startClientX) / PLAN_SCALE;
    const dz = (e.clientY - state.startClientY) / PLAN_SCALE;
    const proposedX = snapLayoutFt(state.startLayoutX + dx);
    const proposedZ = snapLayoutFt(state.startLayoutZ + dz);
    const resolved = snapAndResolveRoomPosition(
      { roomId: room.roomId, x: proposedX, z: proposedZ, w: room.widthFt, d: room.depthFt },
      siblings,
    );
    const newX = snapLayoutFt(resolved.x);
    const newZ = snapLayoutFt(resolved.z);
    if (newX === lx && newZ === lz) return;
    state.moved = true;
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      onDragMove(newX, newZ);
    });
  };

  const finishDrag = (e: React.PointerEvent<SVGRectElement>) => {
    const state = dragRef.current;
    if (!state) return;
    (e.currentTarget as SVGRectElement).releasePointerCapture?.(e.pointerId);
    dragRef.current = null;
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const dx = (e.clientX - state.startClientX) / PLAN_SCALE;
    const dz = (e.clientY - state.startClientY) / PLAN_SCALE;
    const proposedX = snapLayoutFt(state.startLayoutX + dx);
    const proposedZ = snapLayoutFt(state.startLayoutZ + dz);
    const resolved = snapAndResolveRoomPosition(
      { roomId: room.roomId, x: proposedX, z: proposedZ, w: room.widthFt, d: room.depthFt },
      siblings,
    );
    const finalX = snapLayoutFt(resolved.x);
    const finalZ = snapLayoutFt(resolved.z);
    onDragEnd(finalX, finalZ, state.moved);
  };

  const isInteractive = mode === 'arrange' || mode === 'connect' || mode === 'exterior-doors';
  const strokeColor = isConnectPick
    ? '#7c3aed'
    : isSelected
      ? '#3f5b4d'
      : isDragging
        ? '#5c7a6a'
        : inMergedGroup
          ? 'transparent'
          : '#78716c';
  const strokeWidth = isConnectPick ? 3 : isSelected ? 3 : isDragging ? 2.5 : inMergedGroup ? 0 : 1.5;

  const clientToPlanFt = (clientX: number, clientY: number) => {
    const svg = document.querySelector('[data-floor-plan-svg]') as SVGSVGElement | null;
    if (!svg) return { x: 0, z: 0 };
    const rect = svg.getBoundingClientRect();
    const xPx = clientX - rect.left + svg.scrollLeft;
    const zPx = clientY - rect.top + svg.scrollTop;
    return {
      x: xPx / PLAN_SCALE + planOriginX,
      z: zPx / PLAN_SCALE + planOriginZ,
    };
  };

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={2}
        fill={inMergedGroup ? 'transparent' : fill}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        className={clsx(
          mode === 'arrange' && 'cursor-grab active:cursor-grabbing',
          mode === 'connect' && 'cursor-pointer',
          mode === 'exterior-doors' && 'cursor-crosshair',
        )}
        onPointerDown={(e) => {
          e.stopPropagation();
          if (mode === 'connect') {
            onConnect(room.roomId);
            return;
          }
          if (mode === 'exterior-doors') {
            const pt = clientToPlanFt(e.clientX, e.clientY);
            onExteriorDoor(room, pt.x, pt.z);
            return;
          }
          beginDrag(e);
        }}
        onPointerMove={onPointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        style={{ touchAction: isInteractive ? 'none' : undefined }}
      />
      <text
        x={x + w / 2}
        y={y + h / 2 - 6}
        textAnchor="middle"
        className="pointer-events-none select-none fill-stone-800 text-[11px] font-bold"
        style={{ fontSize: 11 }}
      >
        {room.name}
      </text>
      <text
        x={x + w / 2}
        y={y + h / 2 + 10}
        textAnchor="middle"
        className="pointer-events-none select-none fill-stone-600"
        style={{ fontSize: 9 }}
      >
        {preset.label} · {formatFeetInchesPair(room.widthFt, room.depthFt)}
      </text>
      {mode === 'arrange' && isSelected && w >= 36 && h >= 28 && (
        <foreignObject x={x + w - 52} y={y + 4} width={48} height={18}>
          <button
            type="button"
            disabled={flipPending}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onFlip();
            }}
            className="block w-full rounded bg-white/95 px-1 py-0.5 text-center text-[9px] font-bold text-stone-700 shadow hover:bg-white disabled:opacity-50"
            title="Flip width ↔ length"
          >
            Flip ↻
          </button>
        </foreignObject>
      )}
      {mode === 'arrange' && isSelected && w >= 44 && h >= 24 && (
        <foreignObject x={x + 4} y={y + h - 22} width={Math.min(Math.max(w - 8, 24), 72)} height={18}>
        <Link
          href={`/planner/${projectId}/${room.roomId}`}
          className="block rounded bg-white/90 px-2 py-0.5 text-center text-[10px] font-semibold text-[var(--sage-800)] shadow hover:bg-white"
        >
          Open 3D →
        </Link>
      </foreignObject>
      )}
    </g>
  );
}

function AddRoomCard({
  preset,
  onAdd,
  pending,
}: {
  preset: RoomTypePreset;
  onAdd: () => void;
  pending: boolean;
}) {
  return (
    <button
      type="button"
      disabled={pending}
      onClick={onAdd}
      className={clsx(
        'rounded-xl border border-stone-200 bg-white p-3 text-left transition hover:border-[var(--sage-600)] hover:shadow-sm',
        pending && 'opacity-60',
      )}
    >
      <p className="font-semibold text-stone-800">{preset.label}</p>
      <p className="mt-0.5 text-xs text-stone-500">{preset.description}</p>
      <p className="mt-1 text-[11px] text-stone-400">
        {preset.widthFt}&apos; × {preset.depthFt}&apos; default
      </p>
    </button>
  );
}

function nextRoomName(type: RoomType, rooms: Room[]): string {
  const preset = ROOM_TYPE_PRESETS[type];
  const same = rooms.filter((r) => normalizeRoomType(r.type) === type).length;
  if (same === 0) return preset.name;
  return `${preset.name} ${same + 1}`;
}

function edgeSideLabel(side: 'back' | 'front' | 'left' | 'right'): string {
  switch (side) {
    case 'back':
      return 'Back';
    case 'front':
      return 'Front';
    case 'left':
      return 'Left';
    case 'right':
      return 'Right';
  }
}

function connectionLabelPosition(
  room: Room,
  edge: { side: 'back' | 'front' | 'left' | 'right'; start: number; end: number },
): { x: number; y: number } {
  const lx = room.layoutX ?? 0;
  const lz = room.layoutZ ?? 0;
  const mid = (edge.start + edge.end) / 2;

  switch (edge.side) {
    case 'back':
      return { x: mid * PLAN_SCALE, y: lz * PLAN_SCALE - 6 };
    case 'front':
      return { x: mid * PLAN_SCALE, y: (lz + room.depthFt) * PLAN_SCALE + 14 };
    case 'left':
      return { x: lx * PLAN_SCALE - 6, y: mid * PLAN_SCALE };
    case 'right':
      return { x: (lx + room.widthFt) * PLAN_SCALE + 6, y: mid * PLAN_SCALE };
  }
}
