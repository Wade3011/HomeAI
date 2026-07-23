import { handleApiRequest } from '@/lib/apiBackend';

type Ctx = { params: Promise<{ projectId: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const { projectId } = await params;
  return handleApiRequest(request, `projects/${projectId}/style-pack`, {
    method: 'POST',
    body: await request.text(),
  });
}
