import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../database/database.module';
import { StorageService } from '../uploads/storage.service';

@Injectable()
export class WorkspaceService {
  constructor(
    @Inject(DATABASE_POOL) private readonly db: Pool,
    private readonly storage: StorageService,
  ) {}

  private async persist(dataUrl?: string): Promise<string | null> {
    if (!dataUrl) return null;
    const m = dataUrl.match(/^data:(.+?);base64,(.*)$/);
    if (!m) return dataUrl;
    try {
      const ext = m[1].includes('png') ? 'png' : m[1].includes('mp4') ? 'mp4' : 'jpg';
      const saved = await this.storage.save(Buffer.from(m[2], 'base64'), `asset_${Date.now()}.${ext}`, m[1]);
      return saved.url && !saved.url.includes('localhost') ? saved.url : dataUrl;
    } catch { return dataUrl; }
  }

  // ── Proyectos ────────────────────────────────────────────────────────────────
  async createProject(userId: string, dto: { name: string; type?: string; thumbnailUrl?: string; creditsUsed?: number; data?: any }) {
    const thumb = dto.thumbnailUrl?.startsWith('data:') ? await this.persist(dto.thumbnailUrl) : (dto.thumbnailUrl ?? null);
    const { rows } = await this.db.query(
      `INSERT INTO projects (user_id, name, type, thumbnail_url, credits_used, data)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [userId, dto.name, dto.type ?? 'ugc_campaign', thumb, dto.creditsUsed ?? 0, JSON.stringify(dto.data ?? {})]);
    return rows[0];
  }
  async listProjects(userId: string) {
    const { rows } = await this.db.query(
      `SELECT id, name, type, thumbnail_url, status, credits_used, created_at FROM projects WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100`, [userId]);
    return rows;
  }
  async getProject(id: string, userId: string) {
    const { rows } = await this.db.query('SELECT * FROM projects WHERE id=$1 AND user_id=$2', [id, userId]);
    if (!rows.length) throw new BadRequestException('No encontrado');
    return rows[0];
  }
  async removeProject(id: string, userId: string) {
    await this.db.query('DELETE FROM projects WHERE id=$1 AND user_id=$2', [id, userId]);
    return { ok: true };
  }

  // ── Marca: perfil ────────────────────────────────────────────────────────────
  async getBrand(userId: string) {
    const { rows } = await this.db.query('SELECT brand_name, logo_url, primary_color, data FROM brand_profiles WHERE user_id=$1', [userId]);
    return rows[0] ?? { brand_name: null, logo_url: null, primary_color: null, data: {} };
  }
  async saveBrand(userId: string, dto: { brandName?: string; logo?: string; primaryColor?: string; avatar?: string; data?: any }) {
    const logo = dto.logo?.startsWith('data:') ? await this.persist(dto.logo) : (dto.logo ?? null);
    // Avatar propio (foto): se persiste y se guarda su URL dentro de data.avatarUrl
    let data = dto.data ?? {};
    if (dto.avatar?.startsWith('data:')) { const url = await this.persist(dto.avatar); data = { ...data, avatarUrl: url }; }
    const { rows } = await this.db.query(
      `INSERT INTO brand_profiles (user_id, brand_name, logo_url, primary_color, data, updated_at)
       VALUES ($1,$2,$3,$4,$5,NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         brand_name=COALESCE(EXCLUDED.brand_name, brand_profiles.brand_name),
         logo_url=COALESCE(EXCLUDED.logo_url, brand_profiles.logo_url),
         primary_color=COALESCE(EXCLUDED.primary_color, brand_profiles.primary_color),
         data=EXCLUDED.data, updated_at=NOW()
       RETURNING brand_name, logo_url, primary_color, data`,
      [userId, dto.brandName ?? null, logo, dto.primaryColor ?? null, JSON.stringify(data)]);
    return rows[0];
  }

  // ── Marca: productos ─────────────────────────────────────────────────────────
  async listProducts(userId: string) {
    const { rows } = await this.db.query(
      `SELECT id, name, image_url, description, price, url, category, created_at FROM brand_products WHERE user_id=$1 ORDER BY created_at DESC LIMIT 200`, [userId]);
    return rows;
  }
  async addProduct(userId: string, dto: { name: string; image?: string; description?: string; price?: string; url?: string; category?: string }) {
    const image = dto.image?.startsWith('data:') ? await this.persist(dto.image) : (dto.image ?? null);
    const { rows } = await this.db.query(
      `INSERT INTO brand_products (user_id, name, image_url, image_data, description, price, url, category)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, name, image_url, description, price, url, category, created_at`,
      [userId, dto.name, image, dto.image?.startsWith('data:') ? dto.image : null, dto.description ?? null, dto.price ?? null, dto.url ?? null, dto.category ?? null]);
    return rows[0];
  }
  async removeProduct(id: string, userId: string) {
    await this.db.query('DELETE FROM brand_products WHERE id=$1 AND user_id=$2', [id, userId]);
    return { ok: true };
  }

  async stats(userId: string) {
    const { rows } = await this.db.query(`
      SELECT
        (SELECT COUNT(*) FROM projects WHERE user_id=$1)::int AS projects,
        (SELECT COUNT(*) FROM brand_products WHERE user_id=$1)::int AS products,
        (SELECT COALESCE(SUM(credits_used),0) FROM projects WHERE user_id=$1)::int AS credits_used`, [userId]);
    return rows[0];
  }
}
