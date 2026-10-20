import { Request } from 'express';
import { AuthenticatedRequestContext } from './authenticated-request-context.js';

export interface AuthenticatedRequest extends Request {
  auth?: AuthenticatedRequestContext;
}
