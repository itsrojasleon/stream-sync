import { User } from '@/entity/user';
import { DatabaseManager } from '@/services/db';
import { getCachedUser, setCachedUser } from '@/utils/redis';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  const id = parseInt(event.pathParameters?.id || '');

  const cachedUser = await getCachedUser(id);

  if (cachedUser) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Cached user found successfully',
        data: { user: cachedUser }
      }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  const db = await DatabaseManager.getInstance();
  const user = await db.manager.getRepository(User).findOne({
    where: { id }
  });

  if (!user) {
    return {
      statusCode: 404,
      body: JSON.stringify({ message: 'User not found' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  await setCachedUser(id, user);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'User found successfully',
      data: { user }
    }),
    headers: { 'Content-Type': 'application/json' }
  };
};
