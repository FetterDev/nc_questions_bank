import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './infra/prisma/prisma.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuthzModule } from './modules/authz/authz.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { HealthModule } from './modules/health/health.module';
import { InterviewsModule } from './modules/interviews/interviews.module';
import { QuestionChangeRequestsModule } from './modules/question-change-requests/question-change-requests.module';
import { QuestionsModule } from './modules/questions/questions.module';
import { SearchModule } from './modules/search/search.module';
import { TrainingModule } from './modules/training/training.module';
import { TopicsModule } from './modules/topics/topics.module';
import { UsersModule } from './modules/users/users.module';
import { JwtAuthMiddleware } from './modules/auth/jwt-auth.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    AuthzModule,
    AnalyticsModule,
    CompaniesModule,
    UsersModule,
    HealthModule,
    InterviewsModule,
    TopicsModule,
    QuestionsModule,
    QuestionChangeRequestsModule,
    SearchModule,
    TrainingModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(JwtAuthMiddleware)
      .exclude('health', 'auth/login')
      .forRoutes('*');
  }
}
