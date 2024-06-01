import { SQSHandler } from 'aws-lambda';

export const handler: SQSHandler = async (event) => {
  const failedMessageIds: string[] = [];

  const promises = event.Records.map(async (r) => {
    try {
      const body = JSON.parse(r.body);

      // TODO: Do something with unprocessed users.
      console.log({ body });
    } catch (err) {
      failedMessageIds.push(r.messageId);
    }
  });

  await Promise.allSettled(promises);
  return {
    batchItemFailures: failedMessageIds.map((id) => ({ itemIdentifier: id }))
  };
};
