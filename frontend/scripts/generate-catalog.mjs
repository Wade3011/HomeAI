/**
 * Generates frontend/src/data/catalog.json
 * Run: npm run generate:catalog  (or node scripts/generate-catalog.mjs)
 * Prices ≈ 2024–2025 US retail list averages for planning (not installed quotes).
 */

import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../src/data/catalog.json');

const BASE_WIDTHS = [9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42];
const WALL_WIDTHS = [9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 42];
const COUNTER_WIDTHS = [25, 30, 36, 42, 48, 60, 72, 84, 96, 108, 120];
const VANITY_WIDTHS = [18, 24, 30, 36, 42, 48, 60, 72];

/** @type {{ id: string, name: string, tier: string, base24: number, wall24: number, finish: string }[]} */
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
  // Semi-custom
  { id: 'schuler-menards', name: 'Schuler (Menards)', tier: 'semi-custom', base24: 239, wall24: 159, finish: 'Maple Shaker' },
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
  { id: 'ultra-style', name: 'Ultrastyle', tier: 'semi-custom', base24: 299, wall24: 195, finish: 'Stone Gray' },
  { id: 'waypoint', name: 'Waypoint Living Spaces', tier: 'semi-custom', base24: 309, wall24: 199, finish: 'Mocha Glaze' },
  { id: 'mid-continent', name: 'Mid Continent', tier: 'semi-custom', base24: 289, wall24: 185, finish: 'Hickory Natural' },
  { id: 'kemper', name: 'Kemper', tier: 'semi-custom', base24: 319, wall24: 205, finish: 'Cinnamon' },
  { id: 'showplace', name: 'Showplace', tier: 'semi-custom', base24: 349, wall24: 228, finish: 'Evergreen' },
  { id: 'cardell', name: 'Cardell', tier: 'semi-custom', base24: 299, wall24: 192, finish: 'Sandstone' },
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
];

function scalePrice(base24, widthIn) {
  const lf = widthIn / 12;
  const effectiveLf = Math.max(lf, 1.5);
  const scale = effectiveLf / 2;
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
  for (const w of BASE_WIDTHS) {
    pushItem(items, {
      itemId: `base-${brand.id}-${w}`,
      category: 'cabinet',
      subcategory: 'base',
      brand: brand.name,
      brandId: brand.id,
      brandTier: brand.tier,
      name: `${brand.name} Base ${w}"`,
      widthIn: w,
      depthIn: 24,
      heightIn: 34.5,
      listPrice: scalePrice(brand.base24, w),
      material: brand.finish,
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
    depthIn: 36,
    heightIn: 34.5,
    listPrice: Math.round(brand.base24 * 1.7),
    material: brand.finish,
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
    depthIn: 24,
    heightIn: 34.5,
    listPrice: Math.round(brand.base24 * 1.45),
    material: brand.finish,
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
    depthIn: 24,
    heightIn: 34.5,
    listPrice: Math.round(scalePrice(brand.base24, 30) * 1.25),
    material: brand.finish,
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
    depthIn: 24,
    heightIn: 84,
    listPrice: Math.round(brand.base24 * 3.2),
    material: brand.finish,
  });
  for (const w of WALL_WIDTHS) {
    pushItem(items, {
      itemId: `wall-${brand.id}-${w}`,
      category: 'cabinet',
      subcategory: 'wall',
      brand: brand.name,
      brandId: brand.id,
      brandTier: brand.tier,
      name: `${brand.name} Wall ${w}"`,
      widthIn: w,
      depthIn: 12,
      heightIn: 30,
      listPrice: scalePrice(brand.wall24, w),
      material: brand.finish,
    });
  }
  for (const w of [30, 36]) {
    pushItem(items, {
      itemId: `wall-${brand.id}-${w}-36h`,
      category: 'cabinet',
      subcategory: 'wall',
      brand: brand.name,
      brandId: brand.id,
      brandTier: brand.tier,
      name: `${brand.name} Wall ${w}" (36"H)`,
      widthIn: w,
      depthIn: 12,
      heightIn: 36,
      listPrice: Math.round(scalePrice(brand.wall24, w) * 1.15),
      material: brand.finish,
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
    depthIn: 15,
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

const catalog = {
  version: '2.0.0',
  generatedAt: new Date().toISOString(),
  priceDisclaimer:
    'Approximate 2024–2026 US list/material prices for planning estimates only. Installed, regional, and promotional pricing varies. Not affiliated with listed manufacturers. Future distribution: AWS S3.',
  stats: {
    cabinetBrands: CABINET_BRANDS.length,
    countertopBrands: COUNTERTOP_BRANDS.length,
    vanityBrands: VANITY_BRANDS.length,
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
  },
  items,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(catalog, null, 2));
console.log(
  `Wrote ${items.length} SKUs (${CABINET_BRANDS.length} cabinet + ${COUNTERTOP_BRANDS.length} counter + ${VANITY_BRANDS.length} vanity brands)`,
);
