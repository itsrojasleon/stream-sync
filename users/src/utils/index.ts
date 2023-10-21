import { BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { Chance } from 'chance';
import { Readable, Transform } from 'stream';
import { monotonicFactory } from 'ulid';
import { dynamo } from '../clients';
import { User } from '../types';

export const generateId = () => {
  const ulid = monotonicFactory();
  return ulid();
};

export const generateUserStream = (totalUsers: number) => {
  const chance = new Chance();

  let usersCount = 0;

  return new Readable({
    read() {
      const user: User = {
        id: generateId(),
        name: chance.name(),
        email: chance.email(),
        age: chance.age(),
        company: chance.company()
      };

      usersCount++;

      this.push(JSON.stringify(user));
      if (usersCount >= totalUsers) {
        this.push(null);
      }
    }
  });
};

export const batcherTransform = (batchSize = 25) => {
  if (batchSize < 1 || batchSize > 25) {
    throw new Error('Batch size must be between 1 and 25');
  }
  let usersBatch: User[] = [];

  return new Transform({
    objectMode: true,
    transform(user: User, _, callback) {
      usersBatch.push(user);

      if (usersBatch.length >= batchSize) {
        callback(null, usersBatch);
        usersBatch = [];
      } else {
        callback();
      }
    },
    flush(callback) {
      if (usersBatch.length > 0) {
        callback(null, usersBatch);
      } else {
        callback();
      }
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
          callback(null, UnprocessedItems);
        } else {
          callback();
        }
      } catch (err: any) {
        callback(err);
      }
    }
  });
};
