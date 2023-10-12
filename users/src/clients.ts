import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const oldDynamo = new DynamoDBClient({
  ...(process.env.NODE_ENV === 'dev' && {
    region: 'localhost',
    endpoint: 'http://localhost:8000',
    credentials: {
      accessKeyId: 'accessKeyId',
      secretAccessKey: 'secretAccessKey'
    }
  })
});

export const dynamo = DynamoDBDocumentClient.from(oldDynamo, {
  marshallOptions: {
    removeUndefinedValues: true
  }
});
