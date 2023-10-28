import { dynamo } from '@/clients';
import { BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { handler } from '../create';

type Response = {
  statusCode: number;
  body: Record<string, any>;
};

const formatResponse = (response: any): Response => ({
  ...response,
  body: JSON.parse(response.body || '{}')
});

describe('create', () => {
  it('throws an error if env variables are not defined', async () => {
    // @ts-ignore.
    const unformattedRes = await handler();

    const res = formatResponse(unformattedRes);

    expect(res.body.message).toBe('USER_TABLE_NAME is not defined');
    expect(res.statusCode).toBe(500);
  });

  it('creates 1000 users by default', async () => {
    process.env.USER_TABLE_NAME = 'user';

    const mock = mockClient(dynamo);

    mock.on(BatchWriteCommand).resolves({
      UnprocessedItems: {}
    });

    // @ts-ignore.
    const unformattedRes = await handler({
      body: JSON.stringify({
        totalUsers: 51
      })
    });

    const res = formatResponse(unformattedRes);

    expect(mock.calls()).toHaveLength(3);
    expect(res.body.message).toBe('Bulk user creation went well');
    expect(res.statusCode).toBe(201);
  });

  it('handles unprocessed items', async () => {
    process.env.USER_TABLE_NAME = 'user';

    const mock = mockClient(dynamo);
    const user = { id: '1', name: 'name' };

    mock
      .on(BatchWriteCommand)
      .resolvesOnce({
        UnprocessedItems: {
          user: [
            {
              PutRequest: {
                Item: user
              }
            }
          ]
        }
      })
      .resolvesOnce({
        UnprocessedItems: {
          user: [
            {
              PutRequest: {
                Item: user
              }
            }
          ]
        }
      })
      .resolves({
        UnprocessedItems: {}
      });

    // @ts-ignore.
    const unformattedRes = await handler({
      body: JSON.stringify({
        totalUsers: 51
      })
    });

    const { body, statusCode } = formatResponse(unformattedRes);

    // 1 from the first stream, 1 from the second stream, 3 from the third stream.
    expect(mock.calls()).toHaveLength(5);

    expect(body.message).toBe('Bulk user creation went well');
    expect(statusCode).toBe(201);
  });
});
