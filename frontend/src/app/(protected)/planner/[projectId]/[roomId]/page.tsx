'use client';

import { useQuery } from '@tanstack/react-query';
import { use } from 'react';
import { PlannerWorkspace } from '@/components/planner/PlannerWorkspace';
import { fetchPlacements } from '@/lib/api';

export default function PlannerPage({
  params,
}: {
  params: Promise<{ projectId: string; roomId: string }>;
}) {
  const { projectId, roomId } = use(params);

  const { data: placements = [], isLoading } = useQuery({
    queryKey: ['placements', roomId],
    queryFn: () => fetchPlacements(roomId),
  });

  if (isLoading) {
    return <p className="p-8 text-zinc-600">Loading planner…</p>;
  }

  return (
    <PlannerWorkspace
      projectId={projectId}
      roomId={roomId}
      initialPlacements={placements}
    />
  );
}
