'use client';

import Link from 'next/link';
import { signIn } from 'next-auth/react';

export default function LoginPage() {
  return (
    <main className="mesh-bg flex min-h-screen flex-col items-center justify-center px-4">
      <div className="card-surface w-full max-w-md p-8 sm:p-10">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--sage-700)] text-lg font-bold text-white">
          H
        </div>
        <h1 className="text-2xl font-bold text-stone-900">Sign in to HomeAI</h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          Design kitchens and baths in 3D with live catalog pricing estimates.
        </p>
        <button
          type="button"
          onClick={() => signIn('cognito', { callbackUrl: '/projects' })}
          className="btn-primary mt-8 w-full"
        >
          Continue with Cognito
        </button>
        <p className="mt-6 text-center text-sm text-stone-500">
          <Link href="/" className="font-medium text-stone-700 hover:text-stone-900">
            ← Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
