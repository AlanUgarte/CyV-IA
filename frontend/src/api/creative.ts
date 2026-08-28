import api from './client';

export type Fmt = '9:16' | '4:5' | '1:1';

export interface ProductInfo {
  name: string; category?: string; description?: string; features?: string[];
  audience?: string; colors?: string[]; context?: string;
  price?: string; oldPrice?: string; discount?: string; cta?: string;
}
export interface ImageVariant { key: string; label: string; description: string; prompt: string; url: string }
export interface CopyVariant { key: string; title: string; body: string; cta: string; description: string; hashtags: string[] }
export interface Strategy { chosenStyle: string; concept: string; angle: string; toneNotes: string }

// el interceptor del backend envuelve en { success, data }, por eso .data.data
const D = <T,>(p: Promise<{ data: { data: T } }>) => p.then(r => r.data.data);

export const creativeApi = {
  costs: () => D<{ costs: Record<string, number>; credits: number }>(api.get('/creative/costs')),

  analyze: (body: { name?: string; description?: string; imageBase64?: string }) =>
    D<ProductInfo>(api.post('/creative/analyze', body, { timeout: 60_000 })),

  strategy: (body: { product: ProductInfo; objective: string; style: string }) =>
    D<Strategy>(api.post('/creative/strategy', body, { timeout: 60_000 })),

  images: (body: { product: ProductInfo; objective: string; style: string; format: Fmt }) =>
    D<{ variants: ImageVariant[]; credits: number; creditsUsed: number }>(api.post('/creative/images', body, { timeout: 180_000 })),

  image: (body: { product: ProductInfo; objective: string; style: string; format: Fmt; angleKey?: string }) =>
    D<{ variant: ImageVariant; credits: number; creditsUsed: number }>(api.post('/creative/image', body, { timeout: 120_000 })),

  video: (body: { imageBase64: string; product: ProductInfo; style: string; duration: '5' | '10' }) =>
    D<{ videoUrl: string; animationPrompt: string; credits: number; creditsUsed: number }>(api.post('/creative/video', body, { timeout: 180_000 })),

  copy: (body: { product: ProductInfo; objective: string; style: string }) =>
    D<{ variants: CopyVariant[]; credits: number; creditsUsed: number }>(api.post('/creative/copy', body, { timeout: 60_000 })),

  save: (body: any) => D<any>(api.post('/creative', body)),
  list: () => D<any[]>(api.get('/creative')),
  stats: () => D<{ creatives: number; images: number; videos: number; credits_used: number; this_month: number }>(api.get('/creative/stats')),
  remove: (id: string) => D<any>(api.delete(`/creative/${id}`)),
};
