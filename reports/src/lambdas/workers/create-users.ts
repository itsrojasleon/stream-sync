import { DatabaseManager } from '@/data-source';
import { User } from '@/entity/user';
import { formatUserFromDynamoStream } from '@/utils';
import { DynamoDBStreamHandler } from 'aws-lambda';
import { DataSource } from 'typeorm';

let db: DataSource | undefined;

export const handler: DynamoDBStreamHandler = async (event, context) => {
  try {
    context.callbackWaitsForEmptyEventLoop = false;

    throw new Error('Something went wrong');

    const db = await DatabaseManager.getInstance();

    const users = event.Records.map((record) => {
      return formatUserFromDynamoStream(record.dynamodb?.NewImage!);
    });

    await db
      .createQueryBuilder()
      .insert()
      .into(User)
      .values(users)
      .useTransaction(true)
      .execute();

    return {
      batchItemFailures: []
    };
  } catch (err) {
    console.log('Something went wrong inserting a bunch of users', err);
    return {
      batchItemFailures: event.Records.map((r) => ({
        // TODO: Why eventID would be undefined?
        itemIdentifier: r.eventID!
      }))
    };
  }
};
