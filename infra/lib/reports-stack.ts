import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

interface StackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  databaseSecurityGroup: ec2.SecurityGroup;
}

export class ReportsStack extends cdk.Stack {
  policyStatements: iam.PolicyStatement[];

  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const queue = new sqs.Queue(this, 'queue', {
      deadLetterQueue: {
        maxReceiveCount: 3,
        queue: new sqs.Queue(this, 'deadLetterQueue')
      }
    });

    const secret = new secretsmanager.Secret(this, 'credentials', {
      generateSecretString: {
        secretStringTemplate: '{"username": "username"}',
        generateStringKey: 'password',
        includeSpace: false,
        excludePunctuation: true
      }
    });

    this.policyStatements.push(
      new iam.PolicyStatement({
        actions: ['secretsmanager:GetSecretValue'],
        resources: [secret.secretArn]
      })
    );

    const database = new rds.DatabaseCluster(this, 'database', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_14_3
      }),
      instanceProps: {
        vpc: props.vpc,
        instanceType: new ec2.InstanceType('t4g.medium'),
        securityGroups: [props.databaseSecurityGroup]
      },
      instances: 2,
      credentials: rds.Credentials.fromSecret(secret, 'username'),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deletionProtection: false // Change in a serious app.
    });

    new cdk.CfnOutput(this, 'databaseHostname', {
      value: database.clusterEndpoint.hostname
    });

    new cdk.CfnOutput(this, 'databaseName', {
      value: database.clusterIdentifier
    });

    new cdk.CfnOutput(this, 'databaseSecretName', {
      value: secret.secretName
    });

    new cdk.CfnOutput(this, 'userTableStreamArn', {
      value: cdk.Fn.importValue('userTableStreamArn')
    });
  }
}
