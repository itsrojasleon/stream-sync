import type { AWS } from '@serverless/typescript';

const serverlessConfig: AWS = {
  service: 'stream-sync-reports',
  frameworkVersion: '3',
  provider: {
    name: 'aws',
    stage: '${opt:stage, "test"}',
    runtime: 'nodejs18.x',
    architecture: 'arm64'
  },
  functions: {
    createUsers: {
      handler: 'src/lambdas/workers/create.handler',
      environment: {},
      events: [
        {
          stream: {
            type: 'dynamodb',
            arn: {
              'Fn::ImportValue': 'stream-sync-users:UserTableStreamArn'
            },
            batchSize: 25,
            startingPosition: 'LATEST',
            functionResponseType: 'ReportBatchItemFailures'
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
