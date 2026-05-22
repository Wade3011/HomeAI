'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { ReactNode } from 'react';

const isDev = process.env.NEXT_PUBLIC_DEV_SKIP_AUTH === 'true';

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <nav className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3">
        <Link href="/projects" className="text-lg font-semibold text-zinc-900">
          HomeAI
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/projects" className="text-zinc-600 hover:text-zinc-900">
            Projects
          </Link>
          {!isDev && (
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 hover:bg-zinc-50"
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
