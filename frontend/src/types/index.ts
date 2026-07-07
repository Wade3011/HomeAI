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

export interface Project {
  projectId: string;
  ownerUserId: string;
  name: string;
  unitSystem: UnitSystem;
  createdAt: string;
  updatedAt: string;
}

export interface Room {
  roomId: string;
  projectId: string;
  type: RoomType | string;
  name: string;
  widthFt: number;
  depthFt: number;
  heightFt: number;
  /** Position on project floor plan (feet from origin) */
  layoutX?: number;
  layoutZ?: number;
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
  /** Paved street width outside the lot edge (feet). */
  roadWidthFt?: number;
}

/** Cardinal edge of the lot that faces a street (plan +X = east, +Z = south). */
export type SiteRoadSide = 'north' | 'south' | 'east' | 'west';

/** Corner where two streets meet along adjacent lot edges. */
export type SiteCorner = 'north-west' | 'north-east' | 'south-west' | 'south-east';

export type SiteStructureKind =
  | 'driveway'
  | 'detached-garage'
  | 'pole-barn'
  | 'shed';

export type SitePavingMaterial = 'asphalt' | 'concrete' | 'gravel' | 'pavers';

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
  /** Building main door wall side. */
  doorSide?: RoomWallSide;
  /** Room used for interior planner when opening a detached building. */
  linkedRoomId?: string;
  createdAt: string;
  updatedAt: string;
}
