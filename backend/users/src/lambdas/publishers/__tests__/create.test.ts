import { dynamo, sqs } from '@/clients';
import { SendMessageBatchCommand } from '@aws-sdk/client-sqs';
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

const unprocessedItemsResponse = {
  UnprocessedItems: {
    user: [
      {
        PutRequest: {
          Item: {
            id: '1',
            name: 'name'
          }
        }
      }
    ]
  }
};

const processedItemsResponse = {
  UnprocessedItems: {}
};

describe('create', () => {
  it('throws an error if env variables are not defined', async () => {
    // @ts-ignore.
    const unformattedRes = await handler();

    const res = formatResponse(unformattedRes);

    expect(res.body.message).toBe('USER_TABLE_NAME is not defined');
    expect(res.statusCode).toBe(500);
  });

  it('stores user data in dynamo with built-in retry mechanisms', async () => {
    process.env.USER_TABLE_NAME = 'user';
    process.env.UNPROCESSED_USERS_QUEUE_URL = 'queueUrl';

    const mock = mockClient(dynamo);

    mock
      .on(BatchWriteCommand)
      // First try.
      .resolvesOnce(unprocessedItemsResponse)
      // Second retry.
      .resolvesOnce(unprocessedItemsResponse)
      // Third retry.
      // Store items successfully within dynamo.
      .resolves(processedItemsResponse);

    // @ts-ignore.
    const unformattedRes = await handler({
      body: JSON.stringify({
        totalUsers: 10
      })
    });

    const { body, statusCode } = formatResponse(unformattedRes);

    expect(mock.calls()).toHaveLength(3);

    expect(body.message).toBe('Bulk user creation went well');
    expect(statusCode).toBe(201);
  });

  it('stores user batches in dynamo', async () => {
    process.env.USER_TABLE_NAME = 'user';
    process.env.UNPROCESSED_USERS_QUEUE_URL = 'queueUrl';

    const mock = mockClient(dynamo);

    mock.on(BatchWriteCommand).resolves(processedItemsResponse);

    // @ts-ignore.
    const unformattedRes = await handler({
      body: JSON.stringify({
        totalUsers: 51
      })
    });

    const { body, statusCode } = formatResponse(unformattedRes);

    // There were 3 user batches: [25, 25, 1]
    // In each batch we got a successful response from dynamo.
    expect(mock.calls()).toHaveLength(3);

    expect(body.message).toBe('Bulk user creation went well');
    expect(statusCode).toBe(201);
  });

  it('queues unprocessed items', async () => {
    process.env.USER_TABLE_NAME = 'user';
    process.env.UNPROCESSED_USERS_QUEUE_URL = 'queueUrl';

    const dynamoMock = mockClient(dynamo);
    const sqsMock = mockClient(sqs);

    dynamoMock
      .on(BatchWriteCommand)
      // First try.
      .resolvesOnce(unprocessedItemsResponse)
      // Second retry.
      .resolvesOnce(unprocessedItemsResponse)
      // Third retry.
      .resolvesOnce(unprocessedItemsResponse)
      // Fourth call to give up due we reached the max retries (3).
      // Sent to the 'handleUnprocessedItemsTransform' function
      // to initiate queuing.
      .resolvesOnce(unprocessedItemsResponse);

    sqsMock.on(SendMessageBatchCommand).resolves({});

    // @ts-ignore.
    const unformattedRes = await handler({
      body: JSON.stringify({
        totalUsers: 10
      })
    });

    const { body, statusCode } = formatResponse(unformattedRes);

    expect(sqsMock.calls()).toHaveLength(1);

    expect(body.message).toBe('Bulk user creation went well');
    expect(statusCode).toBe(201);
  });
});
