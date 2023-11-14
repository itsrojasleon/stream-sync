import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const oldDynamo = new DynamoDBClient({});

export const dynamo = DynamoDBDocumentClient.from(oldDynamo, {
  marshallOptions: {
    removeUndefinedValues: true
  }
});

export const secretsManager = new SecretsManagerClient({});
