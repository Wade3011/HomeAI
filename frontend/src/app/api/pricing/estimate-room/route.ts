import { handleApiRequest } from '@/lib/apiBackend';

export async function POST(request: Request) {
  return handleApiRequest(request, 'pricing/estimate-room', {
    method: 'POST',
    body: await request.text(),
  });
}
