'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { ReactNode } from 'react';

const isDev = process.env.NEXT_PUBLIC_DEV_SKIP_AUTH === 'true';

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="flex items-center justify-between border-b border-stone-200 bg-white px-6 py-3 shadow-sm">
        <Link href="/projects" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--sage-700)] text-xs font-bold text-white">
            H
          </span>
          <span className="text-lg font-bold tracking-tight text-stone-900">HomeAI</span>
        </Link>
        <div className="flex items-center gap-4 text-sm font-medium">
          <Link
            href="/projects"
            className="text-stone-600 transition hover:text-stone-900"
          >
            Projects
          </Link>
          <Link
            href="/planner/dev-project-1/dev-room-kitchen"
            className="hidden text-stone-600 transition hover:text-stone-900 sm:inline-block"
          >
            Demo planner
          </Link>
          {!isDev && (
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
              className="rounded-lg border border-stone-200 px-3 py-1.5 text-stone-600 transition hover:bg-stone-50"
            >
              Sign out
            </button>
          )}
        </div>
      </nav>
      {children}
    </div>
  );
}
