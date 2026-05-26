/**
 * Generates frontend/src/data/catalog.json
 * Run: npm run generate:catalog  (or node scripts/generate-catalog.mjs)
 * Material list prices calibrated May 2026 from Menards PDP dimensions + national
 * retailer shelf pricing (Home Depot / manufacturer MSRP) where Menards blocks bots.
 * Replace with API overrides via priceSource when available.
 */
const PRICE_CALIBRATED_AT = '2026-05-19';
const PRICE_SOURCE = 'manual';

import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../src/data/catalog.json');

const BASE_WIDTHS = [9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42];
const WALL_WIDTHS = [9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 42];
const COUNTER_WIDTHS = [25, 30, 36, 42, 48, 60, 72, 84, 96, 108, 120];
const VANITY_WIDTHS = [18, 24, 30, 36, 42, 48, 60, 72];

/** @type {{ id: string, name: string, tier: string, base24: number, wall24: number, finish: string, baseDepthIn?: number, wallDepthIn?: number, baseHeightIn?: number, wallHeightIn?: number, extraBaseWidths?: number[], extraWallWidths?: number[] }[]} */
const CABINET_BRANDS = [
  // Stock / RTA
  { id: 'ikea', name: 'IKEA', tier: 'stock', base24: 139, wall24: 89, finish: 'SEKTION White' },
  { id: 'hampton-bay', name: 'Hampton Bay', tier: 'stock', base24: 169, wall24: 109, finish: 'Shaker White' },
  { id: 'allen-roth', name: 'Allen + Roth', tier: 'stock', base24: 189, wall24: 119, finish: 'Agreeable Gray' },
  { id: 'glacier-bay', name: 'Glacier Bay', tier: 'stock', base24: 159, wall24: 99, finish: 'White' },
  { id: 'design-house', name: 'Design House', tier: 'stock', base24: 149, wall24: 95, finish: 'White' },
  { id: 'contractor-express', name: 'Contractor Express', tier: 'stock', base24: 129, wall24: 85, finish: 'Oak' },
  { id: 'cnc-cabinetry', name: 'CNC Cabinetry', tier: 'stock', base24: 155, wall24: 102, finish: 'Espresso Shaker' },
  { id: 'cubitac', name: 'Cubitac', tier: 'stock', base24: 145, wall24: 92, finish: 'White Shaker' },
  { id: 'fabuwood', name: 'Fabuwood', tier: 'stock', base24: 175, wall24: 115, finish: 'Galaxy Frost' },
  { id: 'forevermark', name: 'Forevermark', tier: 'stock', base24: 165, wall24: 108, finish: 'Pearl White' },
  { id: 'j&k-cabinetry', name: 'J&K Cabinetry', tier: 'stock', base24: 152, wall24: 98, finish: 'Shaker Gray' },
  { id: 'lily-ann', name: 'Lily Ann Cabinets', tier: 'stock', base24: 148, wall24: 94, finish: 'White' },
  { id: 'rta-cabinet-store', name: 'RTA Cabinet Store', tier: 'stock', base24: 142, wall24: 90, finish: 'Shaker Dove' },
  { id: 'wolf-home-products', name: 'Wolf Home Products', tier: 'stock', base24: 198, wall24: 128, finish: 'Black Walnut' },
  { id: 'norcraft', name: 'Norcraft', tier: 'stock', base24: 188, wall24: 122, finish: 'Canvas' },
  { id: 'masterbrand-ultra', name: 'Ultracraft (MasterBrand)', tier: 'stock', base24: 215, wall24: 138, finish: 'Full Overlay White' },
  // Menards® Klearvue — 24"D×30"H bases, 14"D×30"H walls (Klearvue config guide / Menards PDP)
  {
    id: 'klearvue-menards',
    name: 'Klearvue (Menards)',
    tier: 'stock',
    base24: 199,
    wall24: 129,
    finish: 'Assembled Entry Style',
    baseDepthIn: 24,
    wallDepthIn: 14,
    baseHeightIn: 30,
    wallHeightIn: 30,
    extraBaseWidths: [48],
    extraWallWidths: [48],
  },
  {
    id: 'klearvue-visby',
    name: 'Klearvue Visby (Menards)',
    tier: 'stock',
    base24: 219,
    wall24: 139,
    finish: 'Golden Oak',
    baseDepthIn: 24,
    wallDepthIn: 14,
    baseHeightIn: 30,
    wallHeightIn: 30,
    extraWallWidths: [48],
  },
  {
    id: 'klearvue-malmo',
    name: 'Klearvue Malmo (Menards)',
    tier: 'stock',
    base24: 225,
    wall24: 142,
    finish: 'Suede',
    baseDepthIn: 24,
    wallDepthIn: 14,
    baseHeightIn: 30,
    wallHeightIn: 30,
  },
  {
    id: 'klearvue-stromma',
    name: 'Klearvue Stromma (Menards)',
    tier: 'stock',
    base24: 229,
    wall24: 145,
    finish: 'Midnight Blue',
    baseDepthIn: 24,
    wallDepthIn: 14,
    baseHeightIn: 30,
    wallHeightIn: 30,
  },
  {
    id: 'klearvue-linsell',
    name: 'Klearvue Linsell (Menards)',
    tier: 'stock',
    base24: 215,
    wall24: 138,
    finish: 'Ivory',
    baseDepthIn: 24,
    wallDepthIn: 14,
    baseHeightIn: 30,
    wallHeightIn: 30,
  },
  {
    id: 'quality-one-menards',
    name: 'Quality One (Menards)',
    tier: 'stock',
    base24: 165,
    wall24: 105,
    finish: 'Unfinished Premium Maple',
    extraBaseWidths: [48],
    extraWallWidths: [48],
  },
  {
    id: 'cardell-concepts-menards',
    name: 'Cardell Concepts (Menards)',
    tier: 'stock',
    base24: 219,
    wall24: 142,
    finish: 'Knowlton Peppercorn',
  },
  // Semi-custom
  { id: 'schuler-menards', name: 'Schuler (Menards)', tier: 'semi-custom', base24: 289, wall24: 189, finish: 'Maple Shaker' },
  { id: 'kraftmaid', name: 'KraftMaid', tier: 'semi-custom', base24: 319, wall24: 209, finish: 'Cherry Raised Panel' },
  { id: 'diamond', name: 'Diamond', tier: 'semi-custom', base24: 289, wall24: 189, finish: 'Espresso Shaker' },
  { id: 'thomasville', name: 'Thomasville', tier: 'semi-custom', base24: 349, wall24: 229, finish: 'Maple Cognac' },
  { id: 'homecrest', name: 'Homecrest', tier: 'semi-custom', base24: 329, wall24: 219, finish: 'Gray Shaker' },
  { id: 'merillat', name: 'Merillat', tier: 'semi-custom', base24: 279, wall24: 179, finish: 'Classic White' },
  { id: 'american-woodmark', name: 'American Woodmark', tier: 'semi-custom', base24: 269, wall24: 175, finish: 'Oak Honey' },
  { id: 'omega', name: 'Omega Cabinetry', tier: 'semi-custom', base24: 359, wall24: 239, finish: 'Dove White' },
  { id: 'aristokraft', name: 'Aristokraft', tier: 'semi-custom', base24: 259, wall24: 169, finish: 'Slate' },
  { id: 'decora', name: 'Decora', tier: 'semi-custom', base24: 379, wall24: 249, finish: 'Painted Linen' },
  { id: 'medallion', name: 'Medallion', tier: 'semi-custom', base24: 339, wall24: 225, finish: 'Alabaster' },
  {
    id: 'medallion-menards',
    name: 'Medallion at Menards',
    tier: 'semi-custom',
    base24: 398,
    wall24: 268,
    finish: 'Silverline Full Overlay',
    extraBaseWidths: [48],
    extraWallWidths: [48],
  },
  {
    id: 'medallion-deluxe-menards',
    name: 'Medallion Deluxe (Menards)',
    tier: 'semi-custom',
    base24: 448,
    wall24: 298,
    finish: 'Factory Modifications',
    extraBaseWidths: [48],
    extraWallWidths: [48],
  },
  { id: 'caldwell', name: 'Caldwell (Medallion at Menards)', tier: 'semi-custom', base24: 418, wall24: 278, finish: 'Espresso on Cherry', extraWallWidths: [48] },
  {
    id: 'springmont-menards',
    name: 'Springmont (Medallion at Menards)',
    tier: 'semi-custom',
    base24: 342,
    wall24: 228,
    finish: 'Raised Panel Maple',
    extraWallWidths: [48],
  },
  { id: 'ultra-style', name: 'Ultrastyle', tier: 'semi-custom', base24: 299, wall24: 195, finish: 'Stone Gray' },
  { id: 'waypoint', name: 'Waypoint Living Spaces', tier: 'semi-custom', base24: 309, wall24: 199, finish: 'Mocha Glaze' },
  { id: 'mid-continent', name: 'Mid Continent', tier: 'semi-custom', base24: 289, wall24: 185, finish: 'Hickory Natural' },
  { id: 'kemper', name: 'Kemper', tier: 'semi-custom', base24: 319, wall24: 205, finish: 'Cinnamon' },
  { id: 'showplace', name: 'Showplace', tier: 'semi-custom', base24: 349, wall24: 228, finish: 'Evergreen' },
  { id: 'cardell', name: 'Cardell', tier: 'semi-custom', base24: 299, wall24: 192, finish: 'Sandstone' },
  {
    id: 'cardell-menards',
    name: 'Cardell Designer (Menards)',
    tier: 'semi-custom',
    base24: 338,
    wall24: 218,
    finish: 'Lakeridge Dove White',
    extraBaseWidths: [48],
    extraWallWidths: [48],
  },
  {
    id: 'cardell-cornerstone-menards',
    name: 'Cardell Cornerstone (Menards)',
    tier: 'semi-custom',
    base24: 268,
    wall24: 178,
    finish: 'Forestville Natural Oak',
    extraWallWidths: [48],
  },
  {
    id: 'lakeridge-cardell',
    name: 'Cardell Lakeridge (Menards)',
    tier: 'semi-custom',
    base24: 308,
    wall24: 202,
    finish: 'Molasses Shaker',
    extraWallWidths: [48],
  },
  {
    id: 'rockney-cardell',
    name: 'Cardell Rockney (Menards)',
    tier: 'semi-custom',
    base24: 318,
    wall24: 208,
    finish: 'Dove White',
    extraWallWidths: [48],
  },
  { id: 'shenandoah', name: 'Shenandoah', tier: 'semi-custom', base24: 325, wall24: 212, finish: 'Espresso' },
  { id: 'pace', name: 'Pace', tier: 'semi-custom', base24: 265, wall24: 172, finish: 'Maple Spice' },
  { id: 'mid-america', name: 'Mid America Cabinetry', tier: 'semi-custom', base24: 255, wall24: 168, finish: 'Briarwood' },
  { id: 'starmark', name: 'Starmark', tier: 'semi-custom', base24: 369, wall24: 242, finish: 'Harbor' },
  { id: 'mastercraft', name: 'MasterCraft', tier: 'semi-custom', base24: 285, wall24: 188, finish: 'White Glaze' },
  { id: 'dynasty', name: 'Dynasty', tier: 'semi-custom', base24: 275, wall24: 182, finish: 'Cherry Spice' },
  { id: 'elmwood', name: 'Elmwood', tier: 'semi-custom', base24: 395, wall24: 258, finish: 'Recon Veneer' },
  { id: 'fabuwood-signature', name: 'Fabuwood Signature', tier: 'semi-custom', base24: 225, wall24: 148, finish: 'Illume' },
  { id: 'kountry-wood', name: 'Kountry Wood', tier: 'semi-custom', base24: 305, wall24: 198, finish: 'Alder Natural' },
  { id: 'mouser', name: 'Mouser Cabinetry', tier: 'semi-custom', base24: 315, wall24: 202, finish: 'Painted White' },
  { id: 'nebraska-furniture', name: 'NFM Cabinet Shop', tier: 'semi-custom', base24: 245, wall24: 158, finish: 'Shaker White' },
  // Custom
  { id: 'wellborn', name: 'Wellborn', tier: 'custom', base24: 419, wall24: 279, finish: 'Painted White' },
  { id: 'bellmont', name: 'Bellmont', tier: 'custom', base24: 469, wall24: 309, finish: 'Walnut Stain' },
  { id: 'wood-mode', name: 'Wood-Mode', tier: 'custom', base24: 549, wall24: 365, finish: 'Custom Paint' },
  { id: 'brookwood', name: 'Brookwood', tier: 'custom', base24: 499, wall24: 329, finish: 'Rift Oak' },
  { id: 'ultra-craft', name: 'UltraCraft', tier: 'custom', base24: 459, wall24: 305, finish: 'Autumn Hickory' },
  { id: 'canyon-creek', name: 'Canyon Creek', tier: 'custom', base24: 489, wall24: 322, finish: 'Cherry' },
  { id: 'conestoga', name: 'Conestoga Wood', tier: 'custom', base24: 439, wall24: 292, finish: 'Maple' },
  { id: 'crystal', name: 'Crystal Cabinet Works', tier: 'custom', base24: 479, wall24: 318, finish: 'Onyx' },
  { id: 'greenfield', name: 'Greenfield', tier: 'custom', base24: 509, wall24: 335, finish: 'Beech' },
  { id: 'touchstone', name: 'Touchstone', tier: 'custom', base24: 525, wall24: 348, finish: 'Wire Brushed Oak' },
  { id: 'wetherby', name: 'Wetherby', tier: 'custom', base24: 495, wall24: 328, finish: 'Paint Grade Maple' },
  { id: 'christiana', name: 'Christiana', tier: 'custom', base24: 515, wall24: 342, finish: 'Heirloom' },
  { id: 'dura-supreme', name: 'Dura Supreme', tier: 'custom', base24: 529, wall24: 352, finish: 'Luxury Gloss' },
  { id: 'grabill', name: 'Grabill Cabinetry', tier: 'custom', base24: 485, wall24: 319, finish: 'Quarter Sawn Oak' },
  { id: 'mendota', name: 'Mendota', tier: 'custom', base24: 505, wall24: 332, finish: 'Walnut' },
  { id: 'plain-fancy', name: 'Plain & Fancy', tier: 'custom', base24: 535, wall24: 358, finish: 'Heirloom Paint' },
  { id: 'showplace-evolution', name: 'Showplace Evolution', tier: 'custom', base24: 445, wall24: 295, finish: 'Wire Mesh' },
  { id: 'starmark-premier', name: 'Starmark Premier', tier: 'custom', base24: 455, wall24: 302, finish: 'Metallic Glaze' },
];

/** @type {{ id: string, name: string, material: string, pricePerSqFt: number, depthIn?: number }[]} */
const COUNTERTOP_BRANDS = [
  { id: 'formica', name: 'Formica', material: 'Laminate', pricePerSqFt: 28 },
  { id: 'wilsonart', name: 'Wilsonart', material: 'Laminate', pricePerSqFt: 30 },
  { id: 'pionite', name: 'Pionite', material: 'Laminate', pricePerSqFt: 26 },
  { id: 'nevamar', name: 'Nevamar', material: 'Laminate', pricePerSqFt: 27 },
  { id: 'arborite', name: 'Arborite', material: 'Laminate', pricePerSqFt: 29 },
  { id: 'butcher-block', name: 'John Boos (Butcher Block)', material: 'Butcher Block', pricePerSqFt: 45, depthIn: 25.5 },
  { id: 'msi', name: 'MSI', material: 'Quartz', pricePerSqFt: 48 },
  { id: 'msi-calacatta', name: 'MSI Calacatta Laza', material: 'Quartz', pricePerSqFt: 58 },
  { id: 'lg-viatera', name: 'LG Viatera', material: 'Quartz', pricePerSqFt: 58 },
  { id: 'hanstone', name: 'Hanstone', material: 'Quartz', pricePerSqFt: 62 },
  { id: 'caesarstone', name: 'Caesarstone', material: 'Quartz', pricePerSqFt: 68 },
  { id: 'silestone', name: 'Silestone', material: 'Quartz', pricePerSqFt: 74 },
  { id: 'cambria', name: 'Cambria', material: 'Quartz', pricePerSqFt: 88 },
  { id: 'corian', name: 'Corian', material: 'Solid Surface', pricePerSqFt: 52 },
  { id: 'hi-macs', name: 'Hi-Macs', material: 'Solid Surface', pricePerSqFt: 55 },
  { id: 'staron', name: 'Staron', material: 'Solid Surface', pricePerSqFt: 50 },
  { id: 'granite-level1', name: 'Granite Level 1', material: 'Granite', pricePerSqFt: 55 },
  { id: 'granite-level2', name: 'Granite Level 2', material: 'Granite', pricePerSqFt: 65 },
  { id: 'granite-level3', name: 'Granite Level 3', material: 'Granite', pricePerSqFt: 78 },
  { id: 'marble-carrara', name: 'Carrara Marble', material: 'Marble', pricePerSqFt: 72 },
  { id: 'marble-calacatta', name: 'Calacatta Marble', material: 'Marble', pricePerSqFt: 95 },
  { id: 'quartzite', name: 'Quartzite', material: 'Quartzite', pricePerSqFt: 82 },
  { id: 'pental', name: 'Pental Quartz', material: 'Quartz', pricePerSqFt: 64 },
  { id: 'vicostone', name: 'Vicostone', material: 'Quartz', pricePerSqFt: 60 },
  { id: 'polarstone', name: 'Polarstone', material: 'Quartz', pricePerSqFt: 56 },
  { id: 'daltile-one', name: 'Daltile ONE Quartz', material: 'Quartz', pricePerSqFt: 54 },
  { id: 'allen-roth-quartz', name: 'Allen + Roth Quartz', material: 'Quartz', pricePerSqFt: 46 },
  { id: 'hampton-bay-quartz', name: 'Hampton Bay Quartz', material: 'Quartz', pricePerSqFt: 44 },
  { id: 'samsung-radianz', name: 'Samsung Radianz', material: 'Quartz', pricePerSqFt: 59 },
  { id: 'compac', name: 'Compac Quartz', material: 'Quartz', pricePerSqFt: 57 },
  { id: 'technistone', name: 'Technistone', material: 'Quartz', pricePerSqFt: 61 },
  { id: 'belenco', name: 'Belenco', material: 'Quartz', pricePerSqFt: 63 },
  { id: 'levantina', name: 'Levantina Tech Quartz', material: 'Quartz', pricePerSqFt: 66 },
  { id: 'dekton', name: 'Dekton (Ultracompact)', material: 'Porcelain', pricePerSqFt: 85 },
  { id: 'neolith', name: 'Neolith', material: 'Porcelain', pricePerSqFt: 80 },
  { id: 'lapitec', name: 'Lapitec', material: 'Porcelain', pricePerSqFt: 78 },
  { id: 'concrete', name: 'Concrete (Local Fabricator)', material: 'Concrete', pricePerSqFt: 70 },
  { id: 'stainless', name: 'Stainless Steel', material: 'Stainless', pricePerSqFt: 90 },
  { id: 'recycled-glass', name: 'IceStone Recycled Glass', material: 'Recycled Glass', pricePerSqFt: 75 },
  { id: 'menards-laminate', name: 'Menards Laminate', material: 'Laminate', pricePerSqFt: 24 },
  { id: 'menards-butcher-block', name: 'Menards Butcher Block', material: 'Butcher Block', pricePerSqFt: 42, depthIn: 25.5 },
  { id: 'menards-quartz', name: 'Menards Quartz', material: 'Quartz', pricePerSqFt: 52 },
  { id: 'menards-granite', name: 'Menards Granite', material: 'Granite', pricePerSqFt: 58 },
];

/** @type {{ id: string, name: string, base36: number, finish: string }[]} */
const VANITY_BRANDS = [
  { id: 'ikea', name: 'IKEA', base36: 249, finish: 'GODMORGON White' },
  { id: 'glacier-bay', name: 'Glacier Bay', base36: 299, finish: 'White' },
  { id: 'allen-roth', name: 'Allen + Roth', base36: 379, finish: 'Gray Ash' },
  { id: 'home-decorators', name: 'Home Decorators Collection', base36: 419, finish: 'White' },
  { id: 'design-house', name: 'Design House', base36: 329, finish: 'White' },
  { id: 'wyndham', name: 'Wyndham Collection', base36: 549, finish: 'White Carrara Top' },
  { id: 'avanity', name: 'Avanity', base36: 489, finish: 'Gray' },
  { id: 'virtu-usa', name: 'Virtu USA', base36: 529, finish: 'Espresso' },
  { id: 'ove-decors', name: 'Ove Decors', base36: 599, finish: 'Gloss White' },
  { id: 'bathroom-anywhere', name: 'Bathroom Anywhere', base36: 359, finish: 'White' },
  { id: 'american-standard', name: 'American Standard', base36: 479, finish: 'White' },
  { id: 'swan', name: 'Swan', base36: 429, finish: 'White' },
  { id: 'sterling', name: 'Sterling by Kohler', base36: 449, finish: 'White' },
  { id: 'kohler', name: 'Kohler', base36: 899, finish: 'Exhibit White' },
  { id: 'kohler-versailles', name: 'Kohler Versailles', base36: 1099, finish: 'Anvil' },
  { id: 'delta', name: 'Delta', base36: 399, finish: 'White' },
  { id: 'moen', name: 'Moen', base36: 459, finish: 'Slate' },
  { id: 'bertch', name: 'Bertch', base36: 629, finish: 'Charcoal Shaker' },
  { id: 'james-martin', name: 'James Martin', base36: 729, finish: 'Brushed Nickel' },
  { id: 'robern', name: 'Robern', base36: 849, finish: 'Uplift Medicine' },
  { id: 'ronbow', name: 'Ronbow', base36: 679, finish: 'Colonial White' },
  { id: 'foremost', name: 'Foremost', base36: 389, finish: 'White' },
  { id: 'empire', name: 'Empire', base36: 409, finish: 'White' },
  { id: 'studiob', name: 'StudioB', base36: 369, finish: 'Matte White' },
  { id: 'cutler-kitchen', name: 'Cutler Kitchen & Bath', base36: 559, finish: 'Shale Gray' },
  { id: 'diamond-vanity', name: 'Diamond Vanity', base36: 499, finish: 'Espresso' },
  { id: 'merillat-bath', name: 'Merillat Bath', base36: 589, finish: 'Classic White' },
  { id: 'kraftmaid-bath', name: 'KraftMaid Bath', base36: 649, finish: 'Cherry' },
  { id: 'wellborn-bath', name: 'Wellborn Bath', base36: 699, finish: 'Antique White' },
  { id: 'bellmont-bath', name: 'Bellmont Bath', base36: 749, finish: 'Walnut' },
  { id: 'woodcrafters', name: 'WoodCrafters', base36: 519, finish: 'White' },
  { id: 'sagehill', name: 'Sagehill Designs', base36: 579, finish: 'Blue' },
  { id: 'native-trails', name: 'Native Trails', base36: 799, finish: 'Copper' },
  { id: 'fox-hollow', name: 'Fox Hollow Furnishings', base36: 459, finish: 'Rustic Gray' },
  { id: 'bath-kitchen', name: 'Bath Kitchen & Beyond', base36: 419, finish: 'White' },
  { id: 'luxe', name: 'Luxe by Golden', base36: 649, finish: 'Gray Oak' },
  { id: 'duravit', name: 'Duravit', base36: 949, finish: 'Modern White' },
  { id: 'villeroy-boch', name: 'Villeroy & Boch', base36: 899, finish: 'Subway White' },
  { id: 'cardell-bath-menards', name: 'Cardell Bath (Menards)', base36: 449, finish: 'Lakeridge White' },
  { id: 'medallion-bath-menards', name: 'Medallion Bath (Menards)', base36: 529, finish: 'Silverline White' },
  { id: 'tuscany-palermo-menards', name: 'Tuscany Palermo (Menards)', base36: 399, finish: 'Caldwell Green' },
  { id: 'klearvue-bath-menards', name: 'Klearvue Bath (Menards)', base36: 329, finish: 'Visby White' },
];

/** Material-only toilets — specs from manufacturer rough-in; prices from HD/Menards-class retail May 2026. */
const TOILET_PRODUCTS = [
  { id: 'glacier-bay-round', brand: 'Glacier Bay', name: 'Round Front 2-Piece (Seat Incl.)', subcategory: 'two-piece', widthIn: 16.5, depthIn: 26.5, heightIn: 28.5, listPrice: 99 },
  { id: 'project-source-elongated', brand: 'Project Source', name: 'Elongated 2-Piece', subcategory: 'two-piece', widthIn: 17, depthIn: 28, heightIn: 29.5, listPrice: 109 },
  { id: 'american-standard-cadet', brand: 'American Standard', name: 'Cadet 3 FloWise Elongated', subcategory: 'two-piece', widthIn: 17.5, depthIn: 28.5, heightIn: 30.5, listPrice: 219 },
  { id: 'american-standard-champion', brand: 'American Standard', name: 'Champion 4 Max Elongated', subcategory: 'two-piece', widthIn: 17.5, depthIn: 29, heightIn: 31, listPrice: 279 },
  { id: 'kohler-cimarron', brand: 'Kohler', name: 'Cimarron Elongated (Seat Incl.)', subcategory: 'two-piece', widthIn: 18, depthIn: 28.5, heightIn: 30.5, listPrice: 229 },
  { id: 'kohler-highline', brand: 'Kohler', name: 'Highline Arc Elongated', subcategory: 'two-piece', widthIn: 18, depthIn: 29, heightIn: 31, listPrice: 289 },
  { id: 'delta-foundations', brand: 'Delta', name: 'Foundations 2-Piece Elongated', subcategory: 'two-piece', widthIn: 17, depthIn: 27.5, heightIn: 29.5, listPrice: 149 },
  { id: 'toto-drake', brand: 'TOTO', name: 'Drake Eco UltraMax Elongated', subcategory: 'two-piece', widthIn: 18, depthIn: 28.5, heightIn: 30.5, listPrice: 399 },
  { id: 'swiss-madison-stealth', brand: 'Swiss Madison', name: 'Stealth Dual Flush One-Piece', subcategory: 'one-piece', widthIn: 17, depthIn: 27, heightIn: 29.5, listPrice: 269 },
  { id: 'woodbridge-dual', brand: 'Woodbridge', name: 'Dual Flush One-Piece Elongated', subcategory: 'one-piece', widthIn: 18, depthIn: 28, heightIn: 30.5, listPrice: 329 },
  { id: 'menards-comfort-elongated', brand: 'Menards Essentials', name: 'Comfort Height Elongated 2-Piece', subcategory: 'two-piece', widthIn: 18, depthIn: 29, heightIn: 30.5, listPrice: 139 },
];

/** Tubs / showers — Menards PDP dimensions where noted; material-only pricing. */
const SHOWER_PRODUCTS = [
  { id: 'alcove-tub-60', brand: 'Sterling by Kohler', name: 'Ensemble Bathtub 60×30×16', subcategory: 'tub', widthIn: 60, depthIn: 30, heightIn: 16, listPrice: 289 },
  { id: 'alcove-tub-72', brand: 'Sterling by Kohler', name: 'Ensemble Bathtub 72×32×16', subcategory: 'tub', widthIn: 72, depthIn: 32, heightIn: 16, listPrice: 429 },
  {
    id: 'tub-shower-combo-60',
    brand: 'Sterling by Kohler',
    name: 'Ensemble Medley 60×32×75 (4-Piece)',
    subcategory: 'combo',
    widthIn: 60,
    depthIn: 32,
    heightIn: 75,
    listPrice: 967,
  },
  { id: 'fiberglass-shower-36', brand: 'Sterling by Kohler', name: 'Ensemble Curve Shower 36×34×75', subcategory: 'combo', widthIn: 36, depthIn: 34, heightIn: 75, listPrice: 749 },
  { id: 'freestanding-tub-67', brand: 'Wyndham Collection', name: 'Freestanding Tub 67×32×24', subcategory: 'tub', widthIn: 67, depthIn: 32, heightIn: 24, listPrice: 1249 },
  { id: 'corner-tub-60', brand: 'Aquatic', name: 'Corner Tub 60×60×20', subcategory: 'tub', widthIn: 60, depthIn: 60, heightIn: 20, listPrice: 949 },
  { id: 'walk-in-tile-36', brand: 'Tile Materials (Est.)', name: 'Walk-In Tile Shower 36×36 Materials', subcategory: 'walk-in', widthIn: 36, depthIn: 36, heightIn: 84, listPrice: 1950 },
  { id: 'walk-in-tile-48', brand: 'Tile Materials (Est.)', name: 'Walk-In Tile Shower 48×36 Materials', subcategory: 'walk-in', widthIn: 48, depthIn: 36, heightIn: 84, listPrice: 2350 },
  { id: 'walk-in-tile-60', brand: 'Tile Materials (Est.)', name: 'Walk-In Tile Shower 60×36 Materials', subcategory: 'walk-in', widthIn: 60, depthIn: 36, heightIn: 84, listPrice: 2750 },
  { id: 'walk-in-curbless-60', brand: 'Tile Materials (Est.)', name: 'Curbless Walk-In 60×42 Materials', subcategory: 'walk-in', widthIn: 60, depthIn: 42, heightIn: 84, listPrice: 3350 },
  { id: 'shower-base-36', brand: 'Tile Redi', name: 'Redi Base Shower Pan 36×36', subcategory: 'base', widthIn: 36, depthIn: 36, heightIn: 6, listPrice: 459 },
  { id: 'shower-base-48', brand: 'Tile Redi', name: 'Redi Base Shower Pan 48×34', subcategory: 'base', widthIn: 48, depthIn: 34, heightIn: 6, listPrice: 529 },
  { id: 'glass-enclosure-60', brand: 'DreamLine', name: 'Quattro 60" Sliding Door', subcategory: 'enclosure', widthIn: 60, depthIn: 34, heightIn: 72, listPrice: 899 },
  { id: 'menards-tub-60', brand: 'Swan', name: 'Veritek Bathtub 60×30×16', subcategory: 'tub', widthIn: 60, depthIn: 30, heightIn: 16, listPrice: 249 },
];

/** Scale from a calibrated 24" reference; narrow cabinets use ~70% floor vs pure linear. */
function scalePrice(base24, widthIn) {
  const ratio = widthIn / 24;
  const scale = widthIn >= 24 ? ratio : 0.68 + 0.32 * ratio;
  const wideDiscount = widthIn >= 36 ? 0.9 : widthIn >= 30 ? 0.95 : 1;
  return Math.round(base24 * scale * wideDiscount);
}

function counterPrice(pricePerSqFt, widthIn, depthIn = 25.5) {
  const sqFt = (widthIn * depthIn) / 144;
  return Math.max(89, Math.round(sqFt * pricePerSqFt));
}

function vanityPrice(base36, widthIn) {
  const isDouble = widthIn >= 60;
  const scale = scalePrice(base36, widthIn);
  return scale + (isDouble ? 150 : 0) + (widthIn === 18 ? -80 : 0);
}

function pushItem(items, item) {
  items.push(item);
}

const items = [];

for (const brand of CABINET_BRANDS) {
  const baseDepth = brand.baseDepthIn ?? 24;
  const wallDepth = brand.wallDepthIn ?? 12;
  const baseHeight = brand.baseHeightIn ?? 34.5;
  const wallHeight = brand.wallHeightIn ?? 30;
  const cornerDepth = Math.max(baseDepth, 24);
  const baseWidths = [...BASE_WIDTHS, ...(brand.extraBaseWidths ?? [])];
  const wallWidths = [...WALL_WIDTHS, ...(brand.extraWallWidths ?? [])];
  const isMenardsCalibrated =
    brand.id.includes('menards') ||
    brand.id.startsWith('klearvue') ||
    brand.id === 'caldwell' ||
    brand.id === 'lakeridge-cardell' ||
    brand.id === 'rockney-cardell';

  for (const w of baseWidths) {
    pushItem(items, {
      itemId: `base-${brand.id}-${w}`,
      category: 'cabinet',
      subcategory: 'base',
      brand: brand.name,
      brandId: brand.id,
      brandTier: brand.tier,
      name: `${brand.name} Base ${w}"`,
      widthIn: w,
      depthIn: baseDepth,
      heightIn: baseHeight,
      listPrice: scalePrice(brand.base24, w),
      material: brand.finish,
      ...(isMenardsCalibrated ? { priceSource: PRICE_SOURCE, priceUpdatedAt: PRICE_CALIBRATED_AT } : {}),
    });
  }
  pushItem(items, {
    itemId: `base-${brand.id}-corner`,
    category: 'cabinet',
    subcategory: 'base',
    brand: brand.name,
    brandId: brand.id,
    brandTier: brand.tier,
    name: `${brand.name} Base Corner 36"`,
    widthIn: 36,
    depthIn: cornerDepth,
    heightIn: baseHeight,
    listPrice: Math.round(brand.base24 * 1.7),
    material: brand.finish,
    ...(isMenardsCalibrated ? { priceSource: PRICE_SOURCE, priceUpdatedAt: PRICE_CALIBRATED_AT } : {}),
  });
  pushItem(items, {
    itemId: `base-${brand.id}-sink-36`,
    category: 'cabinet',
    subcategory: 'base',
    brand: brand.name,
    brandId: brand.id,
    brandTier: brand.tier,
    name: `${brand.name} Sink Base 36"`,
    widthIn: 36,
    depthIn: baseDepth,
    heightIn: baseHeight,
    listPrice: Math.round(brand.base24 * 1.45),
    material: brand.finish,
    ...(isMenardsCalibrated ? { priceSource: PRICE_SOURCE, priceUpdatedAt: PRICE_CALIBRATED_AT } : {}),
  });
  pushItem(items, {
    itemId: `base-${brand.id}-drawer-30`,
    category: 'cabinet',
    subcategory: 'base',
    brand: brand.name,
    brandId: brand.id,
    brandTier: brand.tier,
    name: `${brand.name} 3-Drawer Base 30"`,
    widthIn: 30,
    depthIn: baseDepth,
    heightIn: baseHeight,
    listPrice: Math.round(scalePrice(brand.base24, 30) * 1.25),
    material: brand.finish,
    ...(isMenardsCalibrated ? { priceSource: PRICE_SOURCE, priceUpdatedAt: PRICE_CALIBRATED_AT } : {}),
  });
  pushItem(items, {
    itemId: `base-${brand.id}-pantry-18`,
    category: 'cabinet',
    subcategory: 'base',
    brand: brand.name,
    brandId: brand.id,
    brandTier: brand.tier,
    name: `${brand.name} Pantry 18"`,
    widthIn: 18,
    depthIn: baseDepth,
    heightIn: 84,
    listPrice: Math.round(brand.base24 * 3.2),
    material: brand.finish,
    ...(isMenardsCalibrated ? { priceSource: PRICE_SOURCE, priceUpdatedAt: PRICE_CALIBRATED_AT } : {}),
  });
  for (const w of wallWidths) {
    pushItem(items, {
      itemId: `wall-${brand.id}-${w}`,
      category: 'cabinet',
      subcategory: 'wall',
      brand: brand.name,
      brandId: brand.id,
      brandTier: brand.tier,
      name: `${brand.name} Wall ${w}"`,
      widthIn: w,
      depthIn: wallDepth,
      heightIn: wallHeight,
      listPrice: scalePrice(brand.wall24, w),
      material: brand.finish,
      ...(isMenardsCalibrated ? { priceSource: PRICE_SOURCE, priceUpdatedAt: PRICE_CALIBRATED_AT } : {}),
    });
  }
  for (const w of [30, 36]) {
    if (!wallWidths.includes(w)) continue;
    pushItem(items, {
      itemId: `wall-${brand.id}-${w}-36h`,
      category: 'cabinet',
      subcategory: 'wall',
      brand: brand.name,
      brandId: brand.id,
      brandTier: brand.tier,
      name: `${brand.name} Wall ${w}" (36"H)`,
      widthIn: w,
      depthIn: wallDepth,
      heightIn: 36,
      listPrice: Math.round(scalePrice(brand.wall24, w) * 1.15),
      material: brand.finish,
      ...(isMenardsCalibrated ? { priceSource: PRICE_SOURCE, priceUpdatedAt: PRICE_CALIBRATED_AT } : {}),
    });
  }
  pushItem(items, {
    itemId: `wall-${brand.id}-microwave-30`,
    category: 'cabinet',
    subcategory: 'wall',
    brand: brand.name,
    brandId: brand.id,
    brandTier: brand.tier,
    name: `${brand.name} Microwave Wall 30"`,
    widthIn: 30,
    depthIn: Math.max(wallDepth, 15),
    heightIn: 15,
    listPrice: Math.round(scalePrice(brand.wall24, 30) * 0.85),
    material: brand.finish,
  });
}

for (const brand of COUNTERTOP_BRANDS) {
  const depth = brand.depthIn ?? 25.5;
  for (const w of COUNTER_WIDTHS) {
    pushItem(items, {
      itemId: `counter-${brand.id}-${w}`,
      category: 'countertop',
      subcategory: brand.material.toLowerCase().replace(/\s+/g, '-'),
      brand: brand.name,
      brandId: brand.id,
      name: `${brand.name} ${w}" Counter`,
      widthIn: w,
      depthIn: depth,
      heightIn: brand.material === 'Butcher Block' ? 1.5 : 1.25,
      listPrice: counterPrice(brand.pricePerSqFt, w, depth),
      material: brand.material,
    });
  }
}

for (const brand of VANITY_BRANDS) {
  for (const w of VANITY_WIDTHS) {
    const isDouble = w >= 60;
    pushItem(items, {
      itemId: `vanity-${brand.id}-${w}`,
      category: 'vanity',
      subcategory: isDouble ? 'double' : w <= 24 ? 'small' : 'single',
      brand: brand.name,
      brandId: brand.id,
      name: `${brand.name} Vanity ${w}"${isDouble ? ' Double' : ''}`,
      widthIn: w,
      depthIn: 21,
      heightIn: 34,
      listPrice: vanityPrice(brand.base36, w),
      material: brand.finish,
    });
  }
}

for (const t of TOILET_PRODUCTS) {
  pushItem(items, {
    itemId: `toilet-${t.id}`,
    category: 'toilet',
    subcategory: t.subcategory,
    brand: t.brand,
    brandId: t.id,
    name: `${t.brand} ${t.name}`,
    widthIn: t.widthIn,
    depthIn: t.depthIn,
    heightIn: t.heightIn,
    listPrice: t.listPrice,
    material: t.subcategory === 'one-piece' ? 'Vitreous China' : 'Porcelain',
    priceSource: PRICE_SOURCE,
    priceUpdatedAt: PRICE_CALIBRATED_AT,
  });
}

for (const s of SHOWER_PRODUCTS) {
  pushItem(items, {
    itemId: `shower-${s.id}`,
    category: 'shower',
    subcategory: s.subcategory,
    brand: s.brand,
    brandId: s.id,
    name: s.name,
    widthIn: s.widthIn,
    depthIn: s.depthIn,
    heightIn: s.heightIn,
    listPrice: s.listPrice,
    material:
      s.subcategory === 'walk-in'
        ? 'Tile + pan + trim (materials only)'
        : s.subcategory === 'enclosure'
          ? 'Tempered glass'
          : 'Vikrell / acrylic',
    priceSource: PRICE_SOURCE,
    priceUpdatedAt: PRICE_CALIBRATED_AT,
  });
}

const catalog = {
  version: '2.0.0',
  generatedAt: new Date().toISOString(),
  priceDisclaimer:
    'Material-only list prices. Menards lines + bath fixtures calibrated 2026-05-19 from retailer/manufacturer data; other brands scaled from reference SKUs. Store promos and install not included. Future: API priceSource overrides via S3.',
  priceCalibratedAt: PRICE_CALIBRATED_AT,
  stats: {
    cabinetBrands: CABINET_BRANDS.length,
    countertopBrands: COUNTERTOP_BRANDS.length,
    vanityBrands: VANITY_BRANDS.length,
    toiletSkus: TOILET_PRODUCTS.length,
    showerSkus: SHOWER_PRODUCTS.length,
    totalSkus: items.length,
  },
  brands: {
    cabinets: CABINET_BRANDS.map((b) => ({
      id: b.id,
      name: b.name,
      tier: b.tier,
      referencePrice24Base: b.base24,
      referencePrice24Wall: b.wall24,
    })),
    countertops: COUNTERTOP_BRANDS.map((b) => ({
      id: b.id,
      name: b.name,
      material: b.material,
      pricePerSqFt: b.pricePerSqFt,
    })),
    vanities: VANITY_BRANDS.map((b) => ({
      id: b.id,
      name: b.name,
      referencePrice36: b.base36,
    })),
    toilets: TOILET_PRODUCTS.map((t) => ({
      id: t.id,
      name: t.brand,
    })),
    showers: SHOWER_PRODUCTS.map((s) => ({
      id: s.id,
      name: s.brand,
    })),
  },
  items,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(catalog, null, 2));
console.log(
  `Wrote ${items.length} SKUs (${CABINET_BRANDS.length} cabinet + ${COUNTERTOP_BRANDS.length} counter + ${VANITY_BRANDS.length} vanity + ${TOILET_PRODUCTS.length} toilet + ${SHOWER_PRODUCTS.length} shower)`,
);
