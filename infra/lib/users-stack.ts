import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class UsersStack extends cdk.Stack {
  policyStatements: iam.PolicyStatement[];

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const usersTable = new dynamodb.Table(this, 'usersTable', {
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_IMAGE
    });

    this.policyStatements = [
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['dynamodb:PutItem'],
        resources: [usersTable.tableArn]
      }),
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'dynamodb:GetRecords',
          'dynamodb:GetShardIterator',
          'dynamodb:DescribeStream',
          'dynamodb:ListStreams'
        ],
        resources: [usersTable.tableStreamArn || '']
      })
    ];

    new cdk.CfnOutput(this, 'userTableName', {
      value: usersTable.tableName,
      exportName: 'userTableName'
    });

    new cdk.CfnOutput(this, 'userTableStreamArn', {
      value: usersTable.tableStreamArn || '',
      exportName: 'userTableStreamArn'
    });
  }
}
