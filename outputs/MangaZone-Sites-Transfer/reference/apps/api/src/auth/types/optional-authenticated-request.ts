import { Request } from 'express';
import { AuthenticatedRequestContext } from './authenticated-request-context.js';

export type OptionalAuthenticatedRequest = Request & {
  auth?: AuthenticatedRequestContext;
};
