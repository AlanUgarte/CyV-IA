import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

// Responsable: TODO lo que use Magnific (video / animación de imágenes vía Kling).
@Injectable()
export class MagnificService {
  private readonly logger = new Logger(MagnificService.name);

  constructor(private readonly config: ConfigService) {}

  get enabled(): boolean {
    return !!(this.config.get<string>('magnific.apiKey') ?? '');
  }

  // Imagen → video. Devuelve una URL de MP4 hosteada. Async con polling.
  async generateVideo(imageBase64: string, animationPrompt: string, duration: '5' | '10' = '5'): Promise<string> {
    const key = this.config.get<string>('magnific.apiKey') ?? '';
    if (!key) throw new Error('MAGNIFIC_API_KEY no configurado en Railway → Variables.');

    const model   = this.config.get<string>('magnific.videoModel') ?? 'kling-v2';
    const base    = `https://api.magnific.com/v1/ai/image-to-video/${model}`;
    const image   = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const headers = { 'x-magnific-api-key': key, 'Content-Type': 'application/json' };

    this.logger.log(`[Magnific] ${model} — creando tarea (${duration}s)`);
    const create = await axios.post(base, {
      image, duration, prompt: animationPrompt, cfg_scale: 0.5,
    }, { headers, timeout: 30_000 });

    const taskId = create.data?.data?.task_id;
    if (!taskId) throw new Error('Magnific no devolvió task_id');

    const started = Date.now();
    while (Date.now() - started < 150_000) {
      await new Promise(r => setTimeout(r, 5_000));
      const st = await axios.get(`${base}/${taskId}`, { headers, timeout: 20_000 });
      const status = st.data?.data?.status;
      if (status === 'COMPLETED') {
        const d = st.data?.data;
        const url = d?.generated?.[0] ?? d?.video?.url ?? d?.result?.[0] ?? d?.url;
        if (!url) throw new Error('Magnific COMPLETED pero sin URL de video');
        this.logger.log(`[Magnific] listo: ${String(url).slice(0, 60)}`);
        return url;
      }
      if (status === 'FAILED') throw new Error('Magnific devolvió FAILED');
    }
    throw new Error('Magnific timeout (>150s)');
  }
}
