import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, UserRole, UserStatus } from '@prisma/client';
import { UserContext } from '../authz/user-context';
import type { AccessTokenPayload } from '../auth/auth-token.service';
import { PasswordService } from '../auth/password.service';
import {
  normalizeOptionalEmail,
  validateLogin,
  validatePassword,
} from '../auth/auth.utils';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users.query.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly passwordService: PasswordService,
  ) {}

  async resolveAuthenticatedUser(
    payload: AccessTokenPayload,
  ): Promise<UserContext> {
    const user = await this.usersRepository.findById(payload.sub);

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User is not active');
    }

    if (
      user.tokenVersion !== payload.ver ||
      user.role !== payload.role ||
      user.login !== payload.login
    ) {
      throw new UnauthorizedException('Access token is stale');
    }

    return this.toUserContext(user);
  }

  getMe(currentUser: UserContext) {
    return this.toMeDto(currentUser);
  }

  async findAuthUserByLogin(login: string) {
    return this.usersRepository.findByLogin(login);
  }

  async list(query: ListUsersQueryDto) {
    const startedAt = Date.now();
    const result = await this.usersRepository.list({
      q: query.q?.trim() || undefined,
      role: query.role,
      status: query.status,
      limit: query.limit ?? 50,
      offset: query.offset ?? 0,
    });

    return {
      items: result.items.map((item) => this.toUserDto(item)),
      total: result.total,
      meta: {
        tookMs: Date.now() - startedAt,
        appliedFilters: {
          q: query.q?.trim() || null,
          role: query.role ?? null,
          status: query.status ?? null,
        },
      },
    };
  }

  async create(dto: CreateUserDto) {
    const login = validateLogin(dto.login);
    const password = validatePassword(dto.password);
    const email = normalizeOptionalEmail(dto.email);
    const displayName = this.normalizeDisplayName(dto.displayName);
    const passwordHash = await this.passwordService.hashPassword(password);

    try {
      const created = await this.usersRepository.create({
        login,
        passwordHash,
        displayName,
        email,
        role: dto.role,
      });

      return this.toUserDto(created);
    } catch (error) {
      this.rethrowUniqueViolation(error);
    }
  }

  async update(id: string, dto: UpdateUserDto, currentUser: UserContext) {
    const existing = await this.requireUser(id);
    const nextRole = dto.role ?? existing.role;

    this.ensureSelfRoleChangeIsAllowed(existing, nextRole, currentUser);
    await this.ensureAdminRoleCanBeRemoved(existing, nextRole);

    try {
      const updated = await this.usersRepository.update(id, {
        displayName:
          dto.displayName !== undefined
            ? this.normalizeDisplayName(dto.displayName)
            : undefined,
        email: dto.email !== undefined ? normalizeOptionalEmail(dto.email) : undefined,
        role: dto.role,
        incrementTokenVersion: dto.role !== undefined && dto.role !== existing.role,
      });

      return this.toUserDto(updated);
    } catch (error) {
      this.rethrowUniqueViolation(error);
    }
  }

  async resetPassword(
    id: string,
    dto: ResetUserPasswordDto,
  ) {
    await this.requireUser(id);
    const passwordHash = await this.passwordService.hashPassword(
      validatePassword(dto.password),
    );
    const updated = await this.usersRepository.update(id, {
      passwordHash,
      incrementTokenVersion: true,
    });

    return this.toUserDto(updated);
  }

  async deactivate(id: string, currentUser: UserContext) {
    const existing = await this.requireUser(id);

    if (existing.id === currentUser.id) {
      throw new ForbiddenException('Self deactivation is forbidden');
    }

    if (existing.status === UserStatus.DISABLED) {
      return this.toUserDto(existing);
    }

    await this.ensureActiveAdminCanBeDisabled(existing);

    const updated = await this.usersRepository.update(id, {
      status: UserStatus.DISABLED,
      incrementTokenVersion: true,
    });

    return this.toUserDto(updated);
  }

  async activate(id: string) {
    await this.requireUser(id);
    const updated = await this.usersRepository.update(id, {
      status: UserStatus.ACTIVE,
      incrementTokenVersion: true,
    });

    return this.toUserDto(updated);
  }

  toMeDto(currentUser: {
    id: string;
    login: string;
    email: string | null;
    displayName: string;
    role: UserRole;
    status: UserStatus;
  }) {
    return {
      id: currentUser.id,
      login: currentUser.login,
      email: currentUser.email,
      displayName: currentUser.displayName,
      role: currentUser.role,
      status: currentUser.status,
    };
  }

  toUserDto(user: Awaited<ReturnType<UsersRepository['findById']>>) {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      login: user.login,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private toUserContext(user: NonNullable<Awaited<ReturnType<UsersRepository['findById']>>>) {
    return {
      id: user.id,
      login: user.login,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      status: user.status,
    };
  }

  private async requireUser(id: string) {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`User with id '${id}' not found`);
    }

    return user;
  }

  private normalizeDisplayName(value: string) {
    const normalized = value.trim();

    if (!normalized) {
      throw new BadRequestException('Display name cannot be empty');
    }

    return normalized;
  }

  private ensureSelfRoleChangeIsAllowed(
    existing: NonNullable<Awaited<ReturnType<UsersRepository['findById']>>>,
    nextRole: UserRole,
    currentUser: UserContext,
  ) {
    if (existing.id === currentUser.id && nextRole !== existing.role) {
      throw new ForbiddenException('Self role change is forbidden');
    }
  }

  private async ensureAdminRoleCanBeRemoved(
    existing: NonNullable<Awaited<ReturnType<UsersRepository['findById']>>>,
    nextRole: UserRole,
  ) {
    if (
      existing.role !== UserRole.ADMIN ||
      nextRole === UserRole.ADMIN ||
      existing.status !== UserStatus.ACTIVE
    ) {
      return;
    }

    const activeAdmins = await this.usersRepository.countActiveAdmins();

    if (activeAdmins <= 1) {
      throw new ConflictException('At least one active admin must remain');
    }
  }

  private async ensureActiveAdminCanBeDisabled(
    existing: NonNullable<Awaited<ReturnType<UsersRepository['findById']>>>,
  ) {
    if (
      existing.role !== UserRole.ADMIN ||
      existing.status !== UserStatus.ACTIVE
    ) {
      return;
    }

    const activeAdmins = await this.usersRepository.countActiveAdmins();

    if (activeAdmins <= 1) {
      throw new ConflictException('At least one active admin must remain');
    }
  }

  private rethrowUniqueViolation(error: unknown): never {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      const prismaError = error as Prisma.PrismaClientKnownRequestError;
      const target = Array.isArray(prismaError.meta?.target)
        ? prismaError.meta?.target.join(', ')
        : 'login or email';

      throw new ConflictException(`User with duplicate ${target} already exists`);
    }

    throw error;
  }
}
