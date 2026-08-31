import { Controller, Get, Post, Delete, Body, Param, Request, UseGuards, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreativeService, ProductInfo } from './creative.service';
import { CreditsService } from '../credits/credits.service';
import { CostTrackingService } from '../credits/cost-tracking.service';
import { CREDIT_COSTS, estimateProviderCost, CreditOperation } from '../config/credits.config';
import { PROVIDERS } from '../config/providers.config';
import { CREATOR_PRESETS } from './creators.config';
import { Fmt } from './openai.service';

@ApiTags('creative')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('creative')
export class CreativeController {
  constructor(
    private readonly svc: CreativeService,
    private readonly credits: CreditsService,
    private readonly cost: CostTrackingService,
  ) {}

  // Wrapper reserva → genera → consume/release + cost tracking (créditos seguros)
  private async billed<T>(req: any, opts: {
    operation: CreditOperation; amount: number; provider: string; model: string; seconds?: number;
  }, fn: () => Promise<T>): Promise<{ result: T; credits: number; creditsUsed: number }> {
    const idem = req.headers['idempotency-key'] as string | undefined;
    const { txId } = await this.credits.reserve({
      userId: req.user.id, role: req.user.role, amount: opts.amount,
      operation: opts.operation, provider: opts.provider, model: opts.model, idempotencyKey: idem,
    });
    try {
      const result = await fn();
      await this.credits.consume(txId);
      await this.cost.log({
        userId: req.user.id, provider: opts.provider, model: opts.model, operation: opts.operation,
        durationSecs: opts.seconds, resolution: opts.seconds ? '1080p' : undefined,
        estimatedProviderCostUsd: estimateProviderCost(opts.operation, opts.seconds),
        creditsReserved: opts.amount, creditsConsumed: opts.amount, status: 'completed',
      });
      return { result, credits: await this.credits.balance(req.user.id), creditsUsed: req.user.role === 'admin' ? 0 : opts.amount };
    } catch (e: any) {
      await this.credits.release(txId, 'gen_error');
      await this.cost.log({ userId: req.user.id, provider: opts.provider, model: opts.model, operation: opts.operation, status: 'failed', error: e?.message?.slice(0, 200) });
      throw e;
    }
  }

  @Get('costs')
  async costs(@Request() req: any) { return { costs: CREDIT_COSTS, credits: await this.credits.balance(req.user.id) }; }

  // PASO 1 (gratis)
  @Post('analyze') @HttpCode(HttpStatus.OK)
  async analyze(@Body() body: { name?: string; description?: string; imageBase64?: string }) {
    return this.svc.analyzeProduct(body);
  }

  // PASO 2+3 (gratis)
  @Post('strategy') @HttpCode(HttpStatus.OK)
  async strategy(@Body() body: { product: ProductInfo; objective: string; style: string }) {
    return this.svc.buildStrategy(body);
  }

  // PASO 4 — 3 variantes
  @Post('images') @HttpCode(HttpStatus.OK)
  async images(@Body() body: { product: ProductInfo; objective: string; style: string; format: Fmt; quality?: 'standard' | 'premium'; referenceImage?: string }, @Request() req: any) {
    const op: CreditOperation = body.quality === 'premium' ? 'image_premium' : 'image_standard';
    const amount = CREDIT_COSTS[op] * 3;
    const { result, credits, creditsUsed } = await this.billed(req, { operation: op, amount, provider: PROVIDERS.image, model: PROVIDERS.openaiImageModel },
      () => this.svc.generateImageVariants(body));
    return { variants: result, credits, creditsUsed };
  }

  // Regenerar una variante
  @Post('image') @HttpCode(HttpStatus.OK)
  async image(@Body() body: { product: ProductInfo; objective: string; style: string; format: Fmt; angleKey?: string; quality?: 'standard' | 'premium'; referenceImage?: string }, @Request() req: any) {
    const op: CreditOperation = body.quality === 'premium' ? 'image_premium' : 'image_standard';
    const { result, credits, creditsUsed } = await this.billed(req, { operation: op, amount: CREDIT_COSTS[op], provider: PROVIDERS.image, model: PROVIDERS.openaiImageModel },
      () => this.svc.generateSingleImage(body));
    return { variant: result, credits, creditsUsed };
  }

  // PASO 5 — video
  @Post('video') @HttpCode(HttpStatus.OK)
  async video(@Body() body: { imageBase64: string; product: ProductInfo; style: string; duration: '5' | '10' }, @Request() req: any) {
    const seconds = body.duration === '10' ? 10 : 5;
    const op: CreditOperation = seconds === 10 ? 'video_10' : 'video_5';
    const { result, credits, creditsUsed } = await this.billed(req, { operation: op, amount: CREDIT_COSTS[op], provider: PROVIDERS.video, model: PROVIDERS.seedance.model, seconds },
      () => this.svc.generateVideo(body));
    return { ...(result as any), credits, creditsUsed };
  }

  // PASO 6 — copy (gratis)
  @Post('copy') @HttpCode(HttpStatus.OK)
  async copy(@Body() body: { product: ProductInfo; objective: string; style: string }) {
    return { variants: await this.svc.generateCopy(body) };
  }

  // ── UGC (persona IA) ─────────────────────────────────────────────────────────
  @Get('creators')
  creators() { return { creators: CREATOR_PRESETS }; }

  // Auto-selección de creator/escena/guion (gratis)
  @Post('ugc-auto') @HttpCode(HttpStatus.OK)
  async ugcAuto(@Body() body: { product: ProductInfo }) { return this.svc.pickUGC(body.product); }

  // Genera UGC (imagen persona sintética + video). Cuesta ugc_video_10.
  @Post('ugc') @HttpCode(HttpStatus.OK)
  async ugc(@Body() body: any, @Request() req: any) {
    const { result, credits, creditsUsed } = await this.billed(req,
      { operation: 'ugc_video_10', amount: CREDIT_COSTS.ugc_video_10, provider: PROVIDERS.video, model: PROVIDERS.seedance.model, seconds: 10 },
      () => this.svc.generateUGC(body));
    return { ...(result as any), credits, creditsUsed };
  }

  // ── Campaña UGC (agente planifica escenas tipo nodos) ───────────────────────
  @Post('ugc-campaign/plan') @HttpCode(HttpStatus.OK)
  async ugcPlan(@Body() body: { product: ProductInfo; creatorKey?: string }) { return this.svc.planUGCCampaign(body.product, body.creatorKey); }

  // Genera una escena de la campaña (imagen + video). Cuesta ugc_video_10.
  @Post('ugc-campaign/scene') @HttpCode(HttpStatus.OK)
  async ugcScene(@Body() body: any, @Request() req: any) {
    const { result, credits, creditsUsed } = await this.billed(req,
      { operation: 'ugc_video_10', amount: CREDIT_COSTS.ugc_video_10, provider: PROVIDERS.video, model: PROVIDERS.seedance.model, seconds: 10 },
      () => this.svc.generateUGCScene(body));
    return { ...(result as any), credits, creditsUsed };
  }

  // Texto a voz (TTS real). Gratis.
  @Post('tts') @HttpCode(HttpStatus.OK)
  async tts(@Body() body: { text: string; voice?: string }) { return this.svc.generateVoice(body.text, body.voice); }

  // Ensamblar el video final de la campaña (une las escenas). Gratis (solo cómputo).
  @Post('ugc-campaign/assemble') @HttpCode(HttpStatus.OK)
  async assemble(@Body() body: { videoUrls: string[]; musicUrl?: string }) { return this.svc.assembleFinalVideo(body.videoUrls, body.musicUrl); }

  @Post(':id/favorite') @HttpCode(HttpStatus.OK)
  async favorite(@Param('id') id: string, @Request() req: any) { return this.svc.toggleFavorite(id, req.user.id); }

  // HISTORIAL
  @Post() @HttpCode(HttpStatus.CREATED)
  async save(@Body() body: any, @Request() req: any) { return this.svc.saveCreative(req.user.id, body); }

  @Get()
  async list(@Request() req: any) { return this.svc.listCreatives(req.user.id); }

  @Get('stats')
  async stats(@Request() req: any) { return this.svc.stats(req.user.id); }

  @Get(':id')
  async getOne(@Param('id') id: string, @Request() req: any) {
    if (!id) throw new BadRequestException('id requerido');
    return this.svc.getCreative(id, req.user.id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any) { return this.svc.removeCreative(id, req.user.id); }
}
