import { handleApiRequest } from '@/lib/apiBackend';

export async function GET(request: Request) {
  const { search } = new URL(request.url);
  return handleApiRequest(request, `catalog${search}`, { method: 'GET' });
}
