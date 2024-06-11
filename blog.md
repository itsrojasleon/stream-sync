# Building CI/CD pipelines with AWS CDK

In my personal experience I find building CI/CD pipelines within AWS a bit tricky.
This time I'll try to explain a practical example hoping I can make things a little more clear for you.
We're gonna be working with an existing project that contains logic for two microservices: `users` and `reports` that communicate each other uising an event-driven architecture.

Here's the current structure.

- [github repo](https://github.com/itsrojasleon/stream-sync)
  - /backend => Microservices (serverless framework projects)
    - /users (micro 1)
    - /reports (micro 2)
  - /infra => CDK project => AWS resources for the microservices

All the infrastructure resources such as dynamodb tables, rds databases, redis instances, etc that the microservices need are inside the `infra` project.
The `backend` project contains the microservices that will be deployed to AWS Lambda. Don't focus on the bussiness logic of the services, they're just examples.

As you can see we're using an approach in where all `infra` resources and `backend` ones are separated; here's a great [guide](https://dev.to/aws-builders/combining-serverless-framework-aws-cdk-1dg0) that I think it will help you understand why separating both worlds can bring huge benefits into the table.
Basically the `infra` project creates all the resources and then the `backend` project uses them.

## Getting started

We'll build two pipelines, one for the infra resources and another one for the backend microservices.
Both pipelines will live in the `infra` project since from my prespective all related components are infrastructure resources.

Every time we push git changes to the infra folder, the infra pipeline will be triggered to deploy resources, and similarly, changes to the backend folder will trigger the backend pipeline to deploy microservices.
So let's create a Github connection in our infra project to be able to trigger the pipelines. We'll be reusing this connection for both pipelines since it's gonna be the same repository.
The service we will use is CodeStarConnections, which is a service that allows you to connect your AWS resources to a third-party service provider such as GitHub, Bitbucket, or GitLab.
Create a new folder called `pipelines` inside the `infra/lib` folder. There we'll create a new file called `codestart-connection-stack.ts` which will contain the code to create the connection.

```ts
// infra/lib/pipelines/codestar-connection-stack.ts
export class CodestarConnectionStack extends cdk.Stack {
  codestarConnection: codestarconnections.CfnConnection;
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    this.codestarConnection = new codestarconnections.CfnConnection(
      this,
      'codestarConnection',
      {
        connectionName: `github-connection-${props.env.stage}`,
        providerType: 'GitHub'
      }
    );
  }
}
```

As you can see we're creating a new connection with the name `github-connection-${props.env.stage}`. The `providerType` is set to `GitHub` since we're gonna be using Github as our source provider. Also keep an eye on the codestarConnection variable, we'll be using it later in the pipelines.

Here's an important gotcha you need to consider. The CDK library provides two main ways to create pipelines

- When using `pipelines.CodePipeline` from the package `aws-cdk-lib/pipelines` it provides a high-level abstraction that simplifies the creation and management of pipelines.
  - We'll be using this one for the infra pipeline.
- When using `codepipeline.Pipeline` from the package `aws-cdk-lib/aws-codepipeline` it provides more granular control over the configuration and behavior of the pipeline.
  - We'll be using this one for the backend pipeline.

Also worth mentioning that we'll be using pipelineType `V2` for both pipelines since it's the latest version of the pipeline and allow us to work with monorepos. If you have the infra project in one repo and the backend project in another repo you can use the `V1` version since it won't add a lot of extra benefits.

### Backend pipeline

Currently the way we deploy the microservices is by installing dependencies, setting up AWS environment variables and then running `serverless deploy` in each folder. Let's automate this process.

```ts
// infra/pipelines/backend-pipeline-stack.ts
export class BackendPipelineStack extends cdk.Stack {
  services = ['users', 'reports'];

  constructor(scope: Construct, id: string, public props: PipelineStackProps) {
    super(scope, id, props);

    const { owner, repo, branches } = git;

    const sourceArtifact = new codepipeline.Artifact();

    const sourceAction =
      new codepipelineActions.CodeStarConnectionsSourceAction({
        actionName: 'Source',
        owner,
        repo,
        connectionArn: props.codestarConnectionArn,
        output: sourceArtifact,
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
    // Workaround to add triggers to the pipeline.
    const cfnPipeline = pipeline.node.defaultChild as codepipeline.CfnPipeline;
    cfnPipeline.addPropertyOverride('Triggers', [
      {
        GitConfiguration: {
          Push: [
            {
              Branches: {
                Includes: [branches.prod]
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
    return new codebuild.PipelineProject(this, `deploy_${path}`, {
      buildSpec: codebuild.BuildSpec.fromSourceFilename(
        `backend/${path}/buildspec.yml`
      ),
      environment: {
        environmentVariables: {
          STAGE: {
            value: this.props.env.stage
          },
          SERVICE_PATH: {
            value: `backend/${path}`
          }
        },
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_ARM_3
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
```

In this file we're creating a new pipeline with two stages: `Source` and `Deploy`. The `Source` stage is responsible for fetching the code from the Github repository and the `Deploy` stage is responsible for deploying the microservices. There are two actions in the `Deploy` stage, one for each microservice. The `createBuildAction` method creates a new CodeBuild action and the `createBuildProject` method creates a new CodeBuild project for each microservice as well.
Something important to remember is that `stages` run in sequence and actions inside a stage run in parallel, so in our case the `Source` stage will run first, then the `Deploy` stage will run and both microservices will be deployed in parallel since they don't depend on each other.

### Infra pipeline

Currently the way we deploy the infra resources is by running `cdk deploy` in the `infra` folder and specyfing the stack name or all the stacks we want to deploy. Let's automate this process.

```ts
// infra/pipelines/infra-pipeline-stack.ts
export class InfraPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, public props: PipelineStackProps) {
    super(scope, id, props);

    const { owner, repo, branches } = git;

    const pipeline = new pipelines.CodePipeline(this, 'pipeline', {
      codeBuildDefaults: {
        buildEnvironment: {
          buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_ARM_3
        }
      },
      synth: new pipelines.ShellStep('synth', {
        input: pipelines.CodePipelineSource.connection(
          `${owner}/${repo}/infra`,
          branches[props.env.stage],
          {
            connectionArn: props.codestarConnectionArn
          }
        ),
        installCommands: ['cd infra', 'npm install'],
        commands: [
          'npm run build',
          `npx cdk synth -c stage=${props.env.stage}`
        ],
        primaryOutputDirectory: 'infra/cdk.out'
      }),
      selfMutation: false
    });
    pipeline.addStage(
      new PipelineAppStage(this, 'app', {
        env: props.env
      })
    );
    pipeline.buildPipeline();
  }
}
```

In this file we're creating a new pipeline with two stages: `Source` and `Deploy`. The `Source` stage is responsible for fetching the code from the Github repository and the `Deploy` stage is responsible for deploying the infra resources. The `synth` step is responsible for synthesizing the CDK app and the `PipelineAppStage` stage is responsible for deploying the infra resources.
Don't worry about the `PipelineAppStage` class, it's just a class that extends `Stage` and contains the logic to deploy the infra resources. Here's the logic for the `PipelineAppStage` class.

```ts
export class PipelineAppStage extends Stage {
  constructor(scope: Construct, id: string, props: StageProps) {
    super(scope, id, props);

    const reportsStack = new ReportsStack(
      this,
      `reportsStack-${props.env.stage}`,
      { env: props.env }
    );

    const usersStack = new UsersStack(this, `usersStack-${props.env.stage}`, {
      env: props.env
    });

    reportsStack.addDependency(usersStack);

    const permissionsStack = new PermissionsStack(
      this,
      `permissionsStack-${props.env.stage}`,
      {
        env: props.env,
        usersPolicyStatements: usersStack.policyStatements,
        reportsPolicyStatements: reportsStack.policyStatements
      }
    );

    permissionsStack.addDependency(usersStack);
    permissionsStack.addDependency(reportsStack);
  }
}
```

In this file we're creating a new stage with three stacks: `ReportsStack`, `UsersStack`, and `PermissionsStack`. The `ReportsStack` and `UsersStack` stacks are responsible for creating the infra resources for the microservices and the `PermissionsStack` stack is responsible for creating the permissions for the microservices. The `PermissionsStack` stack depends on the `ReportsStack` and `UsersStack` stacks since it needs to create the permissions after the infra resources have been created.

### Deployment

Once we have both pipelines in place it means we can start deploying them into AWS. Here you have some options and everything depends on the needs of you or your teams requires, for exmaple you can have a `testing` version in one AWS account and the production environment will be in another account; or you can have both versions in the same AWS account. My recommendation and what the other people will say is that you should use two different accounts per version so you can take the advantange of scaling independently without the worry of consuming all resources that a single account provides.
Start by updating your entry file `infra.ts` to include the new stacks and exclude the old ones.

```ts
// infra/bin/infra.ts
const { codestarConnection } = new CodestarConnectionStack(
  app,
  `codestarConnectionStack-${stage}`,
  {
    env
  }
);

new BackendPipelineStack(app, `backendPipelineStack-${stage}`, {
  codestarConnectionArn: codestarConnection.attrConnectionArn,
  env
});

new InfraPipelineStack(app, `infraPipelineStack-${stage}`, {
  codestarConnectionArn: codestarConnection.attrConnectionArn,
  env
});
```

[Stacks](https://docs.aws.amazon.com/cdk/v2/guide/stacks.html)

[Codestart allowed values](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-codestarconnections-connection.html#cfn-codestarconnections-connection-providertype)

[Triggers](https://docs.aws.amazon.com/codepipeline/latest/userguide/pipelines-filter.html)
