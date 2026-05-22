export interface ProjectRecord {
  projectId: string;
  ownerUserId: string;
  name: string;
  unitSystem: 'imperial' | 'metric';
  createdAt: string;
  updatedAt: string;
}

export interface RoomRecord {
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

export interface PlacementRecord {
  placementId: string;
  roomId: string;
  catalogItemId: string;
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationY: number;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogItemRecord {
  itemId: string;
  category: string;
  subcategory?: string;
  name: string;
  widthIn: number;
  depthIn: number;
  heightIn: number;
  listPrice: number;
  material?: string;
  thumbnailUrl?: string;
}
