import { Branch, Stages } from './types';

type GitConfig = {
  branches: Record<Stages, Branch>;
  owner: string;
  repos: {
    backend: string;
    infra: string;
  };
};

export const git: GitConfig = {
  owner: 'itsrojasleon',
  branches: {
    [Stages.Test]: 'test',
    [Stages.Prod]: 'main'
  },
  repos: {
    backend: 'cdk-pipelines-backend',
    infra: 'cdk-pipelines-infra'
  }
};
