#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import 'source-map-support/register';
import { git } from '../constants';
import { BackendPipelineStack } from '../lib/pipelines/backend-pipeline-stack';
import { CodestarConnectionStack } from '../lib/pipelines/codestar-connection-stack';
import { InfraPipelineStack } from '../lib/pipelines/infra-pipeline-stack';
import { Stages } from '../types';

const app = new cdk.App();
const stage: Stages = app.node.tryGetContext('stage');

if (![Stages.Test, Stages.Prod].includes(stage)) {
  throw new Error('Invalid stage');
}

const env = {
  stage,
  branch: git.branches[stage],
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION
};

const { codestarConnection } = new CodestarConnectionStack(
  app,
  `codestarConnectionStack-${stage}`,
  {
    env
  }
);

new BackendPipelineStack(app, `backendPipelineStack-${stage}`, {
  codestarConnectionArn: codestarConnection.attrConnectionArn,
  env
});

new InfraPipelineStack(app, `infraPipelineStack-${stage}`, {
  codestarConnectionArn: codestarConnection.attrConnectionArn,
  env
});
