import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { isIP } from 'node:net';

@Injectable()
export class ClientIpService {
  getClientIp(request: Request): string | null {
    let normalized = this.normalizeAndValidate(request.ip);
    if (normalized) {
      return normalized;
    }

    normalized = this.normalizeAndValidate(request.socket?.remoteAddress);
    if (normalized) {
      return normalized;
    }

    return null;
  }

  private normalizeAndValidate(rawIp: string | undefined): string | null {
    if (!rawIp || typeof rawIp !== 'string') {
      return null;
    }

    let ip = rawIp.trim();

    const percentIndex = ip.indexOf('%');
    if (percentIndex !== -1) {
      ip = ip.substring(0, percentIndex);
    }

    if (ip.startsWith('::ffff:')) {
      const ipv4 = ip.substring(7);
      if (isIP(ipv4) === 4) {
        ip = ipv4;
      }
    }

    if (isIP(ip) === 0) {
      return null;
    }

    if (ip.length > 45) {
      return null;
    }

    return ip;
  }
}
