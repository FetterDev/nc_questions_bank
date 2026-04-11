import { Module } from '@nestjs/common';
import { CompaniesRepository } from './companies.repository';

@Module({
  providers: [CompaniesRepository],
  exports: [CompaniesRepository],
})
export class CompaniesAccessModule {}
