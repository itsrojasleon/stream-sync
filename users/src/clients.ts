import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { SQSClient } from '@aws-sdk/client-sqs';
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

export const s3 = new S3Client({
  ...(process.env.NODE_ENV === 'dev' && {
    forcePathStyle: true,
    endpoint: 'http://localhost:4569',
    region: 'us-east-1',
    credentials: {
      accessKeyId: 'S3RVER',
      secretAccessKey: 'S3RVER'
    }
  })
});

export const sqs = new SQSClient({});
