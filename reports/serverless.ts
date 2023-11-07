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
      handler: 'src/lambdas/workers/create.handler',
      environment: {},
      events: [
        {
          stream: {
            type: 'dynamodb',
            arn: '${cf:infra-stream-sync-users.UserTableStreamArn}',
            batchSize: 500,
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
