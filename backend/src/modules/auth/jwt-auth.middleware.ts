import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../authz/authenticated-request';
import { AuthTokenService } from './auth-token.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtAuthMiddleware implements NestMiddleware {
  constructor(
    private readonly authTokenService: AuthTokenService,
    private readonly usersService: UsersService,
  ) {}

  async use(
    request: AuthenticatedRequest,
    _response: Response,
    next: NextFunction,
  ) {
    const token = this.readBearerToken(request);

    if (!token) {
      next();
      return;
    }

    const payload = this.authTokenService.verifyAccessToken(token);
    request.currentUser = await this.usersService.resolveAuthenticatedUser(
      payload,
    );
    next();
  }

  private readBearerToken(request: AuthenticatedRequest) {
    const header = request.header('authorization');

    if (!header?.trim()) {
      return null;
    }

    const [scheme, token] = header.split(/\s+/, 2);

    if (scheme?.toLowerCase() !== 'bearer' || !token?.trim()) {
      throw new UnauthorizedException('Authorization header must use Bearer token');
    }

    return token.trim();
  }
}
