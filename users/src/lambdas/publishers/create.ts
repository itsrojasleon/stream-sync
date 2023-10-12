import { dynamo } from '@/clients';
import { generateId } from '@/utils';
import { BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    if (!process.env.USER_TABLE_NAME) {
      throw new Error('USER_TABLE_NAME is not defined');
    }

    const id = generateId();

    const { UnprocessedItems } = await dynamo.send(
      new BatchWriteCommand({
        RequestItems: {
          [process.env.USER_TABLE_NAME]: [
            {
              PutRequest: {
                Item: {
                  id,
                  name: `${id}-name`,
                  email: `${id}-email`
                }
              }
            }
          ]
        }
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Bulk write went successfully'
      })
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: err.message })
    };
  }
};
