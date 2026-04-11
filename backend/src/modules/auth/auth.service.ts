import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { AuthTokenService } from './auth-token.service';
import { PasswordService } from './password.service';
import { normalizeLogin, validatePassword } from './auth.utils';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
    private readonly authTokenService: AuthTokenService,
  ) {}

  async login(dto: LoginDto) {
    const login = normalizeLogin(dto.login);
    const password = validatePassword(dto.password);
    const user = await this.usersService.findAuthUserByLogin(login);

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValidPassword = await this.passwordService.verifyPassword(
      user.passwordHash,
      password,
    );

    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const signed = this.authTokenService.signAccessToken({
      sub: user.id,
      role: user.role,
      login: user.login,
      ver: user.tokenVersion,
    });

    return {
      accessToken: signed.accessToken,
      expiresAt: this.authTokenService.getExpiresAtIso(signed.expiresAt),
      profile: this.usersService.toMeDto(user),
    };
  }
}
