import type { FloorFinishId, RoomType, StylePackId } from '@/types';
import { normalizeRoomType } from '@/config/roomTypes';

export interface StylePack {
  id: StylePackId;
  label: string;
  description: string;
  /** Accent for UI cards */
  accent: string;
  /** Default floor by room type; falls back to pack `defaultFloor`. */
  floors: Partial<Record<RoomType, FloorFinishId>>;
  defaultFloor: FloorFinishId;
}

export const STYLE_PACKS: Record<StylePackId, StylePack> = {
  modern: {
    id: 'modern',
    label: 'Modern',
    description: 'Light oak, cool tile, clean neutrals',
    accent: '#78716c',
    defaultFloor: 'hardwood-oak',
    floors: {
      living: 'hardwood-oak',
      dining: 'hardwood-oak',
      hallway: 'hardwood-oak',
      kitchen: 'tile-ceramic',
      bathroom: 'tile-marble',
      bedroom: 'hardwood-oak',
      'master-bedroom': 'hardwood-oak',
      office: 'hardwood-oak',
      garage: 'concrete',
      porch: 'concrete',
      utility: 'tile-ceramic',
      pantry: 'tile-ceramic',
    },
  },
  farmhouse: {
    id: 'farmhouse',
    label: 'Farmhouse',
    description: 'Warm wood, soft carpet in bedrooms',
    accent: '#92400e',
    defaultFloor: 'hardwood-walnut',
    floors: {
      living: 'hardwood-walnut',
      dining: 'hardwood-walnut',
      hallway: 'hardwood-walnut',
      kitchen: 'luxury-vinyl',
      bathroom: 'tile-ceramic',
      bedroom: 'carpet',
      'master-bedroom': 'carpet',
      office: 'hardwood-walnut',
      garage: 'concrete',
      porch: 'concrete',
      utility: 'luxury-vinyl',
      pantry: 'luxury-vinyl',
    },
  },
  coastal: {
    id: 'coastal',
    label: 'Coastal',
    description: 'Light LVP and breezy ceramic',
    accent: '#0e7490',
    defaultFloor: 'luxury-vinyl',
    floors: {
      living: 'luxury-vinyl',
      dining: 'luxury-vinyl',
      hallway: 'luxury-vinyl',
      kitchen: 'tile-ceramic',
      bathroom: 'tile-ceramic',
      bedroom: 'carpet',
      'master-bedroom': 'carpet',
      office: 'luxury-vinyl',
      garage: 'concrete',
      porch: 'tile-ceramic',
      utility: 'tile-ceramic',
      pantry: 'tile-ceramic',
    },
  },
  industrial: {
    id: 'industrial',
    label: 'Industrial',
    description: 'Concrete and dark wood accents',
    accent: '#44403c',
    defaultFloor: 'concrete',
    floors: {
      living: 'concrete',
      dining: 'concrete',
      hallway: 'concrete',
      kitchen: 'concrete',
      bathroom: 'tile-ceramic',
      bedroom: 'hardwood-walnut',
      'master-bedroom': 'hardwood-walnut',
      office: 'concrete',
      garage: 'concrete',
      porch: 'concrete',
      utility: 'concrete',
      pantry: 'concrete',
    },
  },
};

export const STYLE_PACK_IDS = Object.keys(STYLE_PACKS) as StylePackId[];

export function getStylePack(id: StylePackId | undefined | null): StylePack | null {
  if (!id) return null;
  return STYLE_PACKS[id] ?? null;
}

export function floorFinishForStylePack(
  pack: StylePack,
  roomType: RoomType | string,
): FloorFinishId {
  const type = normalizeRoomType(roomType);
  return pack.floors[type] ?? pack.defaultFloor;
}
