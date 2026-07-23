import type { RoomWallSide, SiteFenceStyle, SitePavingMaterial, SiteStructureKind } from '@/types';

export interface SiteStructurePreset {
  kind: SiteStructureKind;
  label: string;
  description: string;
  name: string;
  widthFt: number;
  depthFt: number;
  heightFt?: number;
  material?: SitePavingMaterial;
  fenceStyle?: SiteFenceStyle;
  doorSide?: RoomWallSide;
  /** Floor plan fill color */
  planFill: string;
  /** Floor plan stroke color */
  planStroke: string;
}

export const SITE_STRUCTURE_KINDS: SiteStructureKind[] = [
  'driveway',
  'detached-garage',
  'pole-barn',
  'shed',
  'fence',
  'breezeway',
];

export const SITE_STRUCTURE_PRESETS: Record<SiteStructureKind, SiteStructurePreset> = {
  driveway: {
    kind: 'driveway',
    label: 'Driveway',
    description: 'Paved vehicle path on the lot',
    name: 'Driveway',
    widthFt: 12,
    depthFt: 24,
    material: 'asphalt',
    planFill: '#4b5563',
    planStroke: '#374151',
  },
  'detached-garage': {
    kind: 'detached-garage',
    label: 'Detached garage',
    description: 'Standalone 2-car garage',
    name: 'Detached Garage',
    widthFt: 24,
    depthFt: 24,
    heightFt: 10,
    doorSide: 'front',
    planFill: '#64748b',
    planStroke: '#475569',
  },
  'pole-barn': {
    kind: 'pole-barn',
    label: 'Pole barn',
    description: 'Large open-span outbuilding',
    name: 'Pole Barn',
    widthFt: 30,
    depthFt: 40,
    heightFt: 14,
    doorSide: 'front',
    planFill: '#78716c',
    planStroke: '#57534e',
  },
  shed: {
    kind: 'shed',
    label: 'Shed',
    description: 'Small storage outbuilding',
    name: 'Shed',
    widthFt: 10,
    depthFt: 12,
    heightFt: 9,
    doorSide: 'front',
    planFill: '#a8a29e',
    planStroke: '#78716c',
  },
  fence: {
    kind: 'fence',
    label: 'Fence',
    description: 'Yard fence run',
    name: 'Fence',
    widthFt: 40,
    depthFt: 0.5,
    heightFt: 6,
    fenceStyle: 'wood',
    planFill: '#92400e',
    planStroke: '#78350f',
  },
  breezeway: {
    kind: 'breezeway',
    label: 'Breezeway',
    description: 'Covered walk between house and outbuilding',
    name: 'Breezeway',
    widthFt: 8,
    depthFt: 20,
    heightFt: 9,
    planFill: '#d6d3d1',
    planStroke: '#a8a29e',
  },
};

/** Detached outbuildings that open in the 3D room planner. */
export function isBuildingKind(kind: SiteStructureKind): boolean {
  return kind === 'detached-garage' || kind === 'pole-barn' || kind === 'shed';
}

export function isFenceKind(kind: SiteStructureKind): boolean {
  return kind === 'fence';
}

export function isBreezewayKind(kind: SiteStructureKind): boolean {
  return kind === 'breezeway';
}

/** Structures that keep height (buildings, fence, breezeway). */
export function hasStructureHeight(kind: SiteStructureKind): boolean {
  return isBuildingKind(kind) || kind === 'fence' || kind === 'breezeway';
}

/** Structures that support free rotation on the site plan. */
export function canRotateStructure(kind: SiteStructureKind): boolean {
  return isBuildingKind(kind) || kind === 'fence' || kind === 'breezeway';
}

export function getSiteStructurePreset(kind: SiteStructureKind): SiteStructurePreset {
  return SITE_STRUCTURE_PRESETS[kind];
}

export interface BuildingSizeOption {
  label: string;
  widthFt: number;
  depthFt: number;
  heightFt?: number;
}

/** Common footprint sizes when placing outbuildings on the site plan. */
export const BUILDING_SIZE_OPTIONS: Partial<Record<SiteStructureKind, BuildingSizeOption[]>> = {
  'detached-garage': [
    { label: '1-car', widthFt: 12, depthFt: 22, heightFt: 10 },
    { label: '2-car', widthFt: 24, depthFt: 24, heightFt: 10 },
    { label: '3-car', widthFt: 36, depthFt: 24, heightFt: 10 },
  ],
  'pole-barn': [
    { label: '24 × 32', widthFt: 24, depthFt: 32, heightFt: 12 },
    { label: '30 × 40', widthFt: 30, depthFt: 40, heightFt: 14 },
    { label: '40 × 60', widthFt: 40, depthFt: 60, heightFt: 16 },
  ],
  shed: [
    { label: '8 × 10', widthFt: 8, depthFt: 10, heightFt: 8 },
    { label: '10 × 12', widthFt: 10, depthFt: 12, heightFt: 9 },
    { label: '12 × 16', widthFt: 12, depthFt: 16, heightFt: 10 },
  ],
};

export const FENCE_THICKNESS_FT = 0.5;
export const FENCE_MIN_LENGTH_FT = 4;
export const FENCE_POST_SPACING_FT = 8;
