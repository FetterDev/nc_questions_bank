import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { CompetencyMatrixController } from './competency-matrix.controller';
import { CompetencyMatrixRepository } from './competency-matrix.repository';
import { CompetencyMatrixService } from './competency-matrix.service';

@Module({
  imports: [PrismaModule],
  controllers: [CompetencyMatrixController],
  providers: [CompetencyMatrixRepository, CompetencyMatrixService],
})
export class CompetencyMatrixModule {}
