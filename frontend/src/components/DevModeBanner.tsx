'use client';

export function DevModeBanner() {
  if (process.env.NEXT_PUBLIC_DEV_SKIP_AUTH !== 'true') return null;

  return (
    <div className="bg-amber-500 px-4 py-1.5 text-center text-xs font-medium text-amber-950">
      Dev mode — auth disabled, mock data only. Set DEV_SKIP_AUTH=false for real Cognito + API
      Gateway.
    </div>
  );
}
