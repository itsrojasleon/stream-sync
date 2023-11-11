import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class NetworkingStack extends cdk.Stack {
  vpc: ec2.Vpc;
  databaseSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, 'vpc', {
      maxAzs: 2,
      ipAddresses: ec2.IpAddresses.cidr('15.0.0.0/16')
    });

    // TODO: Make sure cdk creates subnets by default!
    this.vpc.privateSubnets.map((subnet, i) => {
      new cdk.CfnOutput(this, `privateSubnet${i + 1}Id`, {
        value: subnet.subnetId
      });
    });

    this.databaseSecurityGroup = new ec2.SecurityGroup(
      this,
      'databaseSecurityGroup',
      {
        vpc: this.vpc,
        description: 'Allow database access to ec2 instances'
      }
    );

    const lambdaSecurityGroup = new ec2.SecurityGroup(
      this,
      'lambdaSecurityGroup',
      {
        vpc: this.vpc,
        description: 'Allow lambda access to database'
      }
    );

    this.databaseSecurityGroup.addIngressRule(
      lambdaSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow lambda functions access to the database',
      false
    );

    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId
    });

    new cdk.CfnOutput(this, 'lambdaSecurityGroupId', {
      value: lambdaSecurityGroup.securityGroupId
    });
  }
}
