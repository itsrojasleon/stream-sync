import {
  SendMessageBatchCommand,
  SendMessageBatchRequestEntry
} from '@aws-sdk/client-sqs';
import { BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { Chance } from 'chance';
import { Readable, Transform } from 'stream';
import { monotonicFactory } from 'ulid';
import { dynamo, sqs } from '../clients';
import { User } from '../types';

export const generateId = () => {
  const ulid = monotonicFactory();
  return ulid();
};

export const generateUserStream = (totalUsers: number) => {
  const chance = new Chance();

  let usersCount = 0;

  return new Readable({
    objectMode: true,
    read() {
      const user: User = {
        id: generateId(),
        name: chance.name(),
        email: chance.email(),
        age: chance.age(),
        company: chance.company()
        // country: chance.country()
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
  let usersBatch: string[] = [];

  return new Transform({
    objectMode: true,
    transform(user: string, _, callback) {
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

export const dynamoInserterTransform = (
  tableName: string,
  maxRetries: number
) => {
  let retryCount = 0;
  let unprocessedItems: User[];

  return new Transform({
    objectMode: true,
    async transform(users: string[], _, callback) {
      unprocessedItems = users.map((u) => JSON.parse(u));

      try {
        while (retryCount < maxRetries && unprocessedItems.length > 0) {
          const { UnprocessedItems = {} } = await dynamo.send(
            new BatchWriteCommand({
              RequestItems: {
                [tableName]: unprocessedItems.map((user) => ({
                  PutRequest: {
                    Item: user
                  }
                }))
              }
            })
          );

          if (Object.keys(UnprocessedItems).length > 0) {
            unprocessedItems = mapUsersToUnprocessedItems(
              UnprocessedItems,
              tableName
            );
            const retryDelay = exponentialBackoff(retryCount);
            console.info(
              `Retrying in ${retryDelay}ms for the ${retryCount + 1} time`
            );
            await delay(retryDelay);
            retryCount++;
          } else {
            // All items were processed successfully.
            callback();
            return;
          }
        }

        // If we reach this point, it means we have unprocessed items.
        if (unprocessedItems.length > 0) {
          callback(null, unprocessedItems);
        }
      } catch (err: any) {
        callback(err);
      }
    }
  });
};

export const handleUnprocessedItemsTransform = (queueUrl: string) => {
  return new Transform({
    objectMode: true,
    async transform(users: User[], _, callback) {
      console.log({ users });
      try {
        const chunkSize = 10;
        const chunks = [];

        for (let i = 0; i < users.length; i += chunkSize) {
          chunks.push(users.slice(i, i + chunkSize));
        }

        const promises = chunks.map(async (chunk) => {
          const entries: SendMessageBatchRequestEntry[] = chunk.map((user) => ({
            Id: user.id,
            MessageBody: JSON.stringify(user)
          }));

          await sqs.send(
            new SendMessageBatchCommand({
              QueueUrl: queueUrl,
              Entries: entries
            })
          );
        });

        await Promise.all(promises);
        callback();
      } catch (err: any) {
        callback(err);
      }
    }
  });
};

const delay = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const exponentialBackoff = (retryCount: number) => {
  return Math.pow(2, retryCount) * 1000;
};

const mapUsersToUnprocessedItems = (
  users: Record<string, any[]>,
  tableName: string
) => {
  return users[tableName].map((item) => item.PutRequest?.Item);
};
