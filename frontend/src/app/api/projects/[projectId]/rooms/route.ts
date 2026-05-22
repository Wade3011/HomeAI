import { handleApiRequest } from '@/lib/apiBackend';

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const { projectId } = await params;
  return handleApiRequest(request, `projects/${projectId}/rooms`, { method: 'GET' });
}

export async function POST(request: Request, { params }: Ctx) {
  const { projectId } = await params;
  return handleApiRequest(request, `projects/${projectId}/rooms`, {
    method: 'POST',
    body: await request.text(),
  });
}
