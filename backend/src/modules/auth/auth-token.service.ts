import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import { ALL_ROLES } from '../authz/role-groups';

export type AccessTokenPayload = {
  sub: string;
  role: UserRole;
  login: string;
  ver: number;
};

@Injectable()
export class AuthTokenService {
  constructor(private readonly configService: ConfigService) {}

  signAccessToken(payload: AccessTokenPayload) {
    const secret = this.getJwtSecret();
    const ttlHours = this.getTtlHours();
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
    const accessToken = jwt.sign(payload, secret, {
      algorithm: 'HS256',
      expiresIn: `${ttlHours}h`,
    });

    return {
      accessToken,
      expiresAt,
    };
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    try {
      const decoded = jwt.verify(token, this.getJwtSecret(), {
        algorithms: ['HS256'],
      });

      if (!decoded || typeof decoded !== 'object') {
        throw new UnauthorizedException('Invalid access token');
      }

      const payload = decoded as Partial<AccessTokenPayload>;
      const role = payload.role as UserRole | undefined;

      if (
        typeof payload.sub !== 'string' ||
        typeof payload.login !== 'string' ||
        typeof payload.ver !== 'number' ||
        !role ||
        !ALL_ROLES.includes(role)
      ) {
        throw new UnauthorizedException('Invalid access token payload');
      }

      return {
        sub: payload.sub,
        login: payload.login,
        role,
        ver: payload.ver,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Access token is invalid or expired');
    }
  }

  getExpiresAtIso(expiresAt: Date) {
    return expiresAt.toISOString();
  }

  private getJwtSecret() {
    const secret = this.configService.get<string>('JWT_SECRET');

    if (!secret?.trim()) {
      throw new Error('JWT_SECRET is not configured');
    }

    return secret;
  }

  private getTtlHours() {
    const raw = this.configService.get<string>('JWT_TTL_HOURS');
    const parsed = Number(raw ?? 8);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error('JWT_TTL_HOURS must be a positive number');
    }

    return parsed;
  }
}
