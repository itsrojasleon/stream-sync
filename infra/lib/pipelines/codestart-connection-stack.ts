import * as cdk from 'aws-cdk-lib';
import * as codestarconnections from 'aws-cdk-lib/aws-codestarconnections';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { StackProps } from '../../types';

export class CodestarConnectionStack extends cdk.Stack {
  codestarConnection: codestarconnections.CfnConnection;

  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const role = new iam.Role(this, 'CodeStarRole', {
      assumedBy: new iam.ServicePrincipal('codestar.amazonaws.com')
    });

    this.codestarConnection = new codestarconnections.CfnConnection(
      this,
      'codestarConnection',
      {
        connectionName: `github-connection-${props.env.stage}`,
        providerType: 'GitHub'
      }
    );

    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ['codestar-connections:UseConnection'],
        resources: [this.codestarConnection.attrConnectionArn]
      })
    );
  }
}
