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
        USER_TABLE_NAME: {
          Ref: 'UserTable'
        }
      },
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
  plugins: [
    'serverless-esbuild',
    'serverless-dynamodb-local',
    'serverless-offline'
  ],
  custom: {
    esbuild: {
      bundle: true,
      minify: true,
      exclude: ['@aws-sdk/*']
    },
    dynamodb: {
      stages: ['dev'],
      start: {
        migrate: true,
        docker: true,
        noStart: true
      }
    }
  }
};

module.exports = serverlessConfig;
