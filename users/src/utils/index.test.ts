import { dynamo } from '@/clients';
import { User } from '@/types';
import { BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { pipeline } from 'stream/promises';
import {
  batcherTransform,
  dynamoInserterTransform,
  generateUserStream
} from './index';

describe('streams', () => {
  describe.skip('generateUserStream', () => {
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

      try {
        await pipeline(userStream, batcherStream, inserterStream);
      } catch (err) {
        console.log({ err });
      }
    });
  });
});
