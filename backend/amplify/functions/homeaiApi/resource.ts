import { defineFunction } from '@aws-amplify/backend';

export const homeaiApi = defineFunction({
  name: 'homeai-api',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 512,
});
