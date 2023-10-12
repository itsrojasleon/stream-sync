import { monotonicFactory } from 'ulid';

export const generateId = () => {
  const ulid = monotonicFactory();
  return ulid();
};
