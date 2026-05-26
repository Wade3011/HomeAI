import { handleApiRequest } from '@/lib/apiBackend';

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const { projectId } = await params;
  return handleApiRequest(request, `projects/${projectId}/exterior-doors`, { method: 'GET' });
}

export async function PUT(request: Request, { params }: Ctx) {
  const { projectId } = await params;
  return handleApiRequest(request, `projects/${projectId}/exterior-doors`, {
    method: 'PUT',
    body: await request.text(),
  });
}
