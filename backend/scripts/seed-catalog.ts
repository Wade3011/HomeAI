import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const tableName = process.env.TABLE_CATALOG ?? process.argv[2];
if (!tableName) {
  console.error('Usage: TABLE_CATALOG=<name> npm run seed:catalog');
  process.exit(1);
}

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const catalogItems = [
  {
    itemId: 'cab-base-24',
    category: 'cabinet',
    subcategory: 'base',
    name: 'Base Cabinet 24"',
    widthIn: 24,
    depthIn: 24,
    heightIn: 34.5,
    listPrice: 189,
    material: 'Shaker White',
  },
  {
    itemId: 'cab-base-30',
    category: 'cabinet',
    subcategory: 'base',
    name: 'Base Cabinet 30"',
    widthIn: 30,
    depthIn: 24,
    heightIn: 34.5,
    listPrice: 219,
    material: 'Shaker White',
  },
  {
    itemId: 'cab-base-36',
    category: 'cabinet',
    subcategory: 'base',
    name: 'Base Cabinet 36"',
    widthIn: 36,
    depthIn: 24,
    heightIn: 34.5,
    listPrice: 249,
    material: 'Shaker White',
  },
  {
    itemId: 'cab-base-corner',
    category: 'cabinet',
    subcategory: 'base',
    name: 'Base Corner Cabinet',
    widthIn: 36,
    depthIn: 36,
    heightIn: 34.5,
    listPrice: 329,
    material: 'Shaker White',
  },
  {
    itemId: 'cab-wall-24',
    category: 'cabinet',
    subcategory: 'wall',
    name: 'Wall Cabinet 24"',
    widthIn: 24,
    depthIn: 12,
    heightIn: 30,
    listPrice: 139,
    material: 'Shaker White',
  },
  {
    itemId: 'cab-wall-30',
    category: 'cabinet',
    subcategory: 'wall',
    name: 'Wall Cabinet 30"',
    widthIn: 30,
    depthIn: 12,
    heightIn: 30,
    listPrice: 159,
    material: 'Shaker White',
  },
  {
    itemId: 'cab-wall-36',
    category: 'cabinet',
    subcategory: 'wall',
    name: 'Wall Cabinet 36"',
    widthIn: 36,
    depthIn: 12,
    heightIn: 30,
    listPrice: 179,
    material: 'Shaker White',
  },
  {
    itemId: 'counter-96',
    category: 'countertop',
    subcategory: 'quartz',
    name: 'Quartz Counter 96"',
    widthIn: 96,
    depthIn: 25.5,
    heightIn: 1.25,
    listPrice: 1299,
    material: 'Quartz',
  },
  {
    itemId: 'vanity-36',
    category: 'vanity',
    subcategory: 'bath',
    name: 'Bath Vanity 36"',
    widthIn: 36,
    depthIn: 21,
    heightIn: 34,
    listPrice: 449,
    material: 'Espresso',
  },
  {
    itemId: 'vanity-48',
    category: 'vanity',
    subcategory: 'bath',
    name: 'Bath Vanity 48"',
    widthIn: 48,
    depthIn: 21,
    heightIn: 34,
    listPrice: 549,
    material: 'Espresso',
  },
];

async function main() {
  for (const item of catalogItems) {
    await client.send(new PutCommand({ TableName: tableName, Item: item }));
    console.log('Seeded', item.itemId);
  }
  console.log(`Done. ${catalogItems.length} items in ${tableName}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
