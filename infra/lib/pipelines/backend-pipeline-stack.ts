import * as cdk from 'aws-cdk-lib';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipelineActions from 'aws-cdk-lib/aws-codepipeline-actions';
import { Construct } from 'constructs';
import { git } from '../../constants';
import { PipelineStackProps } from '../../types';

export class BackendPipelineStack extends cdk.Stack {
  services = ['users', 'reports'];

  constructor(scope: Construct, id: string, public props: PipelineStackProps) {
    super(scope, id, props);

    const { owner, repo, branches } = git;

    const sourceArtifact = new codepipeline.Artifact();

    const sourceAction =
      new codepipelineActions.CodeStarConnectionsSourceAction({
        actionName: 'Source',
        connectionArn: props.codestarConnectionArn,
        output: sourceArtifact,
        owner,
        repo,
        branch: branches[props.env.stage]
      });

    const deployActions = this.services.map((service) => {
      return this.createBuildAction(service, sourceArtifact);
    });

    const pipeline = new codepipeline.Pipeline(this, 'pipeline', {
      pipelineType: codepipeline.PipelineType.V2,
      stages: [
        {
          stageName: 'Source',
          actions: [sourceAction]
        },
        {
          stageName: 'Deploy',
          actions: deployActions
        }
      ]
    });

    // https://github.com/aws/aws-cdk/issues/29124#issuecomment-2134977965
    const cfnPipeline = pipeline.node.defaultChild as codepipeline.CfnPipeline;
    cfnPipeline.addPropertyOverride('Triggers', [
      {
        GitConfiguration: {
          Push: [
            {
              Branches: {
                Includes: ['main']
              },
              FilePaths: {
                Includes: ['backend/**']
              }
            }
          ],
          SourceActionName: 'Source'
        },
        ProviderType: 'CodeStarSourceConnection'
      }
    ]);
  }

  private createBuildProject(path: string) {
    return new codebuild.PipelineProject(this, `deploy${path}`, {
      buildSpec: codebuild.BuildSpec.fromSourceFilename(
        'backend/depl/buildspec.yml'
      ),
      environment: {
        environmentVariables: {
          STAGE: { value: this.props.env },
          SERVICE_PATH: { value: path }
        },
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_5 // TODO: Check if this is the right image.
      }
    });
  }

  private createBuildAction(path: string, input: codepipeline.Artifact) {
    const project = this.createBuildProject(path);

    return new codepipelineActions.CodeBuildAction({
      actionName: `deploy_${path}`,
      project,
      input
    });
  }
}
