import {
  batcherTransform,
  dynamoInserterTransform,
  generateUserStream
} from '@/utils';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { pipeline } from 'stream/promises';

export const handler: APIGatewayProxyHandlerV2 = async () => {
  try {
    if (!process.env.USER_TABLE_NAME) {
      throw new Error('USER_TABLE_NAME is not defined');
    }

    try {
      await pipeline(
        generateUserStream(),
        batcherTransform(25),
        dynamoInserterTransform(process.env.USER_TABLE_NAME)
      );
    } catch (err: any) {
      if (err.message === 'Unprocessed items') {
        // TODO: Handle unprocessed items.
        // A really cool idea would be to send them to a sqs queue.
        console.log('Unprocessed items', JSON.stringify(err));
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Bulk user creation went well'
      })
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: err.message })
    };
  }
};
