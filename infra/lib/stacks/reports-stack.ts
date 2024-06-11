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

    const databaseSG = new ec2.SecurityGroup(this, 'databaseSecurityGroup', {
      vpc,
      description: 'Security group for the database'
    });
    const redisSG = new ec2.SecurityGroup(this, 'redisSecurityGroup', {
      vpc,
      description: 'Security group for the redis'
    });
    const lambdaSG = new ec2.SecurityGroup(this, 'lambdaSecurityGroup', {
      vpc,
      description: 'Security group for the lambda functions'
    });
    const ec2InstanceSG = new ec2.SecurityGroup(
      this,
      'ec2InstanceSecurityGroup',
      {
        vpc,
        description: 'Security group for the ec2 instances'
      }
    );

    databaseSG.connections.allowFrom(
      lambdaSG,
      ec2.Port.tcp(5432),
      'Allow lambda functions access to the database'
    );
    redisSG.connections.allowFrom(
      lambdaSG,
      ec2.Port.tcp(6379),
      'Allow lambda functions access to the redis'
    );
    ec2InstanceSG.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      'Allow SSH access from the internet'
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
      securityGroups: [databaseSG],
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      },
      credentials: rds.Credentials.fromGeneratedSecret('postgres'),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deletionProtection: false
    });
    const redis = new elasticache.CfnServerlessCache(this, 'redis', {
      engine: 'redis',
      serverlessCacheName: 'stream-sync-redis',
      description: 'Redis serverless cluster',
      securityGroupIds: [redisSG.securityGroupId],
      subnetIds: vpc.privateSubnets.map((subnet) => subnet.subnetId)
    });

    const ec2Instance = new ec2.Instance(this, 'ec2Instance', {
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC
      },
      securityGroup: ec2InstanceSG,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T4G,
        ec2.InstanceSize.MICRO
      ),
      machineImage: new ec2.AmazonLinuxImage({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
        cpuType: ec2.AmazonLinuxCpuType.ARM_64
      }),
      // NOTE: I have created a key pair in the AWS console.
      keyName: 'ec2-key-pair'
    });

    database.connections.allowFrom(
      ec2Instance,
      ec2.Port.tcp(5432),
      'Allow ec2 instance access to the database'
    );

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
      value: lambdaSG.securityGroupId
    });

    new cdk.CfnOutput(this, 'testQueueArn', {
      value: testQueue.queueArn
    });

    new cdk.CfnOutput(this, 'redisHostname', {
      value: redis.attrEndpointAddress
    });
  }
}
