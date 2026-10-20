import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class TokenService {
  generateToken(byteLength = 32): { raw: string; hash: string } {
    const raw = crypto.randomBytes(byteLength).toString('base64url');
    const hash = this.hashToken(raw);
    return { raw, hash };
  }

  hashToken(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  compareTokens(a: string, b: string): boolean {
    // Evita throw por longitudes distintas en timingSafeEqual
    if (a.length !== b.length) {
      return false;
    }
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }
}
