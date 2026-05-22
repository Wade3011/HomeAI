import { defineBackend } from '@aws-amplify/backend';
import {
  AuthorizationType,
  CognitoUserPoolsAuthorizer,
  Cors,
  LambdaIntegration,
  RestApi,
} from 'aws-cdk-lib/aws-apigateway';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { auth } from './auth/resource';
import { homeaiApi } from './functions/homeaiApi/resource';

const backend = defineBackend({ auth, homeaiApi });

const dataStack = backend.createStack('data-stack');

const userProfilesTable = new Table(dataStack, 'UserProfiles', {
  partitionKey: { name: 'userId', type: AttributeType.STRING },
  billingMode: BillingMode.PAY_PER_REQUEST,
});

const projectsTable = new Table(dataStack, 'Projects', {
  partitionKey: { name: 'projectId', type: AttributeType.STRING },
  billingMode: BillingMode.PAY_PER_REQUEST,
});
projectsTable.addGlobalSecondaryIndex({
  indexName: 'byOwner',
  partitionKey: { name: 'ownerUserId', type: AttributeType.STRING },
  sortKey: { name: 'createdAt', type: AttributeType.STRING },
});

const roomsTable = new Table(dataStack, 'Rooms', {
  partitionKey: { name: 'roomId', type: AttributeType.STRING },
  billingMode: BillingMode.PAY_PER_REQUEST,
});
roomsTable.addGlobalSecondaryIndex({
  indexName: 'byProject',
  partitionKey: { name: 'projectId', type: AttributeType.STRING },
});

const placementsTable = new Table(dataStack, 'Placements', {
  partitionKey: { name: 'placementId', type: AttributeType.STRING },
  billingMode: BillingMode.PAY_PER_REQUEST,
});
placementsTable.addGlobalSecondaryIndex({
  indexName: 'byRoom',
  partitionKey: { name: 'roomId', type: AttributeType.STRING },
});

const catalogTable = new Table(dataStack, 'CatalogItems', {
  partitionKey: { name: 'itemId', type: AttributeType.STRING },
  billingMode: BillingMode.PAY_PER_REQUEST,
});

const estimateCacheTable = new Table(dataStack, 'EstimateCache', {
  partitionKey: { name: 'cacheKey', type: AttributeType.STRING },
  billingMode: BillingMode.PAY_PER_REQUEST,
  timeToLiveAttribute: 'ttl',
});

const lambda = backend.homeaiApi.resources.lambda;
[
  projectsTable,
  roomsTable,
  placementsTable,
  catalogTable,
  estimateCacheTable,
  userProfilesTable,
].forEach((table) => table.grantReadWriteData(lambda));

lambda.addEnvironment('TABLE_PROJECTS', projectsTable.tableName);
lambda.addEnvironment('TABLE_ROOMS', roomsTable.tableName);
lambda.addEnvironment('TABLE_PLACEMENTS', placementsTable.tableName);
lambda.addEnvironment('TABLE_CATALOG', catalogTable.tableName);
lambda.addEnvironment('TABLE_ESTIMATE_CACHE', estimateCacheTable.tableName);
lambda.addEnvironment('TABLE_USER_PROFILES', userProfilesTable.tableName);

const apiStack = backend.createStack('api-stack');
const userPool = backend.auth.resources.userPool;

const restApi = new RestApi(apiStack, 'HomeaiRestApi', {
  restApiName: 'homeai-api',
  deploy: true,
  deployOptions: { stageName: 'api' },
  defaultCorsPreflightOptions: {
    allowOrigins: Cors.ALL_ORIGINS,
    allowMethods: Cors.ALL_METHODS,
    allowHeaders: Cors.DEFAULT_HEADERS,
  },
});

const authorizer = new CognitoUserPoolsAuthorizer(apiStack, 'HomeaiAuthorizer', {
  cognitoUserPools: [userPool],
});

const integration = new LambdaIntegration(lambda);
const authOptions = {
  authorizationType: AuthorizationType.COGNITO,
  authorizer,
};

function addRoute(resourcePath: string, methods: string[]) {
  const segments = resourcePath.split('/').filter(Boolean);
  let resource = restApi.root;
  for (const segment of segments) {
    const existing = resource.getResource(segment);
    resource = existing ?? resource.addResource(segment);
  }
  for (const method of methods) {
    resource.addMethod(method, integration, authOptions);
  }
}

addRoute('catalog', ['GET']);
addRoute('catalog/{itemId}', ['GET']);
addRoute('projects', ['GET', 'POST']);
addRoute('projects/{projectId}', ['GET', 'PUT', 'DELETE']);
addRoute('projects/{projectId}/rooms', ['GET', 'POST']);
addRoute('rooms/{roomId}', ['GET', 'PUT', 'DELETE']);
addRoute('rooms/{roomId}/placements', ['GET', 'PUT']);
addRoute('pricing/estimate', ['POST']);
addRoute('pricing/estimate-room', ['POST']);

backend.addOutput({
  custom: {
    API: {
      endpoint: restApi.url,
      region: apiStack.region,
      restApiId: restApi.restApiId,
    },
  },
});
