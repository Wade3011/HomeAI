import { handleApiRequest } from '@/lib/apiBackend';

type Ctx = { params: Promise<{ roomId: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const { roomId } = await params;
  return handleApiRequest(request, `rooms/${roomId}`, { method: 'GET' });
}

export async function PUT(request: Request, { params }: Ctx) {
  const { roomId } = await params;
  return handleApiRequest(request, `rooms/${roomId}`, {
    method: 'PUT',
    body: await request.text(),
  });
}

export async function DELETE(request: Request, { params }: Ctx) {
  const { roomId } = await params;
  return handleApiRequest(request, `rooms/${roomId}`, { method: 'DELETE' });
}
