import { dynamo } from '@/clients';
import { User } from '@/types';
import { BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { pipeline } from 'node:stream/promises';
import {
  batcherTransform,
  dynamoInserterTransform,
  generateUserStream
} from './index';

describe('streams', () => {
  describe('generateUserStream', () => {
    it('should generate a user stream', (done) => {
      const totalUsers = 1;
      const stream = generateUserStream(totalUsers);

      const users: User[] = [];

      stream.on('data', (chunk) => {
        users.push(chunk);
      });

      stream.on('end', () => {
        try {
          expect(users.length).toBe(totalUsers);
          done();
        } catch (err) {
          done(err);
        }
      });
    });
  });

  describe('batcherTransform', () => {
    it('should create a transform stream with the specified batch size', async () => {
      const batchSize = 2;
      const totalUsers = 5;
      const userStream = generateUserStream(totalUsers);
      const transformStream = batcherTransform(batchSize);

      const batches: User[][] = [];

      transformStream.on('data', (userArray) => {
        batches.push(userArray);
      });

      await pipeline(userStream, transformStream);

      expect(batches.length).toBe(Math.ceil(totalUsers / batchSize));
    });

    it('should throw an error if the batch size is less than 1 or greater than 25', async () => {
      try {
        await pipeline(generateUserStream(1), batcherTransform(26));
      } catch (err: any) {
        expect(err.message).toBe('Batch size must be between 1 and 25');
      }
      try {
        await pipeline(generateUserStream(1), batcherTransform(-1));
      } catch (err: any) {
        expect(err.message).toBe('Batch size must be between 1 and 25');
      }
    });
  });

  describe('dynamoInserterTransform', () => {
    it('should insert the users into the database', async () => {
      const mock = mockClient(dynamo);

      const tableName = 'users';
      const totalUsers = 5;
      const userStream = generateUserStream(totalUsers);
      const batcherStream = batcherTransform(25);
      const inserterStream = dynamoInserterTransform(tableName);

      mock.on(BatchWriteCommand).resolves({
        UnprocessedItems: {
          users: []
        }
      });

      await pipeline(userStream, batcherStream, inserterStream);
    });

    it('should return unprocessed items if something went wrong', async () => {
      const mock = mockClient(dynamo);

      const tableName = 'users';
      const totalUsers = 5;
      const userStream = generateUserStream(totalUsers);
      const batcherStream = batcherTransform(25);
      const inserterStream = dynamoInserterTransform(tableName);

      mock.on(BatchWriteCommand).resolves({
        UnprocessedItems: {
          users: [
            {
              PutRequest: {
                Item: {
                  id: { S: '123' },
                  name: { S: 'John Doe' },
                  email: { S: 'test@test.com' },
                  age: { N: '20' },
                  company: { S: 'test' }
                }
              }
            }
          ]
        }
      });

      try {
        await pipeline(userStream, batcherStream, inserterStream);
      } catch (err: any) {
        console.log(err.message);
      }
    });
  });
});
