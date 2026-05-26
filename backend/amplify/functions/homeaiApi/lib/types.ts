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
  layoutX?: number;
  layoutZ?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlacementRecord {
  placementId: string;
  roomId: string;
  catalogItemId?: string;
  customItem?: {
    label: string;
    shape: 'box' | 'round' | 'sectional-l' | 'sectional-u' | 'sectional-chase';
    widthIn: number;
    depthIn: number;
    heightIn: number;
    sectionalRunIn?: number;
    sectionalArmDepthIn?: number;
  };
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
