import { Module } from '@nestjs/common';
import { PasswordService } from '../auth/password.service';
import { CompetenciesModule } from '../competencies/competencies.module';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  imports: [CompetenciesModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, PasswordService],
  exports: [UsersService, UsersRepository, PasswordService],
})
export class UsersModule {}
