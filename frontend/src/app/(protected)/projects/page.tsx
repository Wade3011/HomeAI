'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createProject, createRoom, fetchProjectRooms, fetchProjects } from '@/lib/api';

export default function ProjectsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const project = await createProject('My Home');
      const room = await createRoom(project.projectId, {
        type: 'kitchen',
        name: 'Kitchen',
        widthFt: 14,
        depthFt: 12,
        heightFt: 9,
      });
      return { project, room };
    },
    onSuccess: ({ project, room }) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      router.push(`/planner/${project.projectId}/${room.roomId}`);
    },
  });

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Your projects</h1>
          <p className="mt-1 text-zinc-600">Create a home project and open the 3D planner.</p>
        </div>
        <button
          type="button"
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {createMutation.isPending ? 'Creating…' : 'New project'}
        </button>
      </div>

      {isLoading && <p className="text-zinc-600">Loading…</p>}

      <ul className="space-y-3">
        {projects.map((project) => (
          <ProjectRow key={project.projectId} projectId={project.projectId} name={project.name} />
        ))}
      </ul>

      {!isLoading && projects.length === 0 && (
        <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-zinc-600">
          No projects yet. Click &quot;New project&quot; to start.
        </p>
      )}
    </main>
  );
}

function ProjectRow({ projectId, name }: { projectId: string; name: string }) {
  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms', projectId],
    queryFn: () => fetchProjectRooms(projectId),
  });

  const firstRoom = rooms[0];

  return (
    <li className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="font-medium text-zinc-900">{name}</div>
      <p className="text-sm text-zinc-500">{rooms.length} room(s)</p>
      {firstRoom ? (
        <Link
          href={`/planner/${projectId}/${firstRoom.roomId}`}
          className="mt-3 inline-block text-sm font-medium text-blue-600 hover:underline"
        >
          Open planner →
        </Link>
      ) : (
        <p className="mt-2 text-sm text-zinc-500">No rooms</p>
      )}
    </li>
  );
}
