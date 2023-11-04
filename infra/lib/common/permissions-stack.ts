import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

interface StackProps extends cdk.StackProps {
  usersPolicyStatements: iam.PolicyStatement[];
  reportsPolicyStatements: iam.PolicyStatement[];
}

export class PermissionsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const managedPolicies = [
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AWSLambdaBasicExecutionRole'
      ),
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AWSLambdaVPCAccessExecutionRole'
      )
    ];

    const usersRole = new iam.Role(this, 'usersRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies,
      inlinePolicies: {
        inlinePolicy: new iam.PolicyDocument({
          statements: props.usersPolicyStatements
        })
      }
    });

    const reportsRole = new iam.Role(this, 'reportsRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies,
      inlinePolicies: {
        inlinePolicy: new iam.PolicyDocument({
          statements: props.reportsPolicyStatements
        })
      }
    });

    new cdk.CfnOutput(this, 'usersRoleArn', {
      value: usersRole.roleArn
    });

    new cdk.CfnOutput(this, 'reportsRoleArn', {
      value: reportsRole.roleArn
    });
  }
}
