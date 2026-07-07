import Link from 'next/link';

const features = ['3D layout', '3,000+ SKUs', 'Live estimates', 'Kitchen & bath'];

export default function HomePage() {
  return (
    <main className="mesh-bg relative flex min-h-screen flex-col">
      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--sage-700)] text-sm font-bold text-white">
            H
          </span>
          <span className="text-lg font-bold tracking-tight text-stone-900">HomeAI</span>
        </div>
        <nav className="flex items-center gap-3 text-sm font-medium">
          <Link href="/login" className="text-stone-600 transition hover:text-stone-900">
            Sign in
          </Link>
          <Link href="/planner/dev-project-1/dev-room-kitchen" className="btn-primary hidden sm:inline-flex">
            Try demo
          </Link>
        </nav>
      </header>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-16 pt-4">
        <div className="max-w-3xl text-center">
          <div className="mb-6 flex flex-wrap justify-center gap-2">
            {features.map((label) => (
              <span
                key={label}
                className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-600"
              >
                {label}
              </span>
            ))}
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-stone-900 sm:text-6xl">
            Plan your kitchen &amp; bath in 3D
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-stone-600">
            Drag cabinets, countertops, vanities, and fixtures onto a real-size grid. See material
            estimates update as you design.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link href="/login" className="btn-primary">
              Get started
            </Link>
            <Link href="/projects" className="btn-secondary">
              My projects
            </Link>
            <Link href="/planner/dev-project-1/dev-room-kitchen" className="btn-secondary">
              Open demo planner
            </Link>
          </div>
        </div>

        <div className="mt-16 grid w-full max-w-4xl gap-4 sm:grid-cols-3">
          {[
            {
              title: 'Place & snap',
              desc: 'Floor and wall grids with 6″ cabinet snapping.',
            },
            {
              title: 'Big catalog',
              desc: 'Menards lines, bath fixtures, and national brands.',
            },
            {
              title: 'Price roll-up',
              desc: 'Materials-only estimates by category as you build.',
            },
          ].map((card) => (
            <div key={card.title} className="card-surface p-5 text-left">
              <span className="mb-3 inline-block h-1.5 w-8 rounded-full bg-stone-300" />
              <h3 className="font-semibold text-stone-900">{card.title}</h3>
              <p className="mt-1 text-sm text-stone-600">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
