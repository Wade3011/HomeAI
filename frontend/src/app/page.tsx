import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-zinc-50 to-zinc-100 px-6">
      <div className="max-w-2xl text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-blue-600">HomeAI</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
          Plan your kitchen and bath in 3D
        </h1>
        <p className="mt-4 text-lg text-zinc-600">
          Drag cabinets, countertops, and vanities on a grid. Save layouts and see estimate
          totals powered by your AWS backend.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Get started
          </Link>
          <Link
            href="/projects"
            className="rounded-lg border border-zinc-300 bg-white px-6 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          >
            My projects
          </Link>
          <Link
            href="/planner/dev-project-1/dev-room-kitchen"
            className="rounded-lg border border-blue-200 bg-blue-50 px-6 py-3 text-sm font-medium text-blue-800 hover:bg-blue-100"
          >
            Open demo planner
          </Link>
        </div>
      </div>
    </main>
  );
}
