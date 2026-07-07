'use client';

import { useQueries, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { use, useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  fetchCatalogByIds,
  fetchConnections,
  fetchExteriorDoors,
  fetchPlacements,
  fetchProject,
  fetchProjectRooms,
  fetchSite,
} from '@/lib/api';
import { HomeScene } from '@/components/planner/HomeScene';
import type { CatalogItem, Placement } from '@/types';

export default function ProjectHomeViewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const [focusRoomId, setFocusRoomId] = useState<string | null>(null);
  const [showSite, setShowSite] = useState(false);

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => fetchProject(projectId),
  });

  const { data: rooms = [], isLoading: loadingRooms } = useQuery({
    queryKey: ['rooms', projectId],
    queryFn: () => fetchProjectRooms(projectId),
  });

  const houseRooms = useMemo(
    () => rooms.filter((room) => !room.linkedSiteStructureId),
    [rooms],
  );
  const focusRooms = showSite ? houseRooms : rooms;

  const { data: connections = [] } = useQuery({
    queryKey: ['connections', projectId],
    queryFn: () => fetchConnections(projectId),
  });

  const { data: exteriorDoors = [] } = useQuery({
    queryKey: ['exterior-doors', projectId],
    queryFn: () => fetchExteriorDoors(projectId),
  });

  const { data: siteData } = useQuery({
    queryKey: ['site', projectId],
    queryFn: () => fetchSite(projectId),
  });

  const placementQueries = useQueries({
    queries: rooms.map((r) => ({
      queryKey: ['placements', r.roomId],
      queryFn: () => fetchPlacements(r.roomId),
    })),
  });

  const placementsByRoomId = useMemo(() => {
    const map: Record<string, Placement[]> = {};
    rooms.forEach((r, i) => {
      map[r.roomId] = placementQueries[i]?.data ?? [];
    });
    return map;
  }, [rooms, placementQueries]);

  const placementCatalogIds = useMemo(() => {
    const ids = new Set<string>();
    for (const list of Object.values(placementsByRoomId)) {
      for (const p of list) {
        if (p.catalogItemId) ids.add(p.catalogItemId);
      }
    }
    return [...ids].sort();
  }, [placementsByRoomId]);

  const { data: catalogItems = [] } = useQuery({
    queryKey: ['catalog', 'ids', placementCatalogIds.join(',')],
    queryFn: () => fetchCatalogByIds(placementCatalogIds),
    enabled: placementCatalogIds.length > 0,
    staleTime: 5 * 60_000,
  });

  const catalogById = useMemo(() => {
    const map: Record<string, CatalogItem> = {};
    catalogItems.forEach((item) => {
      map[item.itemId] = item;
    });
    return map;
  }, [catalogItems]);

  if (loadingRooms) {
    return <p className="p-8 text-stone-600">Loading whole-home view…</p>;
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href={`/projects/${projectId}`}
            className="text-sm font-medium text-stone-500 hover:text-stone-700"
          >
            ← Floor plan
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-stone-900">
            {project?.name ?? 'Project'} · Whole-home view
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            See all your rooms together. Use Site + home to include the lot, driveway, and
            outbuildings from your site plan.
          </p>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-stone-200 bg-white px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          Focus:
        </span>
        <FocusChip
          active={focusRoomId === null}
          onClick={() => setFocusRoomId(null)}
          label="All rooms"
        />
        {focusRooms.map((room) => (
          <FocusChip
            key={room.roomId}
            active={focusRoomId === room.roomId}
            onClick={() => setFocusRoomId(room.roomId)}
            label={room.name}
          />
        ))}
        {focusRoomId && (
          <Link
            href={`/planner/${projectId}/${focusRoomId}`}
            className="ml-auto rounded-full bg-[var(--sage-700)] px-3 py-1 text-xs font-semibold text-white hover:bg-[var(--sage-800)]"
          >
            Edit this room →
          </Link>
        )}
      </div>

      <div className="h-[70vh]">
        <HomeScene
          rooms={rooms}
          displayRooms={showSite ? houseRooms : rooms}
          connections={connections}
          exteriorDoors={exteriorDoors}
          placementsByRoomId={placementsByRoomId}
          catalogById={catalogById}
          focusRoomId={focusRoomId}
          onSelectRoom={(id) => setFocusRoomId((cur) => (cur === id ? null : id))}
          showSite={showSite}
          site={siteData?.site}
          structures={siteData?.structures ?? []}
          onToggleSite={setShowSite}
        />
      </div>

      <div className="mt-4 grid gap-2 text-xs text-stone-500 sm:grid-cols-2 lg:grid-cols-5">
        <Legend dot="#5c7a6a" label="Open connection (wall removed)" />
        <Legend dot="#a78bfa" label="Door (3ft opening + header)" />
        <Legend dot="#d97706" label="Exterior door" />
        <Legend dot="#78716c" label="Solid wall" />
        {showSite && <Legend dot="#6b9e6b" label="Lot / site features" />}
      </div>
    </main>
  );
}

function FocusChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'rounded-full px-3 py-1 text-xs font-semibold transition',
        active
          ? 'bg-[var(--sage-700)] text-white shadow'
          : 'border border-stone-200 bg-white text-stone-600 hover:border-stone-400',
      )}
    >
      {label}
    </button>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-2.5 py-1.5">
      <span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ background: dot }}
      />
      <span>{label}</span>
    </div>
  );
}
