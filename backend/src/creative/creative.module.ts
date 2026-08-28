import { Module } from '@nestjs/common';
import { UploadsModule } from '../uploads/uploads.module';
import { CreativeController } from './creative.controller';
import { CreativeService } from './creative.service';
import { OpenaiService } from './openai.service';
import { MagnificService } from './magnific.service';

@Module({
  imports: [UploadsModule],
  controllers: [CreativeController],
  providers: [CreativeService, OpenaiService, MagnificService],
  exports: [OpenaiService, MagnificService, CreativeService],
})
export class CreativeModule {}
