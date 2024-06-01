// TODO: Continue with the implementation.
// For now I don't need to implement this lambda function.

import { dynamoStreams } from '@/clients';
import {
  GetRecordsCommand,
  GetShardIteratorCommand
} from '@aws-sdk/client-dynamodb-streams';
import { SQSHandler } from 'aws-lambda';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getShardIterator = async (
  streamArn: string,
  shardId: string,
  sequenceNumber: string
) => {
  const iteratorCommand = new GetShardIteratorCommand({
    StreamArn: streamArn,
    ShardId: shardId,
    ShardIteratorType: 'AT_SEQUENCE_NUMBER',
    SequenceNumber: sequenceNumber
  });
  const iteratorData = await dynamoStreams.send(iteratorCommand);
  return iteratorData.ShardIterator;
};

export const handler: SQSHandler = async (event) => {
  const failedMessageIds: string[] = [];

  const promises = event.Records.map(async (r) => {
    try {
      const data = JSON.parse(r.body);

      let currentShardIterator = await getShardIterator(
        data.streamArn,
        data.shardId,
        data.startSequenceNumber
      );
      let continueReading = true;

      while (continueReading) {
        try {
          const { Records, NextShardIterator } = await dynamoStreams.send(
            new GetRecordsCommand({
              ShardIterator: currentShardIterator
            })
          );

          if (Records?.length) {
            Records.map(async (record) => {});
            // for (const record of Records) {
            //   if (record.dynamodb?.SequenceNumber) {
            //     if (record.dynamodb?.SequenceNumber > data.endSequenceNumber) {
            //       continueReading = false;
            //       break;
            //     }
            //   }

            //   console.log('Processing record:', record);
            //   // await trackProcessedRecord(record);
            // }
          } else {
            console.log(
              'No new records to process. Waiting for new records...'
            );
          }

          currentShardIterator = NextShardIterator;

          if (!currentShardIterator || !continueReading) {
            break;
          }

          await delay(5000);
        } catch (err: any) {
          if (err.name === 'ExpiredIteratorException') {
            console.log('Shard iterator expired. Fetching a new iterator...');
            currentShardIterator = await getShardIterator(
              data.streamArn,
              data.shardId,
              data.startSequenceNumber
            );
          } else {
            console.error('Error processing records:', err);
            failedMessageIds.push(r.messageId);
          }
        }
      }
    } catch (err) {
      failedMessageIds.push(r.messageId);
    }
  });

  await Promise.allSettled(promises);
  return {
    batchItemFailures: failedMessageIds.map((id) => ({
      itemIdentifier: id
    }))
  };
};
