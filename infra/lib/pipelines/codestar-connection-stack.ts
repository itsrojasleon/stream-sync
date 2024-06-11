import * as cdk from 'aws-cdk-lib';
import * as codestarconnections from 'aws-cdk-lib/aws-codestarconnections';
import { Construct } from 'constructs';
import { StackProps } from '../../types';

export class CodestarConnectionStack extends cdk.Stack {
  codestarConnection: codestarconnections.CfnConnection;

  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    this.codestarConnection = new codestarconnections.CfnConnection(
      this,
      'codestarConnection',
      {
        connectionName: `github-connection-${props.env.stage}`,
        providerType: 'GitHub'
      }
    );
  }
}
