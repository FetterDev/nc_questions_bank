import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PASSWORD_RESET_PLACEHOLDER } from './auth.constants';

@Injectable()
export class PasswordService {
  hashPassword(password: string) {
    return argon2.hash(password, {
      type: argon2.argon2id,
    });
  }

  async verifyPassword(passwordHash: string, password: string) {
    if (passwordHash === PASSWORD_RESET_PLACEHOLDER) {
      throw new UnauthorizedException('Invalid credentials');
    }

    try {
      return await argon2.verify(passwordHash, password);
    } catch {
      throw new UnauthorizedException('Invalid credentials');
    }
  }
}
