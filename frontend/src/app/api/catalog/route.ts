import { handleApiRequest } from '@/lib/apiBackend';

export async function GET(request: Request) {
  return handleApiRequest(request, 'catalog', { method: 'GET' });
}
