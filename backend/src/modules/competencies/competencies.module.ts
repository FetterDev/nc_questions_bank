import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { CompetenciesController } from './competencies.controller';
import { CompetenciesRepository } from './competencies.repository';
import { CompetenciesService } from './competencies.service';

@Module({
  imports: [PrismaModule],
  controllers: [CompetenciesController],
  providers: [CompetenciesRepository, CompetenciesService],
  exports: [CompetenciesRepository, CompetenciesService],
})
export class CompetenciesModule {}
