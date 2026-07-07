import { handleApiRequest } from '@/lib/apiBackend';

type Ctx = { params: Promise<{ structureId: string }> };

export async function POST(_request: Request, { params }: Ctx) {
  const { structureId } = await params;
  return handleApiRequest(_request, `site-structures/${structureId}/link-room`, { method: 'POST' });
}
