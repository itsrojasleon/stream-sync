import { User } from '@/entity/user';
import { DatabaseManager } from '@/services/db';
import { formatUserFromDynamoStream } from '@/utils';
import { DynamoDBStreamHandler } from 'aws-lambda';

export const handler: DynamoDBStreamHandler = async (event, context) => {
  try {
    context.callbackWaitsForEmptyEventLoop = false;

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
        // TODO: Why eventID can be undefined?
        itemIdentifier: r.eventID!
      }))
    };
  }
};
