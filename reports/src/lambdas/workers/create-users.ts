import { dataSource } from '@/data-source';
import { User } from '@/entity/user';
import { formatUserFromDynamoStream } from '@/utils';
import { DynamoDBStreamHandler } from 'aws-lambda';
import { DataSource } from 'typeorm';

let db: DataSource | null = null;

export const handler: DynamoDBStreamHandler = async (event) => {
  if (!db) {
    db = await dataSource.initialize();
  }

  const failedMessageIds: string[] = [];

  const users = event.Records.map((record) => {
    return formatUserFromDynamoStream(record.dynamodb?.NewImage!);
  });

  console.log({ users });

  const res = await db
    .createQueryBuilder()
    .insert()
    .into(User)
    .values(users)
    .useTransaction(true)
    .execute();

  console.log({ res });

  const promises = event.Records.map(async (record) => {
    // console.log('record', JSON.stringify(record));
    // try {
    // } catch (err) {
    //   // Note: Not sure why eventId is not always present.
    //   if (record.eventID) {
    //     failedMessageIds.push(record.eventID);
    //   }
    // }
  });

  await Promise.allSettled(promises);

  return {
    batchItemFailures: failedMessageIds.map((id) => ({
      itemIdentifier: id
    }))
  };
};
