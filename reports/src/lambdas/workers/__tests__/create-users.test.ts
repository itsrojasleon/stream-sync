import { dynamo } from '@/clients';
import { mockClient } from 'aws-sdk-client-mock';
import fs from 'node:fs/promises';
import path from 'node:path';
import { handler } from '../create-users';

const removeSqliteFile = async () => {
  const file = path.resolve(__dirname, '../../../../db.sqlite');
  try {
    await fs.access(file);
    await fs.unlink(file);
  } catch (err) {
    console.log('err', err);
  }
};

afterAll(async () => {
  await removeSqliteFile();
});

describe('create-users', () => {
  it('should create users', async () => {
    const mock = mockClient(dynamo);

    const records = Array.from({ length: 2 }, () => ({
      dynamodb: {
        NewImage: {
          name: { S: 'test' },
          email: { S: 'test@test.com' },
          age: { N: '10' },
          company: { S: 'test' }
        }
      }
    }));

    // @ts-ignore.
    const result = await handler({
      Records: records
    });

    expect(result).toEqual({
      batchItemFailures: []
    });
  });
});
