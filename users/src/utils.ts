import { BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { Chance } from 'chance';
import { Readable, Transform } from 'stream';
import { monotonicFactory } from 'ulid';
import { dynamo } from './clients';
import { User } from './types';

export const generateId = () => {
  const ulid = monotonicFactory();
  return ulid();
};

export const generateUserStream = () => {
  const totalBytes = 5 * 1024 * 1024; // 5 MB.
  const chance = new Chance();

  let generatedBytes = 0;

  return new Readable({
    read() {
      const user: User = {
        id: generateId(),
        name: chance.name(),
        email: chance.email(),
        age: chance.age(),
        company: chance.company()
      };

      this.push(JSON.stringify(user));
      if (generatedBytes >= totalBytes) {
        this.push(null);
      }
    }
  });
};

export const batcherTransform = (batchSize = 25) => {
  if (batchSize < 1 || batchSize > 25) {
    throw new Error('Batch size must be between 1 and 25');
  }

  let batch: User[] = [];

  return new Transform({
    objectMode: true,
    transform(user: User, _, callback) {
      batch.push(user);

      if (batch.length >= batchSize) {
        callback(null, batch);
        batch = [];
      }
      callback();
    },
    flush(callback) {
      if (batch.length > 0) {
        callback(null, batch);
      }
      callback();
    }
  });
};

export const dynamoInserterTransform = (tableName: string) => {
  return new Transform({
    objectMode: true,
    async transform(users: User[], _, callback) {
      try {
        const { UnprocessedItems } = await dynamo.send(
          new BatchWriteCommand({
            RequestItems: {
              [tableName]: users.map((user) => ({
                PutRequest: {
                  Item: user
                }
              }))
            }
          })
        );

        if (UnprocessedItems) {
          callback(new Error('Unprocessed items'), UnprocessedItems);
        } else {
          callback();
        }
      } catch (err: any) {
        callback(err);
      }
    }
  });
};
