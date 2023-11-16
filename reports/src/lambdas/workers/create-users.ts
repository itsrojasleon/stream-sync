import { getDataSource } from '@/data-source';
import { User } from '@/entity/user';
import { formatUserFromDynamoStream } from '@/utils';
import { DynamoDBStreamHandler } from 'aws-lambda';
import { DataSource } from 'typeorm';

let db: DataSource | null = null;

export const handler: DynamoDBStreamHandler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  if (!db) {
    const dataSource = await getDataSource();
    db = await dataSource.initialize();
  }

  const users = event.Records.map((record) => {
    return formatUserFromDynamoStream(record.dynamodb?.NewImage!);
  });

  try {
    const res = await db
      .createQueryBuilder()
      .insert()
      .into(User)
      .values(users)
      .useTransaction(true)
      .execute();

    console.log({ res });

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
