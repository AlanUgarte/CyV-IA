import { Injectable } from '@nestjs/common';
import { VideoProvider, VideoGenInput, VideoResult } from './types';
import { MagnificService } from '../magnific.service';

// Alternativa de video (Kling vía Magnific). Seleccionable con VIDEO_PROVIDER=magnific.
@Injectable()
export class MagnificVideoProvider implements VideoProvider {
  readonly name = 'magnific';
  constructor(private readonly magnific: MagnificService) {}
  get enabled(): boolean { return this.magnific.enabled; }
  async generate(input: VideoGenInput): Promise<VideoResult> {
    const url = await this.magnific.generateVideo(input.image, input.prompt, String(input.duration) as '5' | '10');
    return { url, model: 'kling-v2', seconds: input.duration };
  }
}
