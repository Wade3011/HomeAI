export type UnitSystem = 'imperial' | 'metric';

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
  type: string;
  name: string;
  widthFt: number;
  depthFt: number;
  heightFt: number;
  createdAt: string;
  updatedAt: string;
}

export interface Placement {
  placementId: string;
  roomId: string;
  catalogItemId: string;
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
  stats?: {
    cabinetBrands: number;
    countertopBrands: number;
    vanityBrands: number;
    totalSkus: number;
  };
  brands: {
    cabinets: CatalogBrandMeta[];
    countertops: CatalogBrandMeta[];
    vanities: CatalogBrandMeta[];
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
