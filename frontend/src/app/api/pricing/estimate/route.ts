import { handleApiRequest } from '@/lib/apiBackend';

export async function POST(request: Request) {
  return handleApiRequest(request, 'pricing/estimate', {
    method: 'POST',
    body: await request.text(),
  });
}
