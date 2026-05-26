'use client';

import { useQuery } from '@tanstack/react-query';
import { use } from 'react';
import { PlannerWorkspace } from '@/components/planner/PlannerWorkspace';
import { fetchPlacements, fetchRoom } from '@/lib/api';

export default function PlannerPage({
  params,
}: {
  params: Promise<{ projectId: string; roomId: string }>;
}) {
  const { projectId, roomId } = use(params);

  const roomQuery = useQuery({
    queryKey: ['room', roomId],
    queryFn: () => fetchRoom(roomId),
    staleTime: 60_000,
  });

  const placementsQuery = useQuery({
    queryKey: ['placements', roomId],
    queryFn: () => fetchPlacements(roomId),
    staleTime: 30_000,
  });

  const isLoading = roomQuery.isLoading || placementsQuery.isLoading;

  if (isLoading || !roomQuery.data) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 p-8 text-stone-600">
        <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-[var(--sage-600)]" />
        <p>Loading planner…</p>
      </div>
    );
  }

  return (
    <PlannerWorkspace
      projectId={projectId}
      roomId={roomId}
      initialRoom={roomQuery.data}
      initialPlacements={placementsQuery.data ?? []}
    />
  );
}
