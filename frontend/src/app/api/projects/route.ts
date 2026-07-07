import { handleApiRequest } from '@/lib/apiBackend';

export async function GET(request: Request) {
  return handleApiRequest(request, 'projects', { method: 'GET' });
}

export async function POST(request: Request) {
  return handleApiRequest(request, 'projects', {
    method: 'POST',
    body: await request.text(),
  });
}
