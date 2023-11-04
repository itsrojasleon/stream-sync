import { DataSource } from 'typeorm';
import { User } from './entity/user';

const IS_DEV = process.env.NODE_ENV === 'dev';

// TODO: Add env variables.
export const dataSource = new DataSource({
  type: IS_DEV ? 'sqlite' : 'postgres',
  host: 'localhost',
  port: 5432,
  database: IS_DEV ? 'db-test' : 'test',
  username: 'test',
  password: 'test',
  synchronize: IS_DEV,
  logging: true,
  entities: [User],
  subscribers: [],
  migrations: []
});
