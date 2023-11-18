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
      role: '${cf:infra-stream-sync-permissions.usersRoleArn}'
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
        USER_TABLE_NAME: '${cf:infra-stream-sync-users.userTableName}'
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
      handler: 'src/lambdas/consumers/handle-unprocessed-users.handler',
      environment: {
        UNPROCESSED_USERS_QUEUE_URL:
          '${cf:infra-stream-sync-users.unprocessedUsersQueueUrl}'
      },
      timeout: 20,
      memorySize: 512,
      events: [
        {
          stream: {
            type: 'dynamodb',
            arn: '${cf:infra-stream-sync-users.userTableStreamArn}'
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
