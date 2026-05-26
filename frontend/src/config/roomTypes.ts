import type { CatalogSectionId } from '@/config/catalogCategories';
import type { CustomItemShape, RoomType } from '@/types';

export const ROOM_TYPES: RoomType[] = [
  'kitchen',
  'bathroom',
  'bedroom',
  'living',
  'hallway',
  'other',
];

export interface RoomTypePreset {
  type: RoomType;
  label: string;
  description: string;
  name: string;
  widthFt: number;
  depthFt: number;
  heightFt: number;
  /** Catalog-backed sections with list pricing */
  catalogSections: CatalogSectionId[];
  /** User can place editable custom blocks */
  allowsCustomItems: boolean;
  hasCatalogPricing: boolean;
}

export const ROOM_TYPE_PRESETS: Record<RoomType, RoomTypePreset> = {
  kitchen: {
    type: 'kitchen',
    label: 'Kitchen',
    description: 'Cabinets, countertops — catalog pricing',
    name: 'Kitchen',
    widthFt: 14,
    depthFt: 12,
    heightFt: 9,
    catalogSections: ['base-cabinets', 'wall-cabinets', 'countertops', 'appliances'],
    allowsCustomItems: false,
    hasCatalogPricing: true,
  },
  bathroom: {
    type: 'bathroom',
    label: 'Bathroom',
    description: 'Vanities, toilets, showers — catalog pricing',
    name: 'Bathroom',
    widthFt: 8,
    depthFt: 8,
    heightFt: 9,
    catalogSections: ['vanities', 'toilets', 'showers'],
    allowsCustomItems: false,
    hasCatalogPricing: true,
  },
  bedroom: {
    type: 'bedroom',
    label: 'Bedroom',
    description: 'Custom furniture blocks — sizes you define',
    name: 'Bedroom',
    widthFt: 12,
    depthFt: 11,
    heightFt: 9,
    catalogSections: [],
    allowsCustomItems: true,
    hasCatalogPricing: false,
  },
  living: {
    type: 'living',
    label: 'Living room',
    description: 'Custom furniture blocks — sizes you define',
    name: 'Living Room',
    widthFt: 16,
    depthFt: 14,
    heightFt: 9,
    catalogSections: [],
    allowsCustomItems: true,
    hasCatalogPricing: false,
  },
  hallway: {
    type: 'hallway',
    label: 'Hallway',
    description: 'Narrow passage — custom blocks for benches & consoles',
    name: 'Hallway',
    widthFt: 4,
    depthFt: 12,
    heightFt: 9,
    catalogSections: [],
    allowsCustomItems: true,
    hasCatalogPricing: false,
  },
  other: {
    type: 'other',
    label: 'Other',
    description: 'Custom blocks only',
    name: 'Room',
    widthFt: 12,
    depthFt: 12,
    heightFt: 9,
    catalogSections: [],
    allowsCustomItems: true,
    hasCatalogPricing: false,
  },
};

export function normalizeRoomType(type: string | undefined): RoomType {
  if (type && type in ROOM_TYPE_PRESETS) return type as RoomType;
  return 'other';
}

export function roomTypePreset(type: string | undefined): RoomTypePreset {
  return ROOM_TYPE_PRESETS[normalizeRoomType(type)];
}

/** Starter templates for custom furniture (user edits size after placing). */
export interface CustomItemTemplate {
  id: string;
  label: string;
  shape: CustomItemShape;
  widthIn: number;
  depthIn: number;
  heightIn: number;
  sectionalRunIn?: number;
  sectionalArmDepthIn?: number;
  roomTypes?: RoomType[];
}

export const CUSTOM_ITEM_TEMPLATES: CustomItemTemplate[] = [
  { id: 'sofa', label: 'Sofa / couch', shape: 'box', widthIn: 84, depthIn: 36, heightIn: 34, roomTypes: ['living'] },
  {
    id: 'sectional-l',
    label: 'L-sectional',
    shape: 'sectional-l',
    widthIn: 84,
    depthIn: 36,
    heightIn: 34,
    sectionalRunIn: 68,
    sectionalArmDepthIn: 36,
    roomTypes: ['living'],
  },
  {
    id: 'sectional-chase',
    label: 'Sectional w/ chaise',
    shape: 'sectional-chase',
    widthIn: 84,
    depthIn: 36,
    heightIn: 34,
    sectionalRunIn: 80,
    sectionalArmDepthIn: 40,
    roomTypes: ['living'],
  },
  {
    id: 'sectional-u',
    label: 'U-sectional',
    shape: 'sectional-u',
    widthIn: 110,
    depthIn: 36,
    heightIn: 34,
    sectionalRunIn: 60,
    sectionalArmDepthIn: 36,
    roomTypes: ['living'],
  },
  { id: 'chair', label: 'Armchair', shape: 'box', widthIn: 32, depthIn: 32, heightIn: 32, roomTypes: ['living', 'bedroom'] },
  { id: 'coffee-table', label: 'Coffee table', shape: 'round', widthIn: 48, depthIn: 48, heightIn: 18, roomTypes: ['living'] },
  { id: 'tv-stand', label: 'TV stand', shape: 'box', widthIn: 60, depthIn: 18, heightIn: 24, roomTypes: ['living'] },
  { id: 'bookshelf', label: 'Bookshelf', shape: 'box', widthIn: 36, depthIn: 12, heightIn: 72, roomTypes: ['living', 'bedroom'] },
  { id: 'console-table', label: 'Console table', shape: 'box', widthIn: 48, depthIn: 14, heightIn: 32, roomTypes: ['living', 'hallway'] },
  { id: 'hallway-bench', label: 'Hallway bench', shape: 'box', widthIn: 48, depthIn: 16, heightIn: 18, roomTypes: ['hallway'] },
  { id: 'bed-queen', label: 'Queen bed', shape: 'box', widthIn: 60, depthIn: 80, heightIn: 24, roomTypes: ['bedroom'] },
  { id: 'bed-king', label: 'King bed', shape: 'box', widthIn: 76, depthIn: 80, heightIn: 24, roomTypes: ['bedroom'] },
  { id: 'dresser', label: 'Dresser', shape: 'box', widthIn: 60, depthIn: 18, heightIn: 34, roomTypes: ['bedroom'] },
  { id: 'nightstand', label: 'Nightstand', shape: 'box', widthIn: 24, depthIn: 18, heightIn: 24, roomTypes: ['bedroom'] },
  { id: 'desk', label: 'Desk', shape: 'box', widthIn: 48, depthIn: 24, heightIn: 30, roomTypes: ['bedroom', 'other', 'hallway'] },
  { id: 'dining-table', label: 'Dining table', shape: 'round', widthIn: 48, depthIn: 48, heightIn: 30, roomTypes: ['living', 'other'] },
  { id: 'generic-box', label: 'Custom box', shape: 'box', widthIn: 36, depthIn: 36, heightIn: 36 },
  { id: 'generic-round', label: 'Custom round', shape: 'round', widthIn: 36, depthIn: 36, heightIn: 36 },
];

export function templatesForRoomType(roomType: RoomType): CustomItemTemplate[] {
  return CUSTOM_ITEM_TEMPLATES.filter(
    (t) => !t.roomTypes || t.roomTypes.includes(roomType),
  );
}
