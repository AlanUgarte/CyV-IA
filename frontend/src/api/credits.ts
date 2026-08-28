import api from './client';

const D = <T,>(p: Promise<{ data: { data: T } }>) => p.then(r => r.data.data);

export interface Plan { key: string; name: string; priceUsd: number; monthlyCredits: number; features: string[] }
export interface Pack { key: string; credits: number; priceUsd: number }
export interface CreditTx { id: string; type: string; amount: number; status: string; balance_after: number; operation?: string; created_at: string }

export interface Topup { id: string; pack_key: string; credits: number; amount_usd: number; receipt_url?: string; status: string; created_at: string; email?: string; full_name?: string }

export const creditsApi = {
  balance: () => D<{ credits: number }>(api.get('/credits/balance')),
  history: () => D<{ transactions: CreditTx[] }>(api.get('/credits/history')),
  plans: () => D<{ plans: Plan[] }>(api.get('/credits/plans')),
  packs: () => D<{ packs: Pack[]; alias: string; whatsapp: string }>(api.get('/credits/packs')),
  costs: () => D<{ costs: Record<string, number>; creditValueUsd: number }>(api.get('/credits/costs')),
  adminMetrics: () => D<any>(api.get('/credits/admin/metrics')),
  // Recargas por transferencia
  topup: (packKey: string, receiptBase64?: string) => D<Topup>(api.post('/credits/topup', { packKey, receiptBase64 }, { timeout: 60_000 })),
  myTopups: () => D<{ topups: Topup[] }>(api.get('/credits/topups')),
  pendingTopups: () => D<{ topups: Topup[] }>(api.get('/credits/admin/topups')),
  receipt: (id: string) => D<{ dataUrl: string | null; url: string | null }>(api.get(`/credits/admin/topups/${id}/receipt`)),
  approveTopup: (id: string) => D<any>(api.post(`/credits/admin/topups/${id}/approve`, {})),
  rejectTopup: (id: string, note?: string) => D<any>(api.post(`/credits/admin/topups/${id}/reject`, { note })),
};
