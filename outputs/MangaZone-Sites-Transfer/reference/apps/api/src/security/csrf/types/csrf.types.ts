export type MutatingHttpMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface CsrfTokenPayload {
  version: 'v1';
  sessionId: string;
}

export type CsrfFailureReason =
  | 'ORIGIN_MISSING'
  | 'ORIGIN_INVALID'
  | 'ORIGIN_NOT_ALLOWED'
  | 'TOKEN_MISSING'
  | 'TOKEN_MULTIPLE'
  | 'TOKEN_TOO_LONG'
  | 'TOKEN_MALFORMED'
  | 'TOKEN_VERSION_INVALID'
  | 'TOKEN_SIGNATURE_INVALID'
  | 'SESSION_MISMATCH'
  | 'AUTH_CONTEXT_MISSING'
  | 'TOKEN_INVALID';

export interface OriginValidationInput {
  method: string;
  originHeader?: string | string[];
  refererHeader?: string | string[];
  allowedOrigins: string[];
}

export interface OriginValidationResult {
  allowed: boolean;
  reason?: CsrfFailureReason;
}
