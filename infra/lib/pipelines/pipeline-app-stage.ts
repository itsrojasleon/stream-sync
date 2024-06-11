import { Stage } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { StageProps } from '../../types';
import { PermissionsStack } from '../common/permissions-stack';
import { ReportsStack } from '../stacks/reports-stack';
import { UsersStack } from '../stacks/users-stack';

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
