import {
  createProject,
  createRoom,
  estimateRoomTotal,
  getCatalog,
  getCatalogItem,
  getPlacements,
  getProject,
  getProjects,
  getRoom,
  getRoomsForProject,
  savePlacements,
  updateRoom as updateRoomInStore,
} from '@/lib/mockStore';
import type { Placement } from '@/types';

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handleMockApi(
  path: string,
  method: string,
  bodyText?: string,
): Promise<Response> {
  const parts = path.replace(/^\/+/, '').split('/').filter(Boolean);
  const body = bodyText ? JSON.parse(bodyText) : {};

  try {
    if (parts[0] === 'catalog') {
      if (method === 'GET' && parts.length === 1) {
        return json(200, { items: getCatalog() });
      }
      if (method === 'GET' && parts.length === 2) {
        const item = getCatalogItem(parts[1]);
        if (!item) return json(404, { error: 'not_found', message: 'Catalog item not found' });
        return json(200, { item });
      }
    }

    if (parts[0] === 'projects') {
      if (method === 'GET' && parts.length === 1) {
        return json(200, { projects: getProjects() });
      }
      if (method === 'POST' && parts.length === 1) {
        const project = createProject(String(body.name ?? 'My Home'));
        return json(201, { project });
      }
      if (parts.length >= 2) {
        const projectId = parts[1];
        const project = getProject(projectId);
        if (!project) return json(404, { error: 'not_found', message: 'Project not found' });

        if (method === 'GET' && parts.length === 2) {
          return json(200, { project });
        }

        if (parts[2] === 'rooms') {
          if (method === 'GET') {
            return json(200, { rooms: getRoomsForProject(projectId) });
          }
          if (method === 'POST') {
            const room = createRoom(projectId, body);
            return json(201, { room });
          }
        }
      }
    }

    if (parts[0] === 'rooms' && parts.length >= 2) {
      const roomId = parts[1];
      const room = getRoom(roomId);
      if (!room) return json(404, { error: 'not_found', message: 'Room not found' });

      if (parts[2] === 'placements') {
        if (method === 'GET') {
          return json(200, { placements: getPlacements(roomId) });
        }
        if (method === 'PUT') {
          const incoming = (body.placements as Placement[]) ?? [];
          const saved = savePlacements(roomId, incoming);
          return json(200, { placements: saved });
        }
      }

      if (method === 'GET') {
        return json(200, { room });
      }
      if (method === 'PUT') {
        const updated = updateRoomInStore(roomId, {
          name: body.name != null ? String(body.name) : room.name,
          widthFt: body.widthFt != null ? Number(body.widthFt) : room.widthFt,
          depthFt: body.depthFt != null ? Number(body.depthFt) : room.depthFt,
          heightFt: body.heightFt != null ? Number(body.heightFt) : room.heightFt,
        });
        if (!updated) return json(404, { error: 'not_found', message: 'Room not found' });
        return json(200, { room: updated });
      }
    }

    if (parts[0] === 'pricing') {
      if (method === 'POST' && parts[1] === 'estimate') {
        const item = getCatalogItem(String(body.catalogItemId ?? ''));
        if (!item) return json(404, { error: 'not_found', message: 'Catalog item not found' });
        return json(200, {
          estimate: {
            unitPrice: item.listPrice,
            unit: 'each',
            labor: 0,
            materials: item.listPrice,
            source: 'catalog-mock',
          },
        });
      }
      if (method === 'POST' && parts[1] === 'estimate-room') {
        const roomId = String(body.roomId ?? '');
        if (!getRoom(roomId)) {
          return json(404, { error: 'not_found', message: 'Room not found' });
        }
        return json(200, estimateRoomTotal(roomId));
      }
    }

    return json(404, { error: 'not_found', message: `Unknown path: ${path}` });
  } catch (e) {
    return json(500, {
      error: 'internal_error',
      message: e instanceof Error ? e.message : 'Unknown error',
    });
  }
}
