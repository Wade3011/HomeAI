import type { FloorFinishId, RoomType } from '@/types';
import { normalizeRoomType } from '@/config/roomTypes';

export interface FloorFinish {
  id: FloorFinishId;
  label: string;
  description: string;
  /** 3D floor color */
  color: string;
  /** Optional darker grain / grout tint */
  accentColor?: string;
  roughness: number;
  /** Soft plan-view tint when finish overrides room-type fill */
  planTint: string;
}

export const FLOOR_FINISHES: Record<FloorFinishId, FloorFinish> = {
  'hardwood-oak': {
    id: 'hardwood-oak',
    label: 'Oak hardwood',
    description: 'Warm medium oak planks',
    color: '#c4a574',
    accentColor: '#a67c52',
    roughness: 0.78,
    planTint: '#d4bc96',
  },
  'hardwood-walnut': {
    id: 'hardwood-walnut',
    label: 'Walnut hardwood',
    description: 'Deep brown walnut',
    color: '#6b4f3a',
    accentColor: '#4a3426',
    roughness: 0.8,
    planTint: '#8b6954',
  },
  'tile-ceramic': {
    id: 'tile-ceramic',
    label: 'Ceramic tile',
    description: 'Light ceramic with soft grout',
    color: '#e8e4dc',
    accentColor: '#d0cbc0',
    roughness: 0.55,
    planTint: '#ebe7df',
  },
  'tile-marble': {
    id: 'tile-marble',
    label: 'Marble tile',
    description: 'Cool veined marble look',
    color: '#f0eeea',
    accentColor: '#d9d4cc',
    roughness: 0.35,
    planTint: '#f4f2ee',
  },
  carpet: {
    id: 'carpet',
    label: 'Carpet',
    description: 'Soft neutral carpet',
    color: '#cfc8bc',
    accentColor: '#b8b0a2',
    roughness: 0.95,
    planTint: '#d9d3c8',
  },
  'luxury-vinyl': {
    id: 'luxury-vinyl',
    label: 'Luxury vinyl',
    description: 'Light LVP plank',
    color: '#d8cbb8',
    accentColor: '#c2b39e',
    roughness: 0.7,
    planTint: '#e0d4c2',
  },
  concrete: {
    id: 'concrete',
    label: 'Concrete',
    description: 'Polished concrete',
    color: '#9ca3af',
    accentColor: '#78716c',
    roughness: 0.65,
    planTint: '#b0b6bf',
  },
};

export const FLOOR_FINISH_IDS = Object.keys(FLOOR_FINISHES) as FloorFinishId[];

export function getFloorFinish(id: FloorFinishId | undefined | null): FloorFinish {
  if (id && id in FLOOR_FINISHES) return FLOOR_FINISHES[id];
  return FLOOR_FINISHES['hardwood-oak'];
}

/** Sensible default finish by room type when none is set. */
export function defaultFloorFinishId(type: RoomType | string): FloorFinishId {
  switch (normalizeRoomType(type)) {
    case 'bathroom':
      return 'tile-ceramic';
    case 'kitchen':
    case 'utility':
    case 'pantry':
      return 'tile-ceramic';
    case 'garage':
    case 'porch':
      return 'concrete';
    case 'bedroom':
    case 'master-bedroom':
      return 'carpet';
    case 'living':
    case 'dining':
    case 'hallway':
    case 'office':
      return 'hardwood-oak';
    default:
      return 'hardwood-oak';
  }
}

export function resolveFloorFinishId(
  room: { type: RoomType | string; floorFinishId?: FloorFinishId },
): FloorFinishId {
  return room.floorFinishId ?? defaultFloorFinishId(room.type);
}
