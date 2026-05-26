'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { use } from 'react';
import { fetchProject, fetchProjectRooms } from '@/lib/api';
import { FloorPlanEditor } from '@/components/planner/FloorPlanEditor';

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);

  const { data: project, isLoading: loadingProject } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => fetchProject(projectId),
  });

  const { data: rooms = [], isLoading: loadingRooms } = useQuery({
    queryKey: ['rooms', projectId],
    queryFn: () => fetchProjectRooms(projectId),
  });

  if (loadingProject || loadingRooms) {
    return <p className="p-8 text-stone-600">Loading project…</p>;
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/projects" className="text-sm font-medium text-stone-500 hover:text-stone-700">
            ← Projects
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-stone-900">{project?.name ?? 'Project'}</h1>
          <p className="mt-1 text-stone-600">
            Arrange rooms on the floor plan, then open each room in the 3D planner.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/projects/${projectId}/3d`}
            className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:border-[var(--sage-600)]"
          >
            View whole home 3D
          </Link>
          {rooms[0] && (
            <Link
              href={`/planner/${projectId}/${rooms[0].roomId}`}
              className="btn-primary text-sm"
            >
              Open first room in 3D
            </Link>
          )}
        </div>
      </div>

      <FloorPlanEditor projectId={projectId} rooms={rooms} />
    </main>
  );
}
