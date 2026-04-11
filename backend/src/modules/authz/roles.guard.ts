import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { AuthenticatedRequest } from './authenticated-request';
import { ROLES_KEY } from './roles.decorator';
import { STRICT_ROLES_KEY } from './strict-roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const strictRoles = this.reflector.getAllAndOverride<UserRole[]>(
      STRICT_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (
      (!strictRoles || strictRoles.length === 0) &&
      (!requiredRoles || requiredRoles.length === 0)
    ) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const currentUser = request.currentUser;

    if (!currentUser) {
      throw new UnauthorizedException('User context is not resolved');
    }

    if (strictRoles && strictRoles.length > 0) {
      return strictRoles.includes(currentUser.role);
    }

    return requiredRoles.includes(currentUser.role);
  }
}
