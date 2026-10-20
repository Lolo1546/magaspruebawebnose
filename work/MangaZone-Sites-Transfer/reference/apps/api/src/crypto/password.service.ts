import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { PasswordPolicyError } from './errors/password-policy.error';
import { PasswordHashingError } from './errors/password-hashing.error';
import { InvalidStoredPasswordHashError } from './errors/invalid-password-hash.error';

@Injectable()
export class PasswordService {
  constructor(private config: ConfigService) {}

  private get policy() {
    // Definimos el tipo esperado basado en auth.config
    return (
      this.config.get<{
        minLength: number;
        maxLength: number;
        argon2: {
          type: 0 | 1 | 2;
          memoryCost: number;
          timeCost: number;
          parallelism: number;
          hashLength: number;
        };
      }>('password') ?? {
        minLength: 15,
        maxLength: 128,
        argon2: {
          type: 2,
          memoryCost: 19456,
          timeCost: 2,
          parallelism: 1,
          hashLength: 32,
        },
      }
    );
  }

  async hash(password: string): Promise<string> {
    const { minLength, maxLength, argon2: argon2Config } = this.policy;
    const length = Array.from(password).length;

    if (length < minLength || length > maxLength) {
      throw new PasswordPolicyError(
        `La contraseña debe tener entre ${minLength} y ${maxLength} caracteres.`,
      );
    }

    try {
      return await argon2.hash(password, argon2Config);
    } catch {
      throw new PasswordHashingError(
        'Error interno al generar el hash de la contraseña.',
      );
    }
  }

  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      throw new InvalidStoredPasswordHashError(
        'Formato de hash almacenado inválido o error en la verificación.',
      );
    }
  }

  needsRehash(hash: string): boolean {
    const { argon2: argon2Config } = this.policy;
    try {
      return argon2.needsRehash(hash, argon2Config);
    } catch {
      return true; // En caso de duda, forzar rehash
    }
  }
}
