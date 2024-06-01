import { Branch, Stages } from './types';

type GitConfig = {
  branches: Record<Stages, Branch>;
  owner: string;
  repo: string;
};

export const git: GitConfig = {
  owner: 'itsrojasleon',
  branches: {
    [Stages.Test]: 'test',
    [Stages.Prod]: 'main'
  },
  repo: 'stream-sync'
};
