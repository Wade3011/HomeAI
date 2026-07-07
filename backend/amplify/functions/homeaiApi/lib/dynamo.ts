import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const tables = {
  projects: () => requiredEnv('TABLE_PROJECTS'),
  rooms: () => requiredEnv('TABLE_ROOMS'),
  placements: () => requiredEnv('TABLE_PLACEMENTS'),
  catalog: () => requiredEnv('TABLE_CATALOG'),
  estimateCache: () => requiredEnv('TABLE_ESTIMATE_CACHE'),
  userProfiles: () => requiredEnv('TABLE_USER_PROFILES'),
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

export async function getItem<T>(table: string, key: Record<string, string>) {
  const result = await client.send(new GetCommand({ TableName: table, Key: key }));
  return (result.Item as T | undefined) ?? null;
}

export async function putItem(table: string, item: Record<string, unknown>) {
  await client.send(new PutCommand({ TableName: table, Item: item }));
}

export async function deleteItem(table: string, key: Record<string, string>) {
  await client.send(new DeleteCommand({ TableName: table, Key: key }));
}

export async function queryByGsi<T>(
  table: string,
  indexName: string,
  keyName: string,
  keyValue: string,
) {
  const result = await client.send(
    new QueryCommand({
      TableName: table,
      IndexName: indexName,
      KeyConditionExpression: '#k = :v',
      ExpressionAttributeNames: { '#k': keyName },
      ExpressionAttributeValues: { ':v': keyValue },
    }),
  );
  return (result.Items as T[] | undefined) ?? [];
}

export async function scanTable<T>(table: string, limit = 200) {
  const result = await client.send(new ScanCommand({ TableName: table, Limit: limit }));
  return (result.Items as T[] | undefined) ?? [];
}

export async function batchDeleteByKeys(table: string, keys: Record<string, string>[]) {
  if (keys.length === 0) return;
  const chunks = [];
  for (let i = 0; i < keys.length; i += 25) {
    chunks.push(keys.slice(i, i + 25));
  }
  for (const chunk of chunks) {
    await client.send(
      new BatchWriteCommand({
        RequestItems: {
          [table]: chunk.map((Key) => ({ DeleteRequest: { Key } })),
        },
      }),
    );
  }
}

export { client };
