import { User } from '@/entity/user';
import { DataSource, DataSourceOptions } from 'typeorm';

export const createDataSource = (opts: DataSourceOptions) => {
  return new DataSource({
    ...opts,
    logging: true,
    synchronize: false,
    entities: [User]
  });
};
