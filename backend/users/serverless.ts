import type { AWS } from '@serverless/typescript';

const serverlessConfig: AWS = {
  service: 'backend-stream-sync-users',
  frameworkVersion: '3',
  provider: {
    name: 'aws',
    stage: '${opt:stage, "test"}',
    runtime: 'nodejs18.x',
    architecture: 'arm64',
    iam: {
      role: '${cf:permissionsStack-${self:provider.stage}.usersRoleArn}'
    }
  },
  functions: {
    // NOTE: The user creation logic should have been implemented in a
    // worker lambda just because of the fact that we have 30 seconds
    // to process all the users.
    // One great way would be to upload all users to S3 in a csv file and
    // then trigger a lambda that would process the file.
    createUsers: {
      handler: 'src/lambdas/publishers/create.handler',
      environment: {
        USER_TABLE_NAME:
          '${cf:usersStack-${self:provider.stage}.userTableName}',
        UNPROCESSED_USERS_QUEUE_URL:
          '${cf:usersStack-${self:provider.stage}.unprocessedUsersQueueUrl}'
      },
      timeout: 29,
      memorySize: 512,
      events: [
        {
          httpApi: {
            method: 'post',
            path: '/users'
          }
        }
      ]
    },
    handleUnprocessedUsers: {
      handler: 'src/lambdas/workers/handle-unprocessed-users.handler',
      timeout: 20,
      memorySize: 512,
      events: [
        {
          sqs: {
            arn: '${cf:usersStack-${self:provider.stage}.unprocessedUsersQueueArn}'
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
