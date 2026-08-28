import { Module } from '@nestjs/common';
import { UploadsModule } from '../uploads/uploads.module';
import { CreditsModule } from '../credits/credits.module';
import { CreativeController } from './creative.controller';
import { CreativeService } from './creative.service';
import { OpenaiService } from './openai.service';
import { MagnificService } from './magnific.service';
import { OpenAIImageProvider } from './providers/openai-image.provider';
import { OpenAICopyProvider } from './providers/openai-copy.provider';
import { SeedanceVideoProvider } from './providers/seedance-video.provider';
import { MagnificVideoProvider } from './providers/magnific-video.provider';
import { IMAGE_PROVIDER, VIDEO_PROVIDER, COPY_PROVIDER } from './providers/types';
import { PROVIDERS } from '../config/providers.config';

@Module({
  imports: [UploadsModule, CreditsModule],
  controllers: [CreativeController],
  providers: [
    CreativeService, OpenaiService, MagnificService,
    OpenAIImageProvider, OpenAICopyProvider, SeedanceVideoProvider, MagnificVideoProvider,
    // Selección de proveedor por config (el resto del sistema usa la interfaz)
    { provide: IMAGE_PROVIDER, useExisting: OpenAIImageProvider },
    { provide: COPY_PROVIDER, useExisting: OpenAICopyProvider },
    {
      provide: VIDEO_PROVIDER,
      useFactory: (seedance: SeedanceVideoProvider, magnific: MagnificVideoProvider) =>
        PROVIDERS.video === 'magnific' ? magnific : seedance,
      inject: [SeedanceVideoProvider, MagnificVideoProvider],
    },
  ],
  exports: [OpenaiService, MagnificService, CreativeService],
})
export class CreativeModule {}
