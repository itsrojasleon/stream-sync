import {
  batcherTransform,
  dynamoInserterTransform,
  generateUserStream,
  handleUnprocessedItemsTransform
} from '@/utils';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { pipeline } from 'stream/promises';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    if (!process.env.USER_TABLE_NAME) {
      throw new Error('USER_TABLE_NAME is not defined');
    }
    if (!process.env.UNPROCESSED_USERS_QUEUE_URL) {
      throw new Error('UNPROCESSED_USERS_QUEUE_URL is not defined');
    }

    const body = JSON.parse(event.body || '{}');

    const totalUsers = body.totalUsers || 1000;
    const batchSize = 25;
    const maxRetries = 3;

    await pipeline(
      generateUserStream(totalUsers),
      batcherTransform(batchSize),
      dynamoInserterTransform(process.env.USER_TABLE_NAME, maxRetries),
      handleUnprocessedItemsTransform(process.env.UNPROCESSED_USERS_QUEUE_URL)
    );

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: 'Bulk user creation went well'
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    };
  } catch (err: any) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: err.message })
    };
  }
};
