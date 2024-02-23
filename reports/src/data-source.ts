import { createDataSource } from '@/utils/db';
import { config } from 'dotenv';

config();

const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_USERNAME', 'DB_PASSWORD'];

requiredEnvVars.map((varName) => {
  if (!process.env[varName]) throw new Error(`${varName} must be defined`);
});

if (!process.env.DB_HOST) throw new Error('DB_HOST must be defined');
if (!process.env.DB_PORT) throw new Error('DB_PORT must be defined');
if (!process.env.DB_USERNAME) throw new Error('DB_USERNAME must be defined');
if (!process.env.DB_PASSWORD) throw new Error('DB_PASSWORD must be defined');

export const dataSource = createDataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD
});
