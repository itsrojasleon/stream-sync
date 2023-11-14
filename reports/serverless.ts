import type { AWS } from '@serverless/typescript';

const serverlessConfig: AWS = {
  service: 'backend-stream-sync-reports',
  frameworkVersion: '3',
  provider: {
    name: 'aws',
    stage: '${opt:stage, "test"}',
    runtime: 'nodejs18.x',
    architecture: 'arm64',
    iam: {
      role: '${cf:infra-stream-sync-permissions.reportsRoleArn}'
    },
    vpc: {
      securityGroupIds: [
        '${cf:infra-stream-sync-networking.lambdaSecurityGroupId}'
      ],
      subnetIds: [
        '${cf:infra-stream-sync-networking.privateSubnet1Id}',
        '${cf:infra-stream-sync-networking.privateSubnet2Id}'
      ]
    }
  },

  functions: {
    createUsers: {
      handler: 'src/lambdas/workers/create-users.handler',
      environment: {
        DATABASE_SECRET_NAME:
          '${cf:infra-stream-sync-reports.databaseSecretName}'
      },
      events: [
        {
          stream: {
            type: 'dynamodb',
            arn: '${cf:infra-stream-sync-reports.userTableStreamArn}',
            batchSize: 500,
            startingPosition: 'LATEST',
            functionResponseType: 'ReportBatchItemFailures',
            maximumRetryAttempts: 10
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
      exclude: ['@aws-sdk/*', 'nock', 'mock-aws-s3', '@mapbox']
    }
  }
};

module.exports = serverlessConfig;
