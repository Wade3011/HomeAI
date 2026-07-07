import { handleApiRequest } from '@/lib/apiBackend';

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const { projectId } = await params;
  return handleApiRequest(_request, `projects/${projectId}/site-structures`, { method: 'GET' });
}

export async function PUT(request: Request, { params }: Ctx) {
  const { projectId } = await params;
  return handleApiRequest(request, `projects/${projectId}/site-structures`, {
    method: 'PUT',
    body: await request.text(),
  });
}

export async function POST(request: Request, { params }: Ctx) {
  const { projectId } = await params;
  return handleApiRequest(request, `projects/${projectId}/site-structures`, {
    method: 'POST',
    body: await request.text(),
  });
}
