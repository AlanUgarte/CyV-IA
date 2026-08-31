import { Controller, Get, Post, Delete, Put, Body, Param, Request, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceService } from './workspace.service';

@ApiTags('workspace')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class WorkspaceController {
  constructor(private readonly svc: WorkspaceService) {}

  // ── Proyectos ────────────────────────────────────────────────────────────────
  @Post('projects') @HttpCode(HttpStatus.CREATED)
  createProject(@Body() body: any, @Request() req: any) { return this.svc.createProject(req.user.id, body); }

  @Get('projects')
  listProjects(@Request() req: any) { return this.svc.listProjects(req.user.id); }

  @Get('projects/stats')
  wsStats(@Request() req: any) { return this.svc.stats(req.user.id); }

  @Get('projects/:id')
  getProject(@Param('id') id: string, @Request() req: any) { return this.svc.getProject(id, req.user.id); }

  @Delete('projects/:id')
  removeProject(@Param('id') id: string, @Request() req: any) { return this.svc.removeProject(id, req.user.id); }

  // ── Marca ────────────────────────────────────────────────────────────────────
  @Get('brand')
  getBrand(@Request() req: any) { return this.svc.getBrand(req.user.id); }

  @Put('brand') @HttpCode(HttpStatus.OK)
  saveBrand(@Body() body: any, @Request() req: any) { return this.svc.saveBrand(req.user.id, body); }

  @Get('brand/products')
  listProducts(@Request() req: any) { return this.svc.listProducts(req.user.id); }

  @Post('brand/products') @HttpCode(HttpStatus.CREATED)
  addProduct(@Body() body: any, @Request() req: any) { return this.svc.addProduct(req.user.id, body); }

  @Delete('brand/products/:id')
  removeProduct(@Param('id') id: string, @Request() req: any) { return this.svc.removeProduct(id, req.user.id); }
}
