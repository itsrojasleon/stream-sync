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
  const { password, port, host, username, engine, database } =
    await getCredentials();

  return new DataSource({
    type: engine,
    host,
    port,
    username,
    password,
    // Note: database will be only used for sqlite (development env).
    database,
    synchronize: true,
    logging: true,
    entities: [User],
    subscribers: [],
    migrations: []
  });
};
