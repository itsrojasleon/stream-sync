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
  if (!process.env.DATABASE_HOSTNAME) {
    throw new Error('No database hostname found');
  }
  const { password, port, username, engine } = await getCredentials();

  return new DataSource({
    type: engine,
    host: process.env.DATABASE_HOSTNAME,
    port,
    username,
    password,
    synchronize: true,
    logging: true,
    entities: [User],
    subscribers: [],
    migrations: []
  });
};
