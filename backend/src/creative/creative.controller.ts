import { Controller, Get, Post, Delete, Body, Param, Request, UseGuards, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreativeService, ProductInfo } from './creative.service';
import { AI_CREDIT_COSTS } from './creative.costs';
import { Fmt } from './openai.service';

@ApiTags('creative')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('creative')
export class CreativeController {
  constructor(private readonly svc: CreativeService) {}

  // Config de costos + balance del usuario
  @Get('costs')
  async costs(@Request() req: any) {
    return { costs: AI_CREDIT_COSTS, credits: await this.svc.getCredits(req.user.id) };
  }

  @Get('credits')
  async credits(@Request() req: any) {
    return { credits: await this.svc.getCredits(req.user.id) };
  }

  // PASO 1
  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  async analyze(@Body() body: { name?: string; description?: string; imageBase64?: string }) {
    return await this.svc.analyzeProduct(body);
  }

  // PASO 2+3
  @Post('strategy')
  @HttpCode(HttpStatus.OK)
  async strategy(@Body() body: { product: ProductInfo; objective: string; style: string }) {
    return await this.svc.buildStrategy(body);
  }

  // PASO 4 — 3 variantes
  @Post('images')
  @HttpCode(HttpStatus.OK)
  async images(@Body() body: { product: ProductInfo; objective: string; style: string; format: Fmt }, @Request() req: any) {
    await this.assertCredits(req, AI_CREDIT_COSTS.imageVariantsSet);
    const variants = await this.svc.generateImageVariants(body);
    const credits = await this.svc.charge(req.user.id, req.user.role, AI_CREDIT_COSTS.imageVariantsSet);
    return { variants, credits, creditsUsed: AI_CREDIT_COSTS.imageVariantsSet };
  }

  // Regenerar una variante
  @Post('image')
  @HttpCode(HttpStatus.OK)
  async image(@Body() body: { product: ProductInfo; objective: string; style: string; format: Fmt; angleKey?: string }, @Request() req: any) {
    await this.assertCredits(req, AI_CREDIT_COSTS.imageRegen);
    const variant = await this.svc.generateSingleImage(body);
    const credits = await this.svc.charge(req.user.id, req.user.role, AI_CREDIT_COSTS.imageRegen);
    return { variant, credits, creditsUsed: AI_CREDIT_COSTS.imageRegen };
  }

  // PASO 5 — video (async, con polling interno)
  @Post('video')
  @HttpCode(HttpStatus.OK)
  async video(@Body() body: { imageBase64: string; product: ProductInfo; style: string; duration: '5' | '10' }, @Request() req: any) {
    const cost = body.duration === '10' ? AI_CREDIT_COSTS.video10 : AI_CREDIT_COSTS.video5;
    await this.assertCredits(req, cost);
    const result = await this.svc.generateVideo(body);
    const credits = await this.svc.charge(req.user.id, req.user.role, cost);
    return { ...result, credits, creditsUsed: cost };
  }

  // PASO 6 — copy
  @Post('copy')
  @HttpCode(HttpStatus.OK)
  async copy(@Body() body: { product: ProductInfo; objective: string; style: string }, @Request() req: any) {
    await this.assertCredits(req, AI_CREDIT_COSTS.copy);
    const variants = await this.svc.generateCopy(body);
    const credits = await this.svc.charge(req.user.id, req.user.role, AI_CREDIT_COSTS.copy);
    return { variants, credits, creditsUsed: AI_CREDIT_COSTS.copy };
  }

  // HISTORIAL
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async save(@Body() body: any, @Request() req: any) {
    return await this.svc.saveCreative(req.user.id, body);
  }

  @Get()
  async list(@Request() req: any) {
    return await this.svc.listCreatives(req.user.id);
  }

  @Get('stats')
  async stats(@Request() req: any) {
    return await this.svc.stats(req.user.id);
  }

  @Get(':id')
  async getOne(@Param('id') id: string, @Request() req: any) {
    return await this.svc.getCreative(id, req.user.id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any) {
    return await this.svc.removeCreative(id, req.user.id);
  }

  // Chequea balance ANTES de generar (así un fallo no cobra créditos)
  private async assertCredits(req: any, cost: number) {
    if (req.user.role === 'admin' || cost <= 0) return;
    const bal = await this.svc.getCredits(req.user.id);
    if (bal < cost) throw new BadRequestException('SIN_CREDITOS');
  }
}
