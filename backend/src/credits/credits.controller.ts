import { Controller, Get, Post, Body, Param, Request, UseGuards, HttpCode, HttpStatus, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreditsService } from './credits.service';
import { CostTrackingService } from './cost-tracking.service';
import { CREDIT_COSTS, CREDIT_VALUE_USD, estimateProviderCost, CreditOperation } from '../config/credits.config';
import { PLANS, CREDIT_PACKS, PAYMENT_ALIAS } from '../config/plans.config';

@ApiTags('credits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('credits')
export class CreditsController {
  constructor(private readonly credits: CreditsService, private readonly cost: CostTrackingService) {}

  @Get('balance')
  async balance(@Request() req: any) { return { credits: await this.credits.balance(req.user.id) }; }

  @Get('history')
  async history(@Request() req: any) { return { transactions: await this.credits.history(req.user.id) }; }

  @Get('plans')
  plans() { return { plans: PLANS }; }

  @Get('packs')
  packs() { return { packs: CREDIT_PACKS, alias: PAYMENT_ALIAS }; }

  // ── Recargas por transferencia (usuario) ────────────────────────────────────
  @Post('topup') @HttpCode(HttpStatus.OK)
  async topup(@Body() body: { packKey: string; receiptBase64?: string }, @Request() req: any) {
    return this.credits.createTopup(req.user.id, body.packKey, body.receiptBase64);
  }

  @Get('topups')
  async myTopups(@Request() req: any) { return { topups: await this.credits.listUserTopups(req.user.id) }; }

  // ── Aprobación de recargas (CEO / admin) ────────────────────────────────────
  @Get('admin/topups')
  async pendingTopups(@Request() req: any) {
    if (req.user.role !== 'admin') throw new ForbiddenException();
    return { topups: await this.credits.listPendingTopups() };
  }

  @Post('admin/topups/:id/approve') @HttpCode(HttpStatus.OK)
  async approveTopup(@Param('id') id: string, @Request() req: any) {
    if (req.user.role !== 'admin') throw new ForbiddenException();
    return this.credits.approveTopup(id, req.user.id);
  }

  @Post('admin/topups/:id/reject') @HttpCode(HttpStatus.OK)
  async rejectTopup(@Param('id') id: string, @Body() body: { note?: string }, @Request() req: any) {
    if (req.user.role !== 'admin') throw new ForbiddenException();
    return this.credits.rejectTopup(id, req.user.id, body.note);
  }

  // Costos en créditos que ve el usuario (NO el costo real del proveedor)
  @Get('costs')
  costs() { return { costs: CREDIT_COSTS, creditValueUsd: CREDIT_VALUE_USD }; }

  // PASO previo a generar: "Esta campaña utilizará XX créditos" con desglose (#36)
  @Post('preview')
  @HttpCode(HttpStatus.OK)
  async preview(@Body() body: { items: { operation: CreditOperation; qty?: number }[] }, @Request() req: any) {
    const breakdown = (body.items ?? []).map(it => {
      const unit = CREDIT_COSTS[it.operation] ?? 0;
      const qty = it.qty ?? 1;
      return { operation: it.operation, qty, unit, subtotal: unit * qty };
    });
    const total = breakdown.reduce((a, b) => a + b.subtotal, 0);
    return { breakdown, total, balance: await this.credits.balance(req.user.id) };
  }

  // Ajuste manual de créditos — solo ADMIN (#56 manual_adjustment)
  @Post('grant')
  @HttpCode(HttpStatus.OK)
  async grant(@Body() body: { userId: string; amount: number; reason?: string }, @Request() req: any) {
    if (req.user.role !== 'admin') throw new ForbiddenException();
    const after = await this.credits.grant(body.userId, body.amount, 'manual_adjustment', { by: req.user.id, reason: body.reason });
    return { balance: after };
  }

  // ADMIN cost dashboard (#39) — costos, margen, uso por modelo
  @Get('admin/metrics')
  async adminMetrics(@Request() req: any) {
    if (req.user.role !== 'admin') throw new ForbiddenException();
    const m = await this.cost.adminMetrics();
    return { ...m, providerCostUsd: { image: estimateProviderCost('image_standard'), imagePremium: estimateProviderCost('image_premium'), video10: estimateProviderCost('video_10', 10) } };
  }
}
