import { isDevSkipAuth } from '@/lib/devMode';
import { handleMockApi } from '@/lib/mockApi';
import { proxyToApi } from '@/lib/gatewayProxy';

/** Route API calls to mock store (dev) or API Gateway proxy (production). */
export async function handleApiRequest(
  request: Request,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  if (isDevSkipAuth()) {
    const method = init.method ?? request.method;
    const bodyText =
      init.body != null
        ? typeof init.body === 'string'
          ? init.body
          : await new Response(init.body).text()
        : undefined;
    return handleMockApi(path, method, bodyText);
  }

  const upstream = await proxyToApi(request, path, init);
  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
