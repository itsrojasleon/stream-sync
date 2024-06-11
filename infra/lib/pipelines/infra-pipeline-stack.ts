import * as cdk from 'aws-cdk-lib';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as pipelines from 'aws-cdk-lib/pipelines';
import { Construct } from 'constructs';
import { git } from '../../constants';
import { PipelineStackProps } from '../../types';
import { PipelineAppStage } from './pipeline-app-stage';

export class InfraPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, public props: PipelineStackProps) {
    super(scope, id, props);

    const { owner, repo, branches } = git;

    const pipeline = new pipelines.CodePipeline(this, 'pipeline', {
      codeBuildDefaults: {
        buildEnvironment: {
          buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_ARM_3
        },
        partialBuildSpec: codebuild.BuildSpec.fromObject({
          version: '0.2',
          phases: {
            install: {
              commands: ['npm install -g aws-cdk', 'npm install -g typescript']
            }
          },
          reports: {
            cdk: {
              commands: ['cd infra', 'npx cdk ls', 'npx cdk synth']
            }
          }
        })
      },
      synth: new pipelines.ShellStep('synth', {
        input: pipelines.CodePipelineSource.connection(
          `${owner}/${repo}`,
          branches[props.env.stage],
          {
            connectionArn: props.codestarConnectionArn
          }
        ),
        installCommands: [
          'cd $CODEBUILD_SRC_DIR/infra',
          'ls -al',
          'npm install'
        ],
        commands: [
          'npm run build',
          `npx cdk synth -c stage=${props.env.stage}`
        ],
        primaryOutputDirectory: '$CODEBUILD_SRC_DIR/infra/cdk.out'
      })
    });
    pipeline.addStage(
      new PipelineAppStage(this, 'app', {
        env: props.env
      })
    );
    pipeline.buildPipeline();
  }
}
