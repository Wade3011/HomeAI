'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createProject, createProjectFromPreset, createRoom, fetchProjectRooms, fetchProjects } from '@/lib/api';
import { KRAENZLEIN_PROJECT_ID } from '@/lib/mockStore';

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
      await createRoom(project.projectId, {
        type: 'kitchen',
        name: 'Kitchen',
        widthFt: 14,
        depthFt: 12,
        heightFt: 9,
      });
      return { project };
    },
    onSuccess: ({ project }) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      router.push(`/projects/${project.projectId}`);
    },
  });

  const kraenzleinMutation = useMutation({
    mutationFn: () => createProjectFromPreset('kraenzlein-7629', '7629 Kraenzlein Rd'),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      router.push(`/projects/${project.projectId}`);
    },
  });

  const hasKraenzlein = projects.some((p) => p.projectId === KRAENZLEIN_PROJECT_ID);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Your projects</h1>
          <p className="mt-1 text-slate-600">Create a home project and open the 3D planner.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="btn-primary disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creating…' : '+ Blank project'}
          </button>
          {!hasKraenzlein && (
            <button
              type="button"
              onClick={() => kraenzleinMutation.mutate()}
              disabled={kraenzleinMutation.isPending}
              className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:border-[var(--sage-600)] disabled:opacity-50"
            >
              {kraenzleinMutation.isPending ? 'Loading…' : '+ Kraenzlein blueprint'}
            </button>
          )}
        </div>
      </div>

      {!hasKraenzlein && (
        <div className="mb-6 rounded-2xl border border-[var(--sage-600)]/30 bg-[var(--sage-50)] p-4">
          <p className="text-sm font-semibold text-stone-800">7629 Kraenzlein Rd preset</p>
          <p className="mt-1 text-sm text-stone-600">
            BZAK 30&apos; wide new build — 17 rooms, open living/dining/kitchen, garage wing, and
            hallway connections from the Jan 2026 floor plan.
          </p>
          <Link
            href={`/projects/${KRAENZLEIN_PROJECT_ID}`}
            className="mt-3 inline-flex text-sm font-semibold text-[var(--sage-700)] hover:text-[var(--sage-800)]"
          >
            Open seeded floor plan →
          </Link>
        </div>
      )}

      {isLoading && (
        <p className="animate-pulse text-slate-500">Loading projects…</p>
      )}

      <ul className="space-y-3">
        {projects.map((project) => (
          <ProjectRow key={project.projectId} projectId={project.projectId} name={project.name} />
        ))}
      </ul>

      {!isLoading && projects.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 p-10 text-center">
          <p className="text-slate-600">No projects yet.</p>
          <button
            type="button"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="btn-primary mt-4"
          >
            Create your first project
          </button>
        </div>
      )}

      <p className="mt-8 text-center text-sm text-slate-500">
        Or{' '}
        <Link
          href={`/projects/${KRAENZLEIN_PROJECT_ID}`}
          className="font-semibold text-stone-800 hover:text-stone-600"
        >
          open the Kraenzlein floor plan
        </Link>
        {' · '}
        <Link
          href="/planner/dev-project-1/dev-room-kitchen"
          className="font-semibold text-stone-800 hover:text-stone-600"
        >
          demo kitchen
        </Link>
      </p>
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
    <li className="group card-surface overflow-hidden transition hover:shadow-[var(--shadow-glow)]">
      <div className="h-0.5 bg-[var(--sage-600)]" />
      <div className="p-4">
        <div className="font-semibold text-slate-900">{name}</div>
        <p className="text-sm text-slate-500">{rooms.length} room(s)</p>
        {firstRoom ? (
          <Link
            href={`/projects/${projectId}`}
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--sage-700)] transition group-hover:text-[var(--sage-800)]"
          >
            Floor plan &amp; rooms
            <span aria-hidden>→</span>
          </Link>
        ) : (
          <p className="mt-2 text-sm text-slate-500">No rooms</p>
        )}
      </div>
    </li>
  );
}
