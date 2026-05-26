export type UnitSystem = 'imperial' | 'metric';

export type RoomType = 'kitchen' | 'bathroom' | 'bedroom' | 'living' | 'other';

export type CustomItemShape = 'box' | 'round';

export interface CustomItemSpec {
  label: string;
  shape: CustomItemShape;
  widthIn: number;
  depthIn: number;
  heightIn: number;
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
    totalSkus: number;
  };
  brands: {
    cabinets: CatalogBrandMeta[];
    countertops: CatalogBrandMeta[];
    vanities: CatalogBrandMeta[];
    toilets?: CatalogBrandMeta[];
    showers?: CatalogBrandMeta[];
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
