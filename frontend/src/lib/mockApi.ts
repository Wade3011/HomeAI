import {
  createProject,
  createProjectFromPreset,
  createRoom,
  deleteRoom,
  ensureProject,
  estimateRoomTotal,
  getCatalog,
  getCatalogItem,
  getConnections,
  getPlacements,
  getProject,
  getProjects,
  getRoom,
  getRoomsForProject,
  savePlacements,
  setConnections,
  setExteriorDoors,
  getExteriorDoors,
  getSiteSettings,
  setSiteSettings,
  getSiteStructures,
  setSiteStructures,
  applyStylePackToProject,
  createSiteStructure,
  deleteSiteStructure,
  linkSiteStructurePlannerRoom,
  updateProject,
  updateRoom as updateRoomInStore,
} from '@/lib/mockStore';
import type { StoryDef, StylePackId } from '@/types';
import {
  getCatalogItemsByIds,
  getCatalogItemsForSections,
} from '@/lib/catalog';
import type { CatalogSectionId } from '@/config/catalogCategories';
import type { ExteriorDoor, Placement, RoomConnection, SiteSettings, SiteStructure } from '@/types';

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function parsePath(path: string) {
  const [pathname, search = ''] = path.split('?');
  return {
    parts: pathname.replace(/^\/+/, '').split('/').filter(Boolean),
    params: new URLSearchParams(search),
  };
}

export async function handleMockApi(
  path: string,
  method: string,
  bodyText?: string,
): Promise<Response> {
  const { parts, params } = parsePath(path);
  const body = bodyText ? JSON.parse(bodyText) : {};

  try {
    if (parts[0] === 'catalog') {
      if (method === 'GET' && parts.length === 1) {
        const ids = params.get('ids')?.split(',').filter(Boolean) ?? [];
        const sections =
          params.get('sections')?.split(',').filter(Boolean) as CatalogSectionId[] | undefined;
        if (ids.length > 0) {
          return json(200, { items: getCatalogItemsByIds(ids) });
        }
        if (sections && sections.length > 0) {
          return json(200, { items: getCatalogItemsForSections(sections) });
        }
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
        const presetId = body.presetId != null ? String(body.presetId) : '';
        if (presetId) {
          const result = createProjectFromPreset(
            presetId,
            body.name != null ? String(body.name) : undefined,
          );
          if (!result) {
            return json(404, { error: 'not_found', message: 'Floor plan preset not found' });
          }
          return json(201, {
            project: result.project,
            rooms: result.rooms,
            presetId,
          });
        }
        const project = createProject(String(body.name ?? 'My Home'));
        return json(201, { project });
      }
      if (parts.length >= 2) {
        const projectId = parts[1];
        const project = ensureProject(projectId) ?? getProject(projectId);
        if (!project) return json(404, { error: 'not_found', message: 'Project not found' });

        if (method === 'GET' && parts.length === 2) {
          return json(200, { project });
        }

        if (method === 'PUT' && parts.length === 2) {
          const updated = updateProject(projectId, {
            name: body.name != null ? String(body.name) : undefined,
            stories: Array.isArray(body.stories)
              ? (body.stories as StoryDef[])
              : undefined,
          });
          if (!updated) return json(404, { error: 'not_found', message: 'Project not found' });
          return json(200, { project: updated });
        }

        if (parts[2] === 'style-pack' && method === 'POST') {
          const stylePackId = String(body.stylePackId ?? '') as StylePackId;
          const result = applyStylePackToProject(projectId, stylePackId);
          if (!result) {
            return json(400, { error: 'bad_request', message: 'Unknown style pack' });
          }
          return json(200, result);
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

        if (parts[2] === 'connections') {
          if (method === 'GET') {
            return json(200, { connections: getConnections(projectId) });
          }
          if (method === 'PUT') {
            const incoming = (body.connections as RoomConnection[] | undefined) ?? [];
            const saved = setConnections(projectId, incoming);
            return json(200, { connections: saved });
          }
        }

        if (parts[2] === 'exterior-doors') {
          if (method === 'GET') {
            return json(200, { exteriorDoors: getExteriorDoors(projectId) });
          }
          if (method === 'PUT') {
            const incoming = (body.exteriorDoors as ExteriorDoor[] | undefined) ?? [];
            const saved = setExteriorDoors(projectId, incoming);
            return json(200, { exteriorDoors: saved });
          }
        }

        if (parts[2] === 'site') {
          if (method === 'GET' && parts.length === 3) {
            return json(200, {
              site: getSiteSettings(projectId),
              structures: getSiteStructures(projectId),
            });
          }
          if (method === 'PUT' && parts.length === 3) {
            const incoming = body.site as SiteSettings | undefined;
            if (!incoming) {
              return json(400, { error: 'bad_request', message: 'Missing site body' });
            }
            const saved = setSiteSettings(projectId, incoming);
            return json(200, { site: saved });
          }
        }

        if (parts[2] === 'site-structures') {
          if (method === 'GET') {
            return json(200, { structures: getSiteStructures(projectId) });
          }
          if (method === 'PUT') {
            const incoming = (body.structures as SiteStructure[] | undefined) ?? [];
            const saved = setSiteStructures(projectId, incoming);
            return json(200, { structures: saved });
          }
          if (method === 'POST') {
            const structure = createSiteStructure(projectId, body);
            return json(201, { structure });
          }
        }
      }
    }

    if (parts[0] === 'site-structures' && parts.length === 2) {
      const structureId = parts[1];
      if (method === 'DELETE') {
        const result = deleteSiteStructure(structureId);
        if (!result) return json(404, { error: 'not_found', message: 'Site structure not found' });
        return json(200, { deleted: true, projectId: result.projectId });
      }
    }

    if (parts[0] === 'site-structures' && parts.length === 3 && parts[2] === 'link-room') {
      const structureId = parts[1];
      if (method === 'POST') {
        const result = linkSiteStructurePlannerRoom(structureId);
        if (!result) return json(404, { error: 'not_found', message: 'Site structure not found' });
        return json(200, result);
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
          ...(body.name != null ? { name: String(body.name) } : {}),
          ...(body.type != null ? { type: String(body.type) } : {}),
          ...(body.widthFt != null ? { widthFt: Number(body.widthFt) } : {}),
          ...(body.depthFt != null ? { depthFt: Number(body.depthFt) } : {}),
          ...(body.heightFt != null ? { heightFt: Number(body.heightFt) } : {}),
          ...(body.ceilingType != null
            ? { ceilingType: body.ceilingType as 'flat' | 'cathedral' }
            : {}),
          ...(body.peakHeightFt != null
            ? { peakHeightFt: Number(body.peakHeightFt) }
            : {}),
          ...(body.ridgeAxis != null
            ? { ridgeAxis: body.ridgeAxis as 'width' | 'depth' }
            : {}),
          ...(body.floorFinishId != null
            ? { floorFinishId: body.floorFinishId }
            : {}),
          ...(body.storyIndex != null ? { storyIndex: Number(body.storyIndex) } : {}),
          ...(body.layoutX != null ? { layoutX: Number(body.layoutX) } : {}),
          ...(body.layoutZ != null ? { layoutZ: Number(body.layoutZ) } : {}),
        });
        if (!updated) return json(404, { error: 'not_found', message: 'Room not found' });
        return json(200, {
          room: updated.room,
          adjustedRooms: updated.adjustedRooms,
        });
      }
      if (method === 'DELETE') {
        const result = deleteRoom(roomId);
        if (!result) return json(404, { error: 'not_found', message: 'Room not found' });
        return json(200, { ok: true, projectId: result.projectId });
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
