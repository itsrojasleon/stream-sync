import { secretsManager } from '@/clients';
import { GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { DataSource } from 'typeorm';
import { User } from './entity/user';

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

export const getDataSource = async () => {
  const { password, port, host, username, engine, dbClusterIdentifier } =
    await getCredentials();

  return new DataSource({
    type: engine,
    database: dbClusterIdentifier,
    host,
    port,
    username,
    password,
    synchronize: true,
    logging: true,
    ssl: true,
    entities: [User],
    subscribers: [],
    migrations: []
    // extra: {
    //   ssl: {
    //     rejectUnauthorized: false
    //   }
    // }
    // Note: database will be only used for sqlite (development env).
    // ...(database && { database })
  });
};
