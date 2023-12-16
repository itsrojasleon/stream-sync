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
        '${cf:infra-stream-sync-reports.lambdaSecurityGroupId}'
      ],
      subnetIds: [
        '${cf:infra-stream-sync-reports.privateSubnet1Id}',
        '${cf:infra-stream-sync-reports.privateSubnet2Id}'
      ]
    }
  },
  functions: {
    createUsers: {
      handler: 'src/lambdas/workers/create-users.handler',
      timeout: 60,
      environment: {
        DATABASE_SECRET_NAME:
          '${cf:infra-stream-sync-reports.databaseSecretName}',
        DATABASE_HOSTNAME: '${cf:infra-stream-sync-reports.databaseHostname}'
      },
      events: [
        {
          stream: {
            type: 'dynamodb',
            arn: '${cf:infra-stream-sync-reports.userTableStreamArn}',
            batchSize: 500,
            startingPosition: 'LATEST',
            functionResponseType: 'ReportBatchItemFailures',
            maximumRetryAttempts: 10,
            destinations: {
              onFailure: '${cf:infra-stream-sync-reports.testQueueArn}'
            }
          }
        }
      ]
    },
    reprocessFailedUsers: {
      handler: 'src/lambdas/workers/reprocess-failed-users.handler',
      events: [
        {
          sqs: {
            arn: '${cf:infra-stream-sync-reports.testQueueArn}',
            batchSize: 100,
            maximumBatchingWindow: 30,
            functionResponseType: 'ReportBatchItemFailures',
            enabled: false
          }
        }
      ]
    },
    countUsers: {
      handler: 'src/lambdas/publishers/count.handler',
      timeout: 29,
      environment: {
        DATABASE_SECRET_NAME:
          '${cf:infra-stream-sync-reports.databaseSecretName}',
        DATABASE_HOSTNAME: '${cf:infra-stream-sync-reports.databaseHostname}'
      },
      events: [
        {
          httpApi: {
            method: 'get',
            path: '/count'
          }
        }
      ]
    },
    getOneUser: {
      handler: 'src/lambdas/publishers/get-one.handler',
      timeout: 8,
      environment: {
        DATABASE_SECRET_NAME:
          '${cf:infra-stream-sync-reports.databaseSecretName}',
        DATABASE_HOSTNAME: '${cf:infra-stream-sync-reports.databaseHostname}',
        REDIS_HOSTNAME: '${cf:infra-stream-sync-reports.redisHostname}',
        REDIS_PORT: '${cf:infra-stream-sync-reports.redisPort}'
      },
      events: [
        {
          httpApi: {
            method: 'get',
            path: '/users/{id}'
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
