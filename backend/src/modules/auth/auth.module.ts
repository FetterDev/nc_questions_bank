import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthTokenService } from './auth-token.service';
import { JwtAuthMiddleware } from './jwt-auth.middleware';

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [AuthService, AuthTokenService, JwtAuthMiddleware],
  exports: [AuthTokenService, JwtAuthMiddleware],
})
export class AuthModule {}
