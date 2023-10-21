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

    const totalUsers = 1000;
    const batchSize = 25;

    try {
      await pipeline(
        generateUserStream(totalUsers),
        batcherTransform(batchSize),
        dynamoInserterTransform(process.env.USER_TABLE_NAME)
      );
    } catch (err: any) {
      return {
        statusCode: 500,
        body: JSON.stringify({ message: err.message })
      };
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
