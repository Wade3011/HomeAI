import type { CatalogSectionId } from '@/config/catalogCategories';
import type { CustomItemShape, RoomType } from '@/types';

/** Order shown in floor plan “add room” picker. */
export const ROOM_TYPES: RoomType[] = [
  'kitchen',
  'living',
  'dining',
  'bathroom',
  'bedroom',
  'master-bedroom',
  'office',
  'pantry',
  'utility',
  'garage',
  'porch',
  'closet',
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
  /** Floor plan tile color */
  planFill: string;
  catalogSections: CatalogSectionId[];
  allowsCustomItems: boolean;
  hasCatalogPricing: boolean;
}

const customOnly = (overrides: Partial<RoomTypePreset> & Pick<RoomTypePreset, 'type' | 'label' | 'name'>): RoomTypePreset => ({
  description: 'Custom furniture blocks — sizes you define',
  widthFt: 12,
  depthFt: 12,
  heightFt: 9,
  planFill: '#e7e5e4',
  catalogSections: [],
  allowsCustomItems: true,
  hasCatalogPricing: false,
  ...overrides,
});

export const ROOM_TYPE_PRESETS: Record<RoomType, RoomTypePreset> = {
  kitchen: {
    type: 'kitchen',
    label: 'Kitchen',
    description: 'Cabinets, countertops — catalog pricing',
    name: 'Kitchen',
    widthFt: 14,
    depthFt: 12,
    heightFt: 9,
    planFill: '#c4b5a0',
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
    planFill: '#c5d4dc',
    catalogSections: ['vanities', 'toilets', 'showers'],
    allowsCustomItems: false,
    hasCatalogPricing: true,
  },
  bedroom: {
    type: 'bedroom',
    label: 'Bedroom',
    description: 'Secondary bedroom — custom furniture',
    name: 'Bedroom',
    widthFt: 12,
    depthFt: 11,
    heightFt: 9,
    planFill: '#ddd6fe',
    catalogSections: [],
    allowsCustomItems: true,
    hasCatalogPricing: false,
  },
  'master-bedroom': {
    type: 'master-bedroom',
    label: 'Master bedroom',
    description: 'Primary suite — custom furniture',
    name: 'Master Bedroom',
    widthFt: 14,
    depthFt: 15,
    heightFt: 9,
    planFill: '#e9d5ff',
    catalogSections: [],
    allowsCustomItems: true,
    hasCatalogPricing: false,
  },
  living: {
    type: 'living',
    label: 'Living room',
    description: 'Living area — custom furniture',
    name: 'Living Room',
    widthFt: 16,
    depthFt: 14,
    heightFt: 10,
    planFill: '#fde68a',
    catalogSections: [],
    allowsCustomItems: true,
    hasCatalogPricing: false,
  },
  dining: {
    type: 'dining',
    label: 'Dining',
    description: 'Dining area — table & seating',
    name: 'Dining Area',
    widthFt: 12,
    depthFt: 14,
    heightFt: 10,
    planFill: '#fef3c7',
    catalogSections: [],
    allowsCustomItems: true,
    hasCatalogPricing: false,
  },
  hallway: {
    type: 'hallway',
    label: 'Hallway',
    description: 'Circulation — benches & consoles',
    name: 'Hallway',
    widthFt: 3.5,
    depthFt: 12,
    heightFt: 9,
    planFill: '#d4cfc7',
    catalogSections: [],
    allowsCustomItems: true,
    hasCatalogPricing: false,
  },
  office: {
    type: 'office',
    label: 'Office',
    description: 'Home office — desk & storage',
    name: 'Office',
    widthFt: 10,
    depthFt: 10,
    heightFt: 9,
    planFill: '#bfdbfe',
    catalogSections: [],
    allowsCustomItems: true,
    hasCatalogPricing: false,
  },
  pantry: {
    type: 'pantry',
    label: 'Pantry',
    description: 'Food storage — optional base cabinets',
    name: 'Pantry',
    widthFt: 6,
    depthFt: 7,
    heightFt: 9,
    planFill: '#d6d3d1',
    catalogSections: ['base-cabinets'],
    allowsCustomItems: true,
    hasCatalogPricing: true,
  },
  utility: {
    type: 'utility',
    label: 'Utility room',
    description: 'Laundry & mechanical — custom blocks',
    name: 'Utility Room',
    widthFt: 10,
    depthFt: 11,
    heightFt: 9,
    planFill: '#cbd5e1',
    catalogSections: [],
    allowsCustomItems: true,
    hasCatalogPricing: false,
  },
  garage: {
    type: 'garage',
    label: 'Garage',
    description: 'Vehicle storage — open floor plan',
    name: 'Garage',
    widthFt: 24,
    depthFt: 24,
    heightFt: 9,
    planFill: '#94a3b8',
    catalogSections: [],
    allowsCustomItems: true,
    hasCatalogPricing: false,
  },
  porch: {
    type: 'porch',
    label: 'Porch',
    description: 'Covered entry — custom blocks',
    name: 'Covered Porch',
    widthFt: 12,
    depthFt: 8,
    heightFt: 9,
    planFill: '#d6cfc4',
    catalogSections: [],
    allowsCustomItems: true,
    hasCatalogPricing: false,
  },
  closet: {
    type: 'closet',
    label: 'Closet',
    description: 'Walk-in or reach-in closet',
    name: 'Closet',
    widthFt: 8,
    depthFt: 6,
    heightFt: 9,
    planFill: '#e5e7eb',
    catalogSections: [],
    allowsCustomItems: true,
    hasCatalogPricing: false,
  },
  other: customOnly({
    type: 'other',
    label: 'Other',
    description: 'General room — custom blocks only',
    name: 'Room',
  }),
};

const LEGACY_TYPE_ALIASES: Record<string, RoomType> = {
  'master bedroom': 'master-bedroom',
  master: 'master-bedroom',
  'master-bed': 'master-bedroom',
  'dining room': 'dining',
  'dining-area': 'dining',
  'utility room': 'utility',
  laundry: 'utility',
  'walk-in closet': 'closet',
  'walk-in': 'closet',
};

export function normalizeRoomType(type: string | undefined): RoomType {
  if (!type) return 'other';
  const key = type.trim().toLowerCase();
  if (key in ROOM_TYPE_PRESETS) return key as RoomType;
  if (key in LEGACY_TYPE_ALIASES) return LEGACY_TYPE_ALIASES[key];
  return 'other';
}

export function roomTypePreset(type: string | undefined): RoomTypePreset {
  return ROOM_TYPE_PRESETS[normalizeRoomType(type)];
}

export function roomPlanFill(type: string | undefined): string {
  return roomTypePreset(type).planFill;
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

const BED_TYPES: RoomType[] = ['bedroom', 'master-bedroom'];
const SEATING: RoomType[] = ['living', 'dining'];

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
  { id: 'chair', label: 'Armchair', shape: 'box', widthIn: 32, depthIn: 32, heightIn: 32, roomTypes: [...SEATING, ...BED_TYPES] },
  { id: 'coffee-table', label: 'Coffee table', shape: 'round', widthIn: 48, depthIn: 48, heightIn: 18, roomTypes: ['living'] },
  { id: 'tv-stand', label: 'TV stand', shape: 'box', widthIn: 60, depthIn: 18, heightIn: 24, roomTypes: ['living'] },
  { id: 'bookshelf', label: 'Bookshelf', shape: 'box', widthIn: 36, depthIn: 12, heightIn: 72, roomTypes: ['living', 'office', ...BED_TYPES] },
  { id: 'console-table', label: 'Console table', shape: 'box', widthIn: 48, depthIn: 14, heightIn: 32, roomTypes: ['living', 'hallway', 'porch'] },
  { id: 'hallway-bench', label: 'Hallway bench', shape: 'box', widthIn: 48, depthIn: 16, heightIn: 18, roomTypes: ['hallway', 'porch'] },
  { id: 'bed-queen', label: 'Queen bed', shape: 'box', widthIn: 60, depthIn: 80, heightIn: 24, roomTypes: BED_TYPES },
  { id: 'bed-king', label: 'King bed', shape: 'box', widthIn: 76, depthIn: 80, heightIn: 24, roomTypes: ['master-bedroom'] },
  { id: 'dresser', label: 'Dresser', shape: 'box', widthIn: 60, depthIn: 18, heightIn: 34, roomTypes: BED_TYPES },
  { id: 'nightstand', label: 'Nightstand', shape: 'box', widthIn: 24, depthIn: 18, heightIn: 24, roomTypes: BED_TYPES },
  { id: 'desk', label: 'Desk', shape: 'box', widthIn: 48, depthIn: 24, heightIn: 30, roomTypes: ['office', ...BED_TYPES, 'hallway', 'other'] },
  { id: 'dining-table', label: 'Dining table', shape: 'round', widthIn: 48, depthIn: 48, heightIn: 30, roomTypes: ['dining', 'living'] },
  { id: 'washer', label: 'Washer', shape: 'box', widthIn: 27, depthIn: 30, heightIn: 38, roomTypes: ['utility'] },
  { id: 'dryer', label: 'Dryer', shape: 'box', widthIn: 27, depthIn: 30, heightIn: 38, roomTypes: ['utility'] },
  { id: 'generic-box', label: 'Custom box', shape: 'box', widthIn: 36, depthIn: 36, heightIn: 36 },
  { id: 'generic-round', label: 'Custom round', shape: 'round', widthIn: 36, depthIn: 36, heightIn: 36 },
];

export function templatesForRoomType(roomType: RoomType): CustomItemTemplate[] {
  return CUSTOM_ITEM_TEMPLATES.filter(
    (t) => !t.roomTypes || t.roomTypes.includes(roomType),
  );
}
