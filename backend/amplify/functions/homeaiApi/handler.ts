import type { APIGatewayProxyHandler } from 'aws-lambda';
import { randomUUID } from 'crypto';
import {
  batchDeleteByKeys,
  deleteItem,
  getItem,
  putItem,
  queryByGsi,
  scanTable,
  tables,
} from './lib/dynamo.js';
import { error, json } from './lib/response.js';
import type {
  CatalogItemRecord,
  PlacementRecord,
  ProjectRecord,
  RoomRecord,
} from './lib/types.js';

function userId(event: Parameters<APIGatewayProxyHandler>[0]): string | null {
  const claims = event.requestContext.authorizer?.claims as Record<string, string> | undefined;
  return claims?.sub ?? claims?.username ?? null;
}

function pathParts(event: Parameters<APIGatewayProxyHandler>[0]): string[] {
  const raw = event.path ?? '';
  const withoutStage = raw.replace(/^\/api(?=\/|$)/, '');
  return withoutStage.replace(/^\/+/, '').split('/').filter(Boolean);
}

export const handler: APIGatewayProxyHandler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return json(200, { ok: true });
  }

  const uid = userId(event);
  if (!uid) {
    return error(401, 'unauthorized', 'Missing or invalid authorization');
  }

  const method = event.httpMethod;
  const parts = pathParts(event);
  const body = event.body ? JSON.parse(event.body) : {};

  try {
    if (parts[0] === 'catalog') {
      return await handleCatalog(method, parts, body);
    }
    if (parts[0] === 'projects') {
      return await handleProjects(method, parts, body, uid);
    }
    if (parts[0] === 'rooms') {
      return await handleRooms(method, parts, body, uid);
    }
    if (parts[0] === 'pricing') {
      return await handlePricing(method, parts, body, uid);
    }
    return error(404, 'not_found', `Unknown path: ${event.path}`);
  } catch (e) {
    console.error(e);
    return error(500, 'internal_error', e instanceof Error ? e.message : 'Unknown error');
  }
};

async function handleCatalog(method: string, parts: string[], _body: unknown) {
  const table = tables.catalog();
  if (method === 'GET' && parts.length === 1) {
    const items = await scanTable<CatalogItemRecord>(table);
    return json(200, { items });
  }
  if (method === 'GET' && parts.length === 2) {
    const item = await getItem<CatalogItemRecord>(table, { itemId: parts[1] });
    if (!item) return error(404, 'not_found', 'Catalog item not found');
    return json(200, { item });
  }
  return error(405, 'method_not_allowed', method);
}

async function handleProjects(
  method: string,
  parts: string[],
  body: Record<string, unknown>,
  uid: string,
) {
  const table = tables.projects();

  if (method === 'GET' && parts.length === 1) {
    const items = await queryByGsi<ProjectRecord>(table, 'byOwner', 'ownerUserId', uid);
    return json(200, { projects: items });
  }

  if (method === 'POST' && parts.length === 1) {
    const now = new Date().toISOString();
    const project: ProjectRecord = {
      projectId: randomUUID(),
      ownerUserId: uid,
      name: String(body.name ?? 'My Home Project'),
      unitSystem: body.unitSystem === 'metric' ? 'metric' : 'imperial',
      createdAt: now,
      updatedAt: now,
    };
    await putItem(table, project);
    return json(201, { project });
  }

  if (parts.length >= 2) {
    const projectId = parts[1];
    const project = await getItem<ProjectRecord>(table, { projectId });
    if (!project) return error(404, 'not_found', 'Project not found');
    if (project.ownerUserId !== uid) return error(403, 'forbidden', 'Not your project');

    if (method === 'GET' && parts.length === 2) {
      return json(200, { project });
    }

    if (method === 'PUT' && parts.length === 2) {
      const updated: ProjectRecord = {
        ...project,
        name: body.name != null ? String(body.name) : project.name,
        unitSystem: body.unitSystem === 'metric' ? 'metric' : project.unitSystem,
        updatedAt: new Date().toISOString(),
      };
      await putItem(table, updated);
      return json(200, { project: updated });
    }

    if (method === 'DELETE' && parts.length === 2) {
      const rooms = await queryByGsi<RoomRecord>(tables.rooms(), 'byProject', 'projectId', projectId);
      for (const room of rooms) {
        await deleteRoomCascade(room.roomId);
      }
      await deleteItem(table, { projectId });
      return json(200, { deleted: true });
    }

    if (parts[2] === 'rooms') {
      return await handleProjectRooms(method, projectId, body);
    }
  }

  return error(405, 'method_not_allowed', method);
}

async function handleProjectRooms(
  method: string,
  projectId: string,
  body: Record<string, unknown>,
) {
  const table = tables.rooms();

  if (method === 'GET') {
    const rooms = await queryByGsi<RoomRecord>(table, 'byProject', 'projectId', projectId);
    return json(200, { rooms });
  }

  if (method === 'POST') {
    const now = new Date().toISOString();
    const room: RoomRecord = {
      roomId: randomUUID(),
      projectId,
      type: String(body.type ?? 'kitchen'),
      name: String(body.name ?? 'Kitchen'),
      widthFt: Number(body.widthFt ?? 12),
      depthFt: Number(body.depthFt ?? 14),
      heightFt: Number(body.heightFt ?? 9),
      layoutX: body.layoutX != null ? Number(body.layoutX) : 0,
      layoutZ: body.layoutZ != null ? Number(body.layoutZ) : 0,
      createdAt: now,
      updatedAt: now,
    };
    await putItem(table, room);
    return json(201, { room });
  }

  return error(405, 'method_not_allowed', method);
}

async function handleRooms(
  method: string,
  parts: string[],
  body: Record<string, unknown>,
  uid: string,
) {
  const roomId = parts[1];
  const room = await getItem<RoomRecord>(tables.rooms(), { roomId });
  if (!room) return error(404, 'not_found', 'Room not found');

  const project = await getItem<ProjectRecord>(tables.projects(), { projectId: room.projectId });
  if (!project || project.ownerUserId !== uid) {
    return error(403, 'forbidden', 'Not your room');
  }

  if (parts[2] === 'placements') {
    const pTable = tables.placements();
    if (method === 'GET') {
      const placements = await queryByGsi<PlacementRecord>(pTable, 'byRoom', 'roomId', roomId);
      return json(200, { placements });
    }
    if (method === 'PUT') {
      const incoming = (body.placements as PlacementRecord[] | undefined) ?? [];
      const existing = await queryByGsi<PlacementRecord>(pTable, 'byRoom', 'roomId', roomId);
      await batchDeleteByKeys(
        pTable,
        existing.map((p) => ({ placementId: p.placementId })),
      );
      const now = new Date().toISOString();
      const saved: PlacementRecord[] = [];
      for (const p of incoming) {
        const row: PlacementRecord = {
          placementId: p.placementId || randomUUID(),
          roomId,
          catalogItemId: p.catalogItemId,
          customItem: p.customItem,
          positionX: Number(p.positionX),
          positionY: Number(p.positionY ?? 0),
          positionZ: Number(p.positionZ),
          rotationY: Number(p.rotationY ?? 0),
          createdAt: now,
          updatedAt: now,
        };
        await putItem(pTable, row);
        saved.push(row);
      }
      return json(200, { placements: saved });
    }
    return error(405, 'method_not_allowed', method);
  }

  if (method === 'GET') return json(200, { room });
  if (method === 'PUT') {
    const updated: RoomRecord = {
      ...room,
      name: body.name != null ? String(body.name) : room.name,
      widthFt: body.widthFt != null ? Number(body.widthFt) : room.widthFt,
      depthFt: body.depthFt != null ? Number(body.depthFt) : room.depthFt,
      heightFt: body.heightFt != null ? Number(body.heightFt) : room.heightFt,
      layoutX: body.layoutX != null ? Number(body.layoutX) : room.layoutX,
      layoutZ: body.layoutZ != null ? Number(body.layoutZ) : room.layoutZ,
      updatedAt: new Date().toISOString(),
    };
    await putItem(tables.rooms(), updated);
    return json(200, { room: updated });
  }
  if (method === 'DELETE') {
    await deleteRoomCascade(roomId);
    return json(200, { deleted: true });
  }

  return error(405, 'method_not_allowed', method);
}

async function deleteRoomCascade(roomId: string) {
  const placements = await queryByGsi<PlacementRecord>(
    tables.placements(),
    'byRoom',
    'roomId',
    roomId,
  );
  await batchDeleteByKeys(
    tables.placements(),
    placements.map((p) => ({ placementId: p.placementId })),
  );
  await deleteItem(tables.rooms(), { roomId });
}

async function handlePricing(
  method: string,
  parts: string[],
  body: Record<string, unknown>,
  uid: string,
) {
  if (method !== 'POST') return error(405, 'method_not_allowed', method);

  if (parts[1] === 'estimate') {
    const catalogItemId = String(body.catalogItemId ?? '');
    const item = await getItem<CatalogItemRecord>(tables.catalog(), { itemId: catalogItemId });
    if (!item) return error(404, 'not_found', 'Catalog item not found');
    return json(200, {
      estimate: {
        unitPrice: item.listPrice,
        unit: 'each',
        labor: 0,
        materials: item.listPrice,
        source: 'catalog',
      },
    });
  }

  if (parts[1] === 'estimate-room') {
    const roomId = String(body.roomId ?? '');
    const room = await getItem<RoomRecord>(tables.rooms(), { roomId });
    if (!room) return error(404, 'not_found', 'Room not found');
    const project = await getItem<ProjectRecord>(tables.projects(), { projectId: room.projectId });
    if (!project || project.ownerUserId !== uid) {
      return error(403, 'forbidden', 'Not your room');
    }
    const placements = await queryByGsi<PlacementRecord>(
      tables.placements(),
      'byRoom',
      'roomId',
      roomId,
    );
    let total = 0;
    const lineItems = [];
    for (const p of placements) {
      const item = await getItem<CatalogItemRecord>(tables.catalog(), { itemId: p.catalogItemId });
      const price = item?.listPrice ?? 0;
      total += price;
      lineItems.push({ placementId: p.placementId, name: item?.name ?? p.catalogItemId, price });
    }
    return json(200, { total, lineItems, source: 'catalog' });
  }

  return error(404, 'not_found', 'Unknown pricing route');
}
