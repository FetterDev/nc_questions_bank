import { Request } from 'express';
import { UserContext } from './user-context';

export type AuthenticatedRequest = Request & {
  currentUser?: UserContext;
};
