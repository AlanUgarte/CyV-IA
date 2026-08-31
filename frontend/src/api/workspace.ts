import api from './client';

const D = <T,>(p: Promise<{ data: { data: T } }>) => p.then(r => r.data.data);

export interface Project { id: string; name: string; type: string; thumbnail_url?: string; status: string; credits_used: number; created_at: string }
export interface BrandProduct { id: string; name: string; image_url?: string; description?: string; price?: string; url?: string; category?: string; created_at: string }
export interface Brand { brand_name?: string; logo_url?: string; primary_color?: string; data?: any }

export const workspaceApi = {
  // Proyectos
  createProject: (body: { name: string; type?: string; thumbnailUrl?: string; creditsUsed?: number; data?: any }) => D<Project>(api.post('/projects', body, { timeout: 60_000 })),
  listProjects: () => D<Project[]>(api.get('/projects')),
  getProject: (id: string) => D<any>(api.get(`/projects/${id}`)),
  removeProject: (id: string) => D<any>(api.delete(`/projects/${id}`)),
  stats: () => D<{ projects: number; products: number; credits_used: number }>(api.get('/projects/stats')),
  // Marca
  getBrand: () => D<Brand>(api.get('/brand')),
  saveBrand: (body: { brandName?: string; logo?: string; primaryColor?: string; avatar?: string; data?: any }) => D<Brand>(api.put('/brand', body, { timeout: 60_000 })),
  listProducts: () => D<BrandProduct[]>(api.get('/brand/products')),
  addProduct: (body: { name: string; image?: string; description?: string; price?: string; url?: string; category?: string }) => D<BrandProduct>(api.post('/brand/products', body, { timeout: 60_000 })),
  removeProduct: (id: string) => D<any>(api.delete(`/brand/products/${id}`)),
};
