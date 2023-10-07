import { dynamo } from '@/clients';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    if (!process.env.USER_TABLE_NAME) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: 'Missing USER_TABLE_NAME environment variable'
        })
      };
    }

    const body = JSON.parse(event.body || '{}');

    if (!body.username || !body.email || !body.age) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing required fields' })
      };
    }

    const { Attributes = {} } = await dynamo.send(
      new PutCommand({
        TableName: process.env.USER_TABLE_NAME,
        Item: {
          id: body.username,
          email: body.email,
          age: body.age
        }
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'User successfully created',
        user: Attributes
      })
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: err.message })
    };
  }
};
