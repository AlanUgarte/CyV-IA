import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { CommonModule } from './common/common.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { CreativesModule } from './creatives/creatives.module';
import { MetaAdsModule } from './meta-ads/meta-ads.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { PaymentsModule } from './payments/payments.module';
import { AiModule } from './ai/ai.module';
import { ReportsModule } from './reports/reports.module';
import { AdminModule } from './admin/admin.module';
import { HealthModule } from './health/health.module';
import { UploadsModule } from './uploads/uploads.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { GenerativeModule } from './generative/generative.module';
import { CreativeModule } from './creative/creative.module';
import { CreditsModule } from './credits/credits.module';
import { WorkspaceModule } from './workspace/workspace.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import configuration from './config/configuration';

@Module({
  imports: [
    // ── Config (global) ─────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),

    // ── Rate limiting ────────────────────────────────────────────────────────
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          name: 'short',
          ttl: 1000,
          limit: 10,
        },
        {
          name: 'medium',
          ttl: 60_000,
          limit: 100,
        },
        {
          name: 'long',
          ttl: 3_600_000,
          limit: 1000,
        },
      ],
    }),

    // ── Scheduler (cron jobs) ────────────────────────────────────────────────
    ScheduleModule.forRoot(),

    // ── Core ─────────────────────────────────────────────────────────────────
    CommonModule,
    DatabaseModule,
    AuthModule,
    UsersModule,

    // ── Business ──────────────────────────────────────────────────────────────
    CampaignsModule,
    CreativesModule,
    MetaAdsModule,
    WhatsappModule,
    PaymentsModule,
    AiModule,
    ReportsModule,
    AdminModule,
    HealthModule,
    UploadsModule,
    IntegrationsModule,
    GenerativeModule,
    CreativeModule,
    CreditsModule,
    WorkspaceModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
