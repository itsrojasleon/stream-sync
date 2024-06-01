import * as cdk from 'aws-cdk-lib';

export type Branch = 'test' | 'main';

export enum Stages {
  Test = 'test',
  Prod = 'prod'
}

export interface Environment extends cdk.Environment {
  stage: Stages;
  branch: Branch;
}

interface StackProps extends cdk.StackProps {
  env: Environment;
}

export interface PipelineStackProps extends StackProps {
  codestarConnectionArn: string;
}
