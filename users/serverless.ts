import type { AWS } from '@serverless/typescript';

const serverlessConfig: AWS = {
  service: 'stream-sync-users',
  frameworkVersion: '3',
  provider: {
    name: 'aws',
    stage: '${opt:stage, "test"}',
    runtime: 'nodejs18.x',
    architecture: 'arm64'
  },
  functions: {
    createUsers: {
      handler: 'src/lambdas/publishers/create.handler',
      environment: {
        USER_TABLE_NAME: '${cf:stream-sync-users.userTableName}'
      },
      timeout: 120, // 2 minutes.
      events: [
        {
          httpApi: {
            method: 'post',
            path: '/users'
          }
        }
      ]
    }
  },
  plugins: ['serverless-esbuild'],
  custom: {
    esbuild: {
      bundle: true,
      minify: true,
      exclude: ['@aws-sdk/*']
    }
  }
};

module.exports = serverlessConfig;
