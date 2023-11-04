#!/usr/bin/env node

import * as cdk from 'aws-cdk-lib';
import 'source-map-support/register';
import { NetworkingStack } from '../lib/common/networking-stack';
import { PermissionsStack } from '../lib/common/permissions-stack';
import { ReportsStack } from '../lib/reports-stack';
import { UsersStack } from '../lib/users-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION
};

const networkingStack = new NetworkingStack(app, 'networkingStack', {
  env,
  stackName: 'stream-sync-networking'
});

const reportsStack = new ReportsStack(app, 'reportsStack', {
  env,
  vpc: networkingStack.vpc,
  databaseSecurityGroup: networkingStack.databaseSecurityGroup,
  stackName: 'stream-sync-reports'
});

const usersStack = new UsersStack(app, 'usersStack', {
  env,
  stackName: 'stream-sync-users'
});

new PermissionsStack(app, 'permissionsStack', {
  env,
  usersPolicyStatements: usersStack.policyStatements,
  reportsPolicyStatements: reportsStack.policyStatements,
  stackName: 'stream-sync-permissions'
});
