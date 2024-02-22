import { secretsManager } from '@/clients';
import { createDataSource } from '@/utils/db';
import { GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { DataSource } from 'typeorm';

const getCredentials = async () => {
  if (!process.env.DATABASE_SECRET_NAME) {
    throw new Error('No secret id found');
  }

  const { SecretString } = await secretsManager.send(
    new GetSecretValueCommand({
      SecretId: process.env.DATABASE_SECRET_NAME
    })
  );

  if (!SecretString) {
    throw new Error('No secret string found');
  }
  return JSON.parse(SecretString);
};

export class DatabaseManager {
  private static instance: DataSource;

  // singleton pattern.
  private constructor() {}

  public static async getInstance(): Promise<DataSource> {
    if (!process.env.DATABASE_HOSTNAME) {
      throw new Error('No database hostname found');
    }

    if (!DatabaseManager.instance || !DatabaseManager.instance.isInitialized) {
      const { password, port, username, engine, database } =
        await getCredentials();

      DatabaseManager.instance = createDataSource({
        type: engine,
        host: process.env.DATABASE_HOSTNAME,
        port,
        username,
        password,
        // NOTE: Just specify db name in development.
        ...(database && {
          database
        })
      });

      await DatabaseManager.instance.initialize();
    }
    return DatabaseManager.instance;
  }
}
