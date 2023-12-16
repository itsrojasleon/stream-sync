import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

export class ReportsStack extends cdk.Stack {
  policyStatements: iam.PolicyStatement[] = [];

  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'vpc', {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          name: 'private subnet',
          cidrMask: 24,
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
        },
        // TODO: For the bastion host.
        {
          name: 'public subnet',
          cidrMask: 24,
          subnetType: ec2.SubnetType.PUBLIC
        }
      ]
    });

    const logGroup = new logs.LogGroup(this, 'VpcFlowLogsGroup', {
      retention: logs.RetentionDays.ONE_WEEK
    });

    new ec2.FlowLog(this, 'VpcFlowLog', {
      resourceType: ec2.FlowLogResourceType.fromVpc(vpc),
      destination: ec2.FlowLogDestination.toCloudWatchLogs(logGroup)
    });

    vpc.privateSubnets.map((subnet, i) => {
      console.log(`privateSubnet${i + 1}Id: ${subnet.subnetId}`);
      new cdk.CfnOutput(this, `privateSubnet${i + 1}Id`, {
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

    const redisSecurityGroup = new ec2.SecurityGroup(
      this,
      'redisSecurityGroup',
      {
        vpc,
        description: 'Security group for the redis'
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
    redisSecurityGroup.connections.allowFrom(
      lambdaSecurityGroup,
      ec2.Port.tcp(6379),
      'Allow lambda functions access to the redis'
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
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      },
      credentials: rds.Credentials.fromGeneratedSecret('postgres'),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deletionProtection: false
    });

    const redis = new elasticache.CfnCacheCluster(this, 'redis', {
      cacheNodeType: 'cache.t3.micro',
      engine: 'redis',
      numCacheNodes: 1,
      vpcSecurityGroupIds: [redisSecurityGroup.securityGroupId],
      cacheSubnetGroupName: new elasticache.CfnSubnetGroup(
        this,
        'redisSubnetGroup',
        {
          description: 'Subnet group for redis',
          subnetIds: vpc.privateSubnets.map((subnet) => subnet.subnetId)
        }
      ).ref
    });

    const testQueue = new sqs.Queue(this, 'testQueue', {
      visibilityTimeout: cdk.Duration.minutes(1),
      receiveMessageWaitTime: cdk.Duration.seconds(20),
      retentionPeriod: cdk.Duration.days(14)
    });

    this.policyStatements.push(
      new iam.PolicyStatement({
        actions: ['secretsmanager:GetSecretValue'],
        resources: [database.secret?.secretArn || '']
      }),
      new iam.PolicyStatement({
        actions: ['sqs:*'],
        resources: [testQueue.queueArn]
      })
    );

    new cdk.CfnOutput(this, 'databaseHostname', {
      value: database.clusterEndpoint.hostname
    });

    new cdk.CfnOutput(this, 'databaseName', {
      value: database.clusterIdentifier
    });

    new cdk.CfnOutput(this, 'databaseSecretName', {
      value: database.secret?.secretName || ''
    });

    new cdk.CfnOutput(this, 'userTableStreamArn', {
      value: cdk.Fn.importValue('userTableStreamArn')
    });

    new cdk.CfnOutput(this, 'lambdaSecurityGroupId', {
      value: lambdaSecurityGroup.securityGroupId
    });

    new cdk.CfnOutput(this, 'testQueueArn', {
      value: testQueue.queueArn
    });

    new cdk.CfnOutput(this, 'redisHostname', {
      value: redis.attrRedisEndpointAddress
    });

    new cdk.CfnOutput(this, 'redisPort', {
      value: redis.attrRedisEndpointPort
    });
  }
}
