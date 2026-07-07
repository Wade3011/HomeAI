import { handleApiRequest } from '@/lib/apiBackend';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await params;
  return handleApiRequest(request, `catalog/${itemId}`, { method: 'GET' });
}
