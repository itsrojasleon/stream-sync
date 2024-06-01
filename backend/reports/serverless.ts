import type { AWS } from '@serverless/typescript';

const serverlessConfig: AWS = {
  service: 'backend-stream-sync-reports',
  frameworkVersion: '3',
  provider: {
    name: 'aws',
    stage: '${opt:stage, "test"}',
    runtime: 'nodejs20.x',
    architecture: 'arm64',
    iam: {
      role: '${cf:permissionsStack-${self:provider.stage}.reportsRoleArn}'
    },
    vpc: {
      securityGroupIds: [
        '${cf:reportsStack-${self:provider.stage}.lambdaSecurityGroupId}'
      ],
      subnetIds: [
        '${cf:reportsStack-${self:provider.stage}.privateSubnet1Id}',
        '${cf:reportsStack-${self:provider.stage}.privateSubnet2Id}'
      ]
    }
  },
  functions: {
    createUsers: {
      handler: 'src/lambdas/workers/create-users.handler',
      timeout: 60,
      environment: {
        DATABASE_SECRET_NAME:
          '${cf:reportsStack-${self:provider.stage}.databaseSecretName}',
        DATABASE_HOSTNAME:
          '${cf:reportsStack-${self:provider.stage}.databaseHostname}'
      },
      events: [
        {
          stream: {
            type: 'dynamodb',
            arn: '${cf:reportsStack-${self:provider.stage}.userTableStreamArn}',
            batchSize: 500,
            startingPosition: 'LATEST',
            functionResponseType: 'ReportBatchItemFailures',
            maximumRetryAttempts: 10,
            destinations: {
              onFailure:
                '${cf:reportsStack-${self:provider.stage}.testQueueArn}'
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
            arn: '${cf:reportsStack-${self:provider.stage}.testQueueArn}',
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
          '${cf:reportsStack-${self:provider.stage}.databaseSecretName}',
        DATABASE_HOSTNAME:
          '${cf:reportsStack-${self:provider.stage}.databaseHostname}'
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
          '${cf:reportsStack-${self:provider.stage}.databaseSecretName}',
        DATABASE_HOSTNAME:
          '${cf:reportsStack-${self:provider.stage}.databaseHostname}',
        REDIS_HOSTNAME:
          '${cf:reportsStack-${self:provider.stage}.redisHostname}'
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
