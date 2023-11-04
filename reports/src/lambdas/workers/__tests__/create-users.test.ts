import { dynamo } from '@/clients';
import { mockClient } from 'aws-sdk-client-mock';
import { handler } from '../create-users';

describe('create-users', () => {
  it('should create users', async () => {
    const mock = mockClient(dynamo);

    // @ts-ignore.
    const result = await handler({
      Records: [
        {
          dynamodb: {
            NewImage: {
              id: {
                S: '1'
              },
              email: {
                S: 'test@test.com'
              }
            }
          }
        }
      ]
    });

    expect(result).toEqual({
      batchItemFailures: []
    });
  });
});
