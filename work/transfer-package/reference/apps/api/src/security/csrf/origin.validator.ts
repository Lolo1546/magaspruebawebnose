import { Injectable } from '@nestjs/common';
import {
  MutatingHttpMethod,
  OriginValidationInput,
  OriginValidationResult,
} from './types/csrf.types';

@Injectable()
export class OriginValidator {
  private readonly SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
  private readonly MUTATING_METHODS = new Set<MutatingHttpMethod>([
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
  ]);

  validate(input: OriginValidationInput): OriginValidationResult {
    const method = input.method.toUpperCase();

    if (this.SAFE_METHODS.has(method)) {
      return { allowed: true };
    }

    if (!this.MUTATING_METHODS.has(method as MutatingHttpMethod)) {
      // Reject unknown methods to be safe
      return { allowed: false, reason: 'ORIGIN_INVALID' };
    }

    const { originHeader, refererHeader, allowedOrigins } = input;

    if (originHeader !== undefined) {
      if (typeof originHeader !== 'string') {
        return { allowed: false, reason: 'ORIGIN_INVALID' };
      }

      if (originHeader.trim() === '' || originHeader === 'null') {
        return { allowed: false, reason: 'ORIGIN_INVALID' };
      }

      let parsedOrigin: URL;
      try {
        parsedOrigin = new URL(originHeader);
      } catch {
        return { allowed: false, reason: 'ORIGIN_INVALID' };
      }

      if (allowedOrigins.includes(parsedOrigin.origin)) {
        return { allowed: true };
      }

      return { allowed: false, reason: 'ORIGIN_NOT_ALLOWED' };
    }

    if (refererHeader !== undefined) {
      if (typeof refererHeader !== 'string') {
        return { allowed: false, reason: 'ORIGIN_INVALID' };
      }

      let parsedReferer: URL;
      try {
        parsedReferer = new URL(refererHeader);
      } catch {
        return { allowed: false, reason: 'ORIGIN_INVALID' };
      }

      if (allowedOrigins.includes(parsedReferer.origin)) {
        return { allowed: true };
      }

      return { allowed: false, reason: 'ORIGIN_NOT_ALLOWED' };
    }

    return { allowed: false, reason: 'ORIGIN_MISSING' };
  }
}
