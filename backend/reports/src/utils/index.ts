import { User } from '@/entity/user';
import { AttributeValue } from 'aws-lambda';

export const formatUserFromDynamoStream = (
  r: Record<string, AttributeValue>
): Omit<User, 'id'> => {
  return {
    name: r.name?.S || '',
    email: r.email?.S || '',
    age: parseInt(r.age?.N || '0', 10),
    company: r.company?.S || '',
    country: r.country?.S || ''
  };
};

const keyUserPrefix = 'user:';

export const getUserKey = (id: number) => `${keyUserPrefix}${id}`;
