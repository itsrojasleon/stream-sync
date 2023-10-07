import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const oldDynamo = new DynamoDBClient({});

export const dynamo = DynamoDBDocumentClient.from(oldDynamo, {
  marshallOptions: {
    removeUndefinedValues: true
  }
});
