import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../database/database.module';
import { StorageService } from '../uploads/storage.service';
import { OpenaiService, Fmt } from './openai.service';
import { IMAGE_PROVIDER, VIDEO_PROVIDER, ImageProvider, VideoProvider } from './providers/types';

// ── Catálogos (concepto → guía para GPT) ─────────────────────────────────────
export const OBJECTIVES: Record<string, string> = {
  vender:       'conversión directa a venta, urgencia, foco en el producto y el precio',
  promocionar:  'promoción de una oferta/descuento, destacar el ahorro',
  lanzamiento:  'presentar un producto nuevo, expectativa y novedad',
  clientes:     'generar consultas y leads, foco en el beneficio y el contacto',
  redes:        'contenido para Instagram/TikTok/Facebook, scroll-stopper, estético',
  whatsapp:     'iniciar conversaciones por WhatsApp, CTA directo a chatear',
};

export const STYLES: Record<string, string> = {
  profesional: 'professional commercial photography, clean, trustworthy',
  premium:     'luxury premium look, dramatic lighting, high-end',
  minimalista: 'minimalist, lots of negative space, single focal point',
  moderno:     'modern trendy design, bold gradients, contemporary',
  oferta:      'aggressive sale energy, bold colors, big-discount vibe',
  ecommerce:   'clean e-commerce product shot, white/neutral background',
  social:      'social media native, vibrant, thumb-stopping',
  elegante:    'elegant sophisticated, refined palette',
  juvenil:     'youthful, playful, energetic colors',
  tecnologico: 'tech aesthetic, particles, dynamic lighting, cinematic',
  gastronomico:'appetizing food photography, warm lighting, fresh',
  automotriz:  'automotive cinematic, reflections, dynamic lighting',
  retail:      'retail product hero, dynamic, eye-catching',
};

const VARIANT_ANGLES = [
  { key: 'oferta',  label: 'Oferta / Conversión', desc: 'Enfocada en venta y urgencia' },
  { key: 'premium', label: 'Premium',              desc: 'Look sofisticado y aspiracional' },
  { key: 'social',  label: 'Social Media',         desc: 'Nativa para redes, scroll-stopper' },
];

export interface ProductInfo {
  name: string; category?: string; description?: string; features?: string[];
  audience?: string; colors?: string[]; context?: string;
  price?: string; oldPrice?: string; discount?: string; cta?: string;
}

@Injectable()
export class CreativeService {
  private readonly logger = new Logger(CreativeService.name);

  constructor(
    @Inject(DATABASE_POOL) private readonly db: Pool,
    private readonly openai: OpenaiService,              // "cerebro" de texto/visión
    @Inject(IMAGE_PROVIDER) private readonly imageProvider: ImageProvider,
    @Inject(VIDEO_PROVIDER) private readonly videoProvider: VideoProvider,
    private readonly storage: StorageService,
  ) {}

  // ── PASO 1: Analizar producto (texto y/o foto) ──────────────────────────────
  async analyzeProduct(input: { name?: string; description?: string; imageBase64?: string }): Promise<ProductInfo> {
    const sys = 'Sos un estratega de marketing. Analizás un producto para publicidad en Latinoamérica.';
    const schema = '{ "name": string, "category": string, "description": string, "features": string[], "audience": string, "colors": string[], "context": string }';

    if (input.imageBase64) {
      const info = await this.openai.chatVisionJSON<ProductInfo>(
        sys,
        `Analizá esta foto de producto y completá: nombre probable, categoría, descripción breve, características visuales, público objetivo, colores dominantes y contexto comercial. Formato JSON: ${schema}`,
        input.imageBase64,
      );
      return { ...info, name: info.name || input.name || 'Producto' };
    }

    const info = await this.openai.chatJSON<ProductInfo>(
      sys,
      `Producto: "${input.name ?? ''}". Descripción: "${input.description ?? ''}". Completá la información faltante para una campaña. JSON: ${schema}`,
    );
    return { ...info, name: info.name || input.name || 'Producto' };
  }

  // ── PASO 2+3: Estrategia creativa (elige estilo si es "auto") ───────────────
  async buildStrategy(input: { product: ProductInfo; objective: string; style: string }) {
    const objGuide = OBJECTIVES[input.objective] ?? OBJECTIVES.vender;
    const styleHint = input.style === 'auto'
      ? `Elegí el mejor estilo entre: ${Object.keys(STYLES).join(', ')}.`
      : `Estilo elegido: ${input.style} (${STYLES[input.style] ?? ''}).`;

    return this.openai.chatJSON<{ chosenStyle: string; concept: string; angle: string; toneNotes: string }>(
      'Sos director creativo publicitario. Definís el concepto de una campaña.',
      `Producto: ${JSON.stringify(input.product)}. Objetivo: ${input.objective} (${objGuide}). ${styleHint}
Devolvé JSON: { "chosenStyle": string (una de las claves de estilo), "concept": string (concepto creativo en 1-2 frases), "angle": string (ángulo principal), "toneNotes": string }`,
    );
  }

  // ── PASO 4: 3 variantes de imagen (GPT arma cada prompt visual → gpt-image) ──
  async generateImageVariants(input: {
    product: ProductInfo; objective: string; style: string; format: Fmt;
    quality?: 'standard' | 'premium'; referenceImage?: string;
  }): Promise<Array<{ key: string; label: string; description: string; prompt: string; url: string; model: string }>> {
    const styleDesc = STYLES[input.style] ?? STYLES.profesional;
    const objGuide = OBJECTIVES[input.objective] ?? OBJECTIVES.vender;

    // 1 sola llamada GPT arma los 3 prompts visuales (barato)
    const prompts = await this.openai.chatJSON<Array<{ key: string; prompt: string }>>(
      'Sos experto en dirección de arte para Meta Ads. Escribís prompts visuales en inglés para un modelo de imágenes.',
      `Producto: ${JSON.stringify(input.product)}. Objetivo: ${objGuide}. Estilo base: ${styleDesc}.
Escribí 3 prompts visuales EN INGLÉS, uno por ángulo (${VARIANT_ANGLES.map(v => v.key).join(', ')}). Cada prompt debe contemplar: composición, iluminación, fondo, posición del producto, colores, jerarquía visual, espacio para texto publicitario, sin watermarks, formato ad vertical.
JSON: [ { "key": "oferta", "prompt": "..." }, { "key": "premium", "prompt": "..." }, { "key": "social", "prompt": "..." } ]`,
      700,
    );

    const out: Array<{ key: string; label: string; description: string; prompt: string; url: string; model: string }> = [];
    for (const angle of VARIANT_ANGLES) {
      const p = prompts.find(x => x.key === angle.key)?.prompt
        ?? `${input.product.name}, ${styleDesc}, ${angle.desc}, professional Meta Ads creative, photorealistic, no watermark`;
      const r = await this.imageProvider.generate({ prompt: p, format: input.format, quality: input.quality ?? 'standard', referenceImage: input.referenceImage });
      const url = await this.persist(r.dataUrl, 'image');
      out.push({ key: angle.key, label: angle.label, description: angle.desc, prompt: p, url, model: r.model });
    }
    return out;
  }

  // Regenerar UNA sola imagen (para "no me gusta esta variante")
  async generateSingleImage(input: { product: ProductInfo; objective: string; style: string; format: Fmt; angleKey?: string; quality?: 'standard' | 'premium'; referenceImage?: string }) {
    const styleDesc = STYLES[input.style] ?? STYLES.profesional;
    const angle = VARIANT_ANGLES.find(a => a.key === input.angleKey) ?? VARIANT_ANGLES[0];
    const prompt = await this.openai.chat(
      'Sos experto en dirección de arte para Meta Ads. Escribís UN prompt visual en inglés.',
      `Producto: ${JSON.stringify(input.product)}. Estilo: ${styleDesc}. Ángulo: ${angle.label} (${angle.desc}). Un prompt visual en inglés, con composición/iluminación/fondo/espacio para texto, sin watermark.`,
      250,
    );
    const r = await this.imageProvider.generate({ prompt: prompt.trim() || `${input.product.name}, ${styleDesc}`, format: input.format, quality: input.quality ?? 'standard', referenceImage: input.referenceImage });
    const url = await this.persist(r.dataUrl, 'image');
    return { key: angle.key, label: angle.label, description: angle.desc, prompt: prompt.trim(), url, model: r.model };
  }

  // ── PASO 5: Video (GPT arma la animación según el producto → VideoProvider) ──
  async generateVideo(input: { imageBase64: string; product: ProductInfo; style: string; duration: '5' | '10' }) {
    const animation = await this.openai.chat(
      'Sos director de cine publicitario. Describís el movimiento de cámara/animación para animar una imagen de producto.',
      `Producto: ${input.product.name} (categoría: ${input.product.category ?? 'general'}). Estilo: ${input.style}.
Escribí en INGLÉS una instrucción de animación ESPECÍFICA para este tipo de producto (no genérica). Ej: gastronómico→vapor y movimiento de ingredientes; automotriz→travelling y reflejos; tecnológico→partículas e iluminación cinematográfica; retail→zoom y movimiento del producto. Máximo 2 frases, solo el movimiento.`,
      150,
    );
    const r = await this.videoProvider.generate({
      image: input.imageBase64,
      prompt: animation.trim() || 'smooth cinematic camera movement, subtle zoom',
      duration: Number(input.duration) as 5 | 10,
      resolution: '1080p',
    });
    return { videoUrl: r.url, animationPrompt: animation.trim(), model: r.model, seconds: r.seconds };
  }

  // ── PASO 6: Copy publicitario (3 variantes) ─────────────────────────────────
  async generateCopy(input: { product: ProductInfo; objective: string; style: string }) {
    const objGuide = OBJECTIVES[input.objective] ?? OBJECTIVES.vender;
    return this.openai.chatJSON<Array<{ key: string; title: string; body: string; cta: string; description: string; hashtags: string[] }>>(
      'Sos copywriter publicitario experto en Meta Ads para Latinoamérica. Escribís en español rioplatense, directo y persuasivo.',
      `Producto: ${JSON.stringify(input.product)}. Objetivo: ${objGuide}.
Generá 3 variantes de copy: "conversion" (agresivo, venta), "emotional" (deseo/emoción), "professional" (corporativo). Cada una con título corto, texto principal (2-3 frases), CTA, descripción y 5 hashtags.
JSON: [ { "key": "conversion", "title": "", "body": "", "cta": "", "description": "", "hashtags": [] }, ... ]`,
      900,
    );
  }

  // ── Persistencia de archivos (base64 → StorageService → URL) ────────────────
  private async persist(dataUrl: string, type: 'image' | 'video'): Promise<string> {
    try {
      const m = dataUrl.match(/^data:(.+?);base64,(.*)$/);
      if (!m) return dataUrl; // ya es URL
      const buffer = Buffer.from(m[2], 'base64');
      const ext = m[1].includes('png') ? 'png' : m[1].includes('mp4') ? 'mp4' : 'jpg';
      const saved = await this.storage.save(buffer, `creative_${Date.now()}.${ext}`, m[1]);
      return saved.url;
    } catch (e: any) {
      this.logger.warn(`persist falló (${e.message}) — devuelvo data URL`);
      return dataUrl; // fallback: el front igual lo renderiza
    }
  }

  // ── HISTORIAL ("Mis creativos") ─────────────────────────────────────────────
  async saveCreative(userId: string, dto: {
    name: string; format?: string; type?: string; imageUrl?: string; videoUrl?: string;
    studio: any; creditsUsed?: number;
  }) {
    const { rows } = await this.db.query(
      `INSERT INTO creatives (user_id, name, type, format, status, output_url, video_url, studio, credits_used, ai_prompt)
       VALUES ($1,$2,$3,$4,'ready',$5,$6,$7,$8,$9) RETURNING *`,
      [
        userId, dto.name, dto.type ?? (dto.videoUrl ? 'video' : 'image'),
        (dto.format ?? '9:16').replace(':', '_'), dto.imageUrl ?? null, dto.videoUrl ?? null,
        JSON.stringify(dto.studio ?? {}), dto.creditsUsed ?? 0, dto.studio?.strategy?.concept ?? null,
      ],
    );
    return rows[0];
  }

  async listCreatives(userId: string) {
    const { rows } = await this.db.query(
      `SELECT id, name, type, format, status, output_url, video_url, studio, credits_used, created_at
       FROM creatives WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [userId],
    );
    return rows;
  }

  async getCreative(id: string, userId: string) {
    const { rows } = await this.db.query('SELECT * FROM creatives WHERE id = $1 AND user_id = $2', [id, userId]);
    if (!rows.length) throw new BadRequestException('No encontrado');
    return rows[0];
  }

  async removeCreative(id: string, userId: string) {
    await this.db.query('DELETE FROM creatives WHERE id = $1 AND user_id = $2', [id, userId]);
    return { ok: true };
  }

  async stats(userId: string) {
    const { rows } = await this.db.query(
      `SELECT COUNT(*)::int AS creatives,
              COUNT(*) FILTER (WHERE output_url IS NOT NULL)::int AS images,
              COUNT(*) FILTER (WHERE video_url IS NOT NULL)::int AS videos,
              COALESCE(SUM(credits_used),0)::int AS credits_used,
              COUNT(*) FILTER (WHERE created_at > date_trunc('month', NOW()))::int AS this_month
       FROM creatives WHERE user_id = $1`,
      [userId],
    );
    return rows[0];
  }
}
