import { handleApiRequest } from '@/lib/apiBackend';

type Ctx = { params: Promise<{ structureId: string }> };

export async function DELETE(_request: Request, { params }: Ctx) {
  const { structureId } = await params;
  return handleApiRequest(_request, `site-structures/${structureId}`, { method: 'DELETE' });
}
