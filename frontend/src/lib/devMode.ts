/** When true, skip Cognito login and use in-memory mock API data. Local UI dev only. */
export function isDevSkipAuth(): boolean {
  return process.env.DEV_SKIP_AUTH === 'true';
}

/** Exposed to client for dev banner (must be set in .env.local). */
export const publicDevSkipAuth = process.env.NEXT_PUBLIC_DEV_SKIP_AUTH === 'true';
