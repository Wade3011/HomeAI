export type UnitSystem = 'imperial' | 'metric';

export type RoomType =
  | 'kitchen'
  | 'bathroom'
  | 'bedroom'
  | 'master-bedroom'
  | 'living'
  | 'dining'
  | 'hallway'
  | 'office'
  | 'pantry'
  | 'utility'
  | 'garage'
  | 'porch'
  | 'closet'
  | 'other';

export type CustomItemShape =
  | 'box'
  | 'round'
  | 'sectional-l'
  | 'sectional-u'
  | 'sectional-chase';

export interface CustomItemSpec {
  label: string;
  shape: CustomItemShape;
  /** Main sofa width along the wall (inches) */
  widthIn: number;
  /** Main seat depth (inches) */
  depthIn: number;
  heightIn: number;
  /** Chaise / arm extension length into the room (inches) — L, U, chase */
  sectionalRunIn?: number;
  /** Chaise / arm width along the sofa (inches) */
  sectionalArmDepthIn?: number;
}

export type FloorFinishId =
  | 'hardwood-oak'
  | 'hardwood-walnut'
  | 'tile-ceramic'
  | 'tile-marble'
  | 'carpet'
  | 'luxury-vinyl'
  | 'concrete';

export type StylePackId = 'modern' | 'farmhouse' | 'coastal' | 'industrial';

/**
 * Vertical level in the house.
 * - basement: below grade (storyIndex < 0)
 * - main: finish floor at Y=0 (storyIndex 0)
 * - upper: full (or near-full) floor plate above main
 * - loft / attic: often a *partial* footprint over part of the house
 */
export type StoryKind = 'basement' | 'main' | 'upper' | 'loft' | 'attic';

export interface StoryDef {
  storyIndex: number;
  label: string;
  kind: StoryKind;
  /** Clear height used for stacking stories and default new-room height. */
  defaultHeightFt: number;
  /**
   * When true, this level may not fill the main floor plate (loft/attic).
   * Floor plan ghosts the main outline underneath for alignment.
   */
  partialFootprint?: boolean;
}

export interface Project {
  projectId: string;
  ownerUserId: string;
  name: string;
  unitSystem: UnitSystem;
  /** Active style pack (materials defaults); optional. */
  stylePackId?: StylePackId;
  /** Vertical levels; omit → treated as Main only. */
  stories?: StoryDef[];
  createdAt: string;
  updatedAt: string;
}

export type CeilingType = 'flat' | 'cathedral';

/** Ridge line direction for cathedral ceilings. */
export type RidgeAxis = 'width' | 'depth';

export interface Room {
  roomId: string;
  projectId: string;
  type: RoomType | string;
  name: string;
  widthFt: number;
  depthFt: number;
  /**
   * Wall top height (feet). For flat ceilings this is also the ceiling.
   * For cathedral ceilings this is the **eave** height.
   */
  heightFt: number;
  /** Default 'flat' when omitted. */
  ceilingType?: CeilingType;
  /** Cathedral ridge height — must be > heightFt. */
  peakHeightFt?: number;
  /** Cathedral ridge direction. Default 'width'. */
  ridgeAxis?: RidgeAxis;
  /** Floor finish for 2D/3D product feel. */
  floorFinishId?: FloorFinishId;
  /**
   * Which story this room sits on. Default 0 (Main).
   * Shared XZ origin across stories so lofts/upper floors align over rooms below.
   */
  storyIndex?: number;
  /** Position on project floor plan (feet from origin) */
  layoutX?: number;
  layoutZ?: number;
  /** Set when this room is the interior planner for a detached site structure. */
  linkedSiteStructureId?: string;
  createdAt: string;
  updatedAt: string;
}

export type RoomConnectionKind = 'open' | 'door';

/** Which wall of a room meets a connected neighbor on the floor plan. */
export type RoomWallSide = 'back' | 'front' | 'left' | 'right';

/** Link between two rooms: open = wall removed, door = 3ft opening centered. */
export interface RoomConnection {
  connectionId: string;
  projectId: string;
  roomAId: string;
  roomBId: string;
  kind: RoomConnectionKind;
  /** Persisted wall side for roomA — used to keep connections when rooms resize. */
  sideA?: RoomWallSide;
  /** Persisted wall side for roomB */
  sideB?: RoomWallSide;
}

/** Exterior entry door on a room wall (not shared with another room). */
export interface ExteriorDoor {
  doorId: string;
  projectId: string;
  roomId: string;
  side: RoomWallSide;
  /** Center position along the wall in feet (wall-local). */
  offsetFt: number;
  widthFt?: number;
}

export interface Placement {
  placementId: string;
  roomId: string;
  /** Set for kitchen/bathroom catalog items — fixed sizes from catalog */
  catalogItemId?: string;
  /** Set for bedroom/living custom blocks — user-editable size & shape */
  customItem?: CustomItemSpec;
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationY: number;
  createdAt?: string;
  updatedAt?: string;
}

export type CatalogBrandTier = 'stock' | 'semi-custom' | 'custom';

export interface CatalogItem {
  itemId: string;
  category: string;
  subcategory?: string;
  brand: string;
  brandId?: string;
  brandTier?: CatalogBrandTier;
  name: string;
  widthIn: number;
  depthIn: number;
  heightIn: number;
  listPrice: number;
  material?: string;
  thumbnailUrl?: string;
  /** manual until retailer API sync */
  priceSource?: 'manual' | 'api';
  priceUpdatedAt?: string;
}

export interface CatalogBrandMeta {
  id: string;
  name: string;
  tier?: CatalogBrandTier;
  material?: string;
  pricePerSqFt?: number;
  referencePrice24Base?: number;
  referencePrice24Wall?: number;
  referencePrice36?: number;
}

export interface CatalogFile {
  version: string;
  generatedAt: string;
  priceDisclaimer: string;
  priceCalibratedAt?: string;
  stats?: {
    cabinetBrands: number;
    countertopBrands: number;
    vanityBrands: number;
    toiletSkus?: number;
    showerSkus?: number;
    applianceSkus?: number;
    totalSkus: number;
  };
  brands: {
    cabinets: CatalogBrandMeta[];
    countertops: CatalogBrandMeta[];
    vanities: CatalogBrandMeta[];
    toilets?: CatalogBrandMeta[];
    showers?: CatalogBrandMeta[];
    appliances?: CatalogBrandMeta[];
  };
  items: CatalogItem[];
}

export interface PriceEstimate {
  unitPrice: number;
  unit: string;
  labor: number;
  materials: number;
  source: string;
}

export interface RoomEstimate {
  total: number;
  lineItems: { placementId: string; name: string; price: number }[];
  source: string;
}

export interface SiteSettings {
  projectId: string;
  /** Lot width along +X (feet). */
  lotWidthFt: number;
  /** Lot depth along +Z (feet). */
  lotDepthFt: number;
  /** Optional shift of house footprint on lot (feet). */
  houseOffsetX?: number;
  houseOffsetZ?: number;
  /** Lot edges that border a public street (1 = standard lot, 2 adjacent = corner lot). */
  roadSides?: SiteRoadSide[];
}

/** Cardinal edge of the lot that faces a street (plan +X = east, +Z = south). */
export type SiteRoadSide = 'north' | 'south' | 'east' | 'west';

/** Corner where two streets meet along adjacent lot edges. */
export type SiteCorner = 'north-west' | 'north-east' | 'south-west' | 'south-east';

export type SiteStructureKind =
  | 'driveway'
  | 'detached-garage'
  | 'pole-barn'
  | 'shed'
  | 'fence'
  | 'breezeway';

export type SitePavingMaterial = 'asphalt' | 'concrete' | 'gravel' | 'pavers';

export type SiteFenceStyle = 'wood' | 'vinyl' | 'chain-link';

/** Point on site plan in world feet (x, z). */
export interface SitePoint {
  x: number;
  z: number;
}

export interface SiteStructure {
  structureId: string;
  projectId: string;
  kind: SiteStructureKind;
  name: string;
  /** Closed polygon footprint (MVP uses 4 points for rectangles). */
  points: SitePoint[];
  /** Building center — simplifies drag/rotate in the site editor. */
  centerX?: number;
  centerZ?: number;
  widthFt?: number;
  depthFt?: number;
  /** Building rotation around Y in radians (0 = width along X). */
  rotationY?: number;
  heightFt?: number;
  /** Driveway paving material. */
  material?: SitePavingMaterial;
  /** Fence style (fence only). */
  fenceStyle?: SiteFenceStyle;
  /** Building main door wall side. */
  doorSide?: RoomWallSide;
  /** Room used for interior planner when opening a detached building. */
  linkedRoomId?: string;
  createdAt: string;
  updatedAt: string;
}
