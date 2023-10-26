import { DataSource } from 'typeorm';
import { User } from './entity/user';

export const dataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'test',
  password: 'test',
  database: 'test',
  synchronize: true,
  logging: true,
  entities: [User],
  subscribers: [],
  migrations: []
});
