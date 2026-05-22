'use client';

import { signIn } from 'next-auth/react';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Sign in to HomeAI</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Design kitchens and baths in 3D with live catalog pricing estimates.
        </p>
        <button
          type="button"
          onClick={() => signIn('cognito', { callbackUrl: '/projects' })}
          className="mt-6 w-full rounded-lg bg-zinc-900 py-3 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Continue with Cognito
        </button>
      </div>
    </main>
  );
}
