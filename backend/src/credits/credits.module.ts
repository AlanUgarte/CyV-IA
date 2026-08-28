import { Module } from '@nestjs/common';
import { CreditsController } from './credits.controller';
import { CreditsService } from './credits.service';
import { CostTrackingService } from './cost-tracking.service';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [UploadsModule],
  controllers: [CreditsController],
  providers: [CreditsService, CostTrackingService],
  exports: [CreditsService, CostTrackingService],
})
export class CreditsModule {}
