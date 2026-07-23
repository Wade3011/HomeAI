import type { CeilingType, RidgeAxis, RoomType, StoryDef } from '@/types';
import { archFt } from '@/lib/imperialDimensions';

/** Room footprint from BZAK 30' wide plan — exact stud-face dimensions from sheet. */
export interface FloorPlanPresetRoomDef {
  key: string;
  name: string;
  type: RoomType;
  widthFt: number;
  depthFt: number;
  layoutX: number;
  layoutZ: number;
  /** Wall / eave height. */
  heightFt?: number;
  ceilingType?: CeilingType;
  peakHeightFt?: number;
  ridgeAxis?: RidgeAxis;
  /** Defaults to Main (0). Use for loft / upper / basement rooms. */
  storyIndex?: number;
}

export interface FloorPlanPresetConnectionDef {
  roomA: string;
  roomB: string;
  kind: 'open' | 'door';
}

export interface FloorPlanPresetExteriorDoorDef {
  room: string;
  side: 'back' | 'front' | 'left' | 'right';
  offsetFt: number;
  widthFt?: number;
}

export interface FloorPlanPresetDef {
  id: string;
  version: number;
  name: string;
  description: string;
  source: string;
  /** Optional multi-level catalog; omit → Main only. */
  stories?: StoryDef[];
  rooms: FloorPlanPresetRoomDef[];
  connections: FloorPlanPresetConnectionDef[];
  exteriorDoors: FloorPlanPresetExteriorDoorDef[];
}

const H = 9;
/** Cathedral peak for living/dining (walls stay at H). */
const VAULTED_PEAK = archFt(12);
const HALL_W = archFt(0, 42); // 42"
const WEST_W = 9;
const HALL_X = WEST_W;
const EAST_X = HALL_X + HALL_W; // 12.5'

const OFFICE_1_D = archFt(7, 1, 1); // 7'-1 1/8"
const OFFICE_2_D = archFt(10, 5, 4); // 10'-5 1/2"
const PORCH_D = 8;
const PUBLIC_ROW_D = archFt(14, 6, 4); // 14'-6 1/2"
const LIVING_W = archFt(12, 6); // 12'-6"
const EAST_SPAN = 30 - EAST_X; // 17.5'
const DINING_W = EAST_SPAN - LIVING_W; // 5'
const KITCHEN_ROW_Z = PORCH_D + PUBLIC_ROW_D;
const KITCHEN_D = archFt(11, 6); // 11'-6"
const KITCHEN_W = archFt(7, 6); // 7'-6"
const KITCHEN_X = 30 - KITCHEN_W;
const PANTRY_D = 6;
const PANTRY_W = archFt(7, 3, 4); // 7'-3 1/2"
const PANTRY_ROW_Z = KITCHEN_ROW_Z + KITCHEN_D;
const BED1_D = 12;
const BED1_W = archFt(12, 6);
const BED1_Z = PANTRY_ROW_Z + PANTRY_D;
const BED2_D = archFt(12, 3, 4); // 12'-3 1/2"
const BED2_W = archFt(10, 4, 4); // 10'-4 1/2"
const BED2_Z = BED1_Z + BED1_D;
const SHARED_BATH_D = archFt(7, 3, 4);
const SHARED_BATH_Z = BED2_Z + BED2_D;
const MASTER_Z = BED1_Z;
const MASTER_D = 15;
const MASTER_BATH_Z = MASTER_Z + MASTER_D;
const MASTER_BATH_D = 11;
const SUITE_ROW_Z = MASTER_BATH_Z;
const CLOSET_W = archFt(12, 6);
const CLOSET_D = archFt(6, 3); // 6'-3"
const UTILITY_W = archFt(16, 3, 4); // 16'-3 1/2"
const UTILITY_D = archFt(11, 4, 4); // 11'-4 1/2"
const UTILITY_X = EAST_X;
const GARAGE_Z = archFt(42);
const GARAGE_X = 30;

/**
 * 7629 Kraenzlein Rd — Wade & Angela Sanmiguel
 * BZAK Builders "30' Wide Floor Plan" (sheet dated 01/22/26).
 */
export const KRAENZLEIN_7629_PRESET: FloorPlanPresetDef = {
  id: 'kraenzlein-7629',
  version: 6,
  name: '7629 Kraenzlein Rd',
  description:
    'BZAK 30\' wide new build — living/dining/kitchen, 3 beds, 2.5 baths, office, utility, 2-car garage, plus a partial loft over the garage.',
  source: '7629 Kraenzlein Rd-new build_D_30 Ft Wide Floor Plan_01-23-26',
  stories: [
    { storyIndex: 0, label: 'Main', kind: 'main', defaultHeightFt: H },
    {
      storyIndex: 1,
      label: 'Loft',
      kind: 'loft',
      defaultHeightFt: 8,
      partialFootprint: true,
    },
  ],
  rooms: [
    {
      key: 'porch',
      name: 'Covered Porch',
      type: 'porch',
      layoutX: 9,
      layoutZ: 0,
      widthFt: archFt(13, 2),
      depthFt: PORCH_D,
      heightFt: H,
    },
    {
      key: 'office-1',
      name: 'Office',
      type: 'office',
      layoutX: 0,
      layoutZ: 0,
      widthFt: WEST_W,
      depthFt: OFFICE_1_D,
      heightFt: H,
    },
    {
      key: 'office-2',
      name: 'Office 2',
      type: 'office',
      layoutX: 0,
      layoutZ: OFFICE_1_D,
      widthFt: WEST_W,
      depthFt: OFFICE_2_D,
      heightFt: H,
    },
    {
      key: 'hall',
      name: 'Hallway',
      type: 'hallway',
      layoutX: HALL_X,
      layoutZ: OFFICE_1_D,
      widthFt: HALL_W,
      depthFt: SHARED_BATH_Z + SHARED_BATH_D - OFFICE_1_D,
      heightFt: H,
    },
    {
      key: 'half-bath',
      name: 'Half Bath',
      type: 'bathroom',
      layoutX: EAST_X,
      layoutZ: OFFICE_1_D,
      widthFt: archFt(5, 6),
      depthFt: archFt(6, 0),
      heightFt: H,
    },
    {
      key: 'living',
      name: 'Living Room',
      type: 'living',
      layoutX: EAST_X,
      layoutZ: PORCH_D,
      widthFt: LIVING_W,
      depthFt: PUBLIC_ROW_D,
      heightFt: H,
      ceilingType: 'cathedral',
      peakHeightFt: VAULTED_PEAK,
      ridgeAxis: 'width',
    },
    {
      key: 'dining',
      name: 'Dining Area',
      type: 'dining',
      layoutX: EAST_X + LIVING_W,
      layoutZ: PORCH_D,
      widthFt: DINING_W,
      depthFt: PUBLIC_ROW_D,
      heightFt: H,
      ceilingType: 'cathedral',
      peakHeightFt: VAULTED_PEAK,
      ridgeAxis: 'width',
    },
    {
      key: 'kitchen',
      name: 'Kitchen',
      type: 'kitchen',
      layoutX: KITCHEN_X,
      layoutZ: KITCHEN_ROW_Z,
      widthFt: archFt(7, 6),
      depthFt: KITCHEN_D,
      heightFt: H,
    },
    {
      key: 'pantry',
      name: 'Pantry',
      type: 'pantry',
      layoutX: EAST_X,
      layoutZ: KITCHEN_ROW_Z,
      widthFt: PANTRY_W,
      depthFt: PANTRY_D,
      heightFt: H,
    },
    {
      key: 'bed-1',
      name: 'Bedroom',
      type: 'bedroom',
      layoutX: EAST_X,
      layoutZ: BED1_Z,
      widthFt: BED1_W,
      depthFt: BED1_D,
      heightFt: H,
    },
    {
      key: 'bed-2',
      name: 'Bedroom 2',
      type: 'bedroom',
      layoutX: EAST_X,
      layoutZ: BED2_Z,
      widthFt: BED2_W,
      depthFt: BED2_D,
      heightFt: H,
    },
    {
      key: 'shared-bath',
      name: 'Bath',
      type: 'bathroom',
      layoutX: EAST_X,
      layoutZ: SHARED_BATH_Z,
      widthFt: 9,
      depthFt: SHARED_BATH_D,
      heightFt: H,
    },
    {
      key: 'master',
      name: 'Master Bedroom',
      type: 'master-bedroom',
      layoutX: 0,
      layoutZ: MASTER_Z,
      widthFt: WEST_W,
      depthFt: MASTER_D,
      heightFt: H,
    },
    {
      key: 'master-bath',
      name: 'Master Bath',
      type: 'bathroom',
      layoutX: 0,
      layoutZ: MASTER_BATH_Z,
      widthFt: WEST_W,
      depthFt: MASTER_BATH_D,
      heightFt: H,
    },
    {
      key: 'master-closet',
      name: 'Walk-in Closet',
      type: 'closet',
      layoutX: EAST_X,
      layoutZ: SUITE_ROW_Z,
      widthFt: 15,
      depthFt: CLOSET_D,
      heightFt: H,
    },
    {
      key: 'utility',
      name: 'Utility Room',
      type: 'utility',
      layoutX: UTILITY_X,
      layoutZ: SUITE_ROW_Z,
      widthFt: UTILITY_W,
      depthFt: UTILITY_D,
      heightFt: H,
    },
    {
      key: 'garage',
      name: 'Garage',
      type: 'garage',
      layoutX: GARAGE_X,
      layoutZ: GARAGE_Z,
      widthFt: 40,
      depthFt: 30,
      heightFt: H,
    },
    {
      key: 'garage-loft',
      name: 'Garage loft',
      type: 'other',
      layoutX: GARAGE_X + 4,
      layoutZ: GARAGE_Z + 4,
      widthFt: 20,
      depthFt: 16,
      heightFt: 8,
      storyIndex: 1,
    },
  ],
  connections: [
    { roomA: 'living', roomB: 'dining', kind: 'open' },
    { roomA: 'dining', roomB: 'kitchen', kind: 'open' },
    { roomA: 'kitchen', roomB: 'pantry', kind: 'door' },
    { roomA: 'porch', roomB: 'living', kind: 'door' },
    { roomA: 'hall', roomB: 'living', kind: 'door' },
    { roomA: 'hall', roomB: 'half-bath', kind: 'door' },
    { roomA: 'hall', roomB: 'bed-1', kind: 'door' },
    { roomA: 'hall', roomB: 'bed-2', kind: 'door' },
    { roomA: 'hall', roomB: 'master', kind: 'door' },
    { roomA: 'bed-1', roomB: 'shared-bath', kind: 'door' },
    { roomA: 'bed-2', roomB: 'shared-bath', kind: 'door' },
    { roomA: 'master', roomB: 'master-bath', kind: 'door' },
    { roomA: 'master-bath', roomB: 'master-closet', kind: 'door' },
    { roomA: 'master-closet', roomB: 'utility', kind: 'door' },
    { roomA: 'utility', roomB: 'garage', kind: 'door' },
  ],
  exteriorDoors: [
    { room: 'porch', side: 'back', offsetFt: archFt(6, 6), widthFt: 3 },
    { room: 'master', side: 'left', offsetFt: archFt(7, 6), widthFt: 5 },
    { room: 'garage', side: 'right', offsetFt: 15, widthFt: 3 },
    { room: 'garage', side: 'front', offsetFt: 20, widthFt: 3 },
  ],
};
