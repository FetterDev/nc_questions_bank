import { Module } from '@nestjs/common';
import { QuestionChangeRequestsAccessModule } from '../question-change-requests/question-change-requests-access.module';
import { CompaniesAccessModule } from './companies-access.module';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';

@Module({
  imports: [CompaniesAccessModule, QuestionChangeRequestsAccessModule],
  controllers: [CompaniesController],
  providers: [CompaniesService],
  exports: [CompaniesService, CompaniesAccessModule],
})
export class CompaniesModule {}
