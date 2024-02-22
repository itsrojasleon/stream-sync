import { createDataSource } from '@/utils/db';
import { config } from 'dotenv';

config({ path: __dirname + '../../../.env' });

console.log(process.env.HELLO);

// TODO: Continue here
// https://stackoverflow.com/questions/71625087/typeorm-migration-file-must-contain-a-typescript-javascript-code-and-export-a

export const dataSource = createDataSource({
  type: 'postgres',
  host: 'l',
  port: 3,
  username: 'x',
  password: 'x'
});
