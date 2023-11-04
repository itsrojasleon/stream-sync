import { dataSource } from '@/data-source';
import { DynamoDBStreamHandler } from 'aws-lambda';
import { DataSource } from 'typeorm';

let db: DataSource | null = null;

export const handler: DynamoDBStreamHandler = async (event) => {
  if (!db) {
    db = await dataSource.initialize();
  }

  const failedMessageIds: string[] = [];

  const promises = event.Records.map(async (record) => {
    console.log('record', JSON.stringify(record));
    // record.dynamodb?.NewImage;
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
