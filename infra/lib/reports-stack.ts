import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export class ReportsStack extends cdk.Stack {
  policyStatements: iam.PolicyStatement[] = [];

  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'vpc', {
      maxAzs: 2,
      ipAddresses: ec2.IpAddresses.cidr('15.0.0.0/16'),
      subnetConfiguration: [
        {
          name: 'rds isolated subnet',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED
        }
      ]
    });

    // Allow the lambda functions to access secrets manager.
    new ec2.InterfaceVpcEndpoint(this, 'secretsManagerVpcEndpoint', {
      vpc,
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
      privateDnsEnabled: true
    });

    vpc.isolatedSubnets.map((subnet, i) => {
      console.log(`isolatedSubnet${i + 1}Id: ${subnet.subnetId}`);
      new cdk.CfnOutput(this, `isolatedSubnet${i + 1}Id`, {
        value: subnet.subnetId
      });
    });

    const databaseSecurityGroup = new ec2.SecurityGroup(
      this,
      'databaseSecurityGroup',
      {
        vpc,
        description: 'Security group for the database'
      }
    );

    const lambdaSecurityGroup = new ec2.SecurityGroup(
      this,
      'lambdaSecurityGroup',
      {
        vpc,
        description: 'Security group for the lambda functions'
      }
    );

    databaseSecurityGroup.connections.allowFrom(
      lambdaSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow lambda functions access to the database'
    );

    databaseSecurityGroup.addIngressRule(
      lambdaSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow lambda functions access to the database'
    );

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
      writer: rds.ClusterInstance.provisioned('instance1', {
        instanceType: new ec2.InstanceType('t4g.medium')
      }),
      readers: [
        rds.ClusterInstance.provisioned('instance2', {
          instanceType: new ec2.InstanceType('t4g.medium')
        })
      ],
      vpc,
      securityGroups: [databaseSecurityGroup],
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED
      },
      credentials: rds.Credentials.fromSecret(secret, 'username'),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deletionProtection: false
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

    new cdk.CfnOutput(this, 'lambdaSecurityGroupId', {
      value: lambdaSecurityGroup.securityGroupId
    });
  }
}
