import { getCognitoIdToken } from '@/lib/auth';
import { serverEnv } from '@/lib/env';

export async function proxyToApi(
  request: Request,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = await getCognitoIdToken(request);
  if (!token) {
    return new Response(JSON.stringify({ error: 'unauthorized', message: 'Not signed in' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const env = serverEnv();
  const base = env.API_ENDPOINT.replace(/\/$/, '');
  const url = `${base}/${path.replace(/^\//, '')}`;

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (env.API_KEY) {
    headers.set('x-api-key', env.API_KEY);
  }

  return fetch(url, { ...init, headers });
}
