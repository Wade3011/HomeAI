'use client';

export function DevModeBanner() {
  if (process.env.NEXT_PUBLIC_DEV_SKIP_AUTH !== 'true') return null;

  return (
    <div className="border-b border-stone-300 bg-stone-200 px-4 py-1.5 text-center text-xs font-medium text-stone-700">
      Dev mode — auth disabled, mock data only. Set DEV_SKIP_AUTH=false for Cognito + API Gateway.
    </div>
  );
}
