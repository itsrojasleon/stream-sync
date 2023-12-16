#!/usr/bin/env node

import * as cdk from 'aws-cdk-lib';
import 'source-map-support/register';
import { PermissionsStack } from '../lib/common/permissions-stack';
import { ReportsStack } from '../lib/reports-stack';
import { UsersStack } from '../lib/users-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION
};

const reportsStack = new ReportsStack(app, 'reportsStack', {
  env,
  stackName: 'infra-stream-sync-reports'
});

const usersStack = new UsersStack(app, 'usersStack', {
  env,
  stackName: 'infra-stream-sync-users'
});

reportsStack.addDependency(usersStack);

new PermissionsStack(app, 'permissionsStack', {
  env,
  usersPolicyStatements: usersStack.policyStatements,
  reportsPolicyStatements: reportsStack.policyStatements,
  stackName: 'infra-stream-sync-permissions'
});
