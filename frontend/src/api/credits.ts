import api from './client';

const D = <T,>(p: Promise<{ data: { data: T } }>) => p.then(r => r.data.data);

export interface Plan { key: string; name: string; priceUsd: number; monthlyCredits: number; features: string[] }
export interface Pack { key: string; credits: number; priceUsd: number }
export interface CreditTx { id: string; type: string; amount: number; status: string; balance_after: number; operation?: string; created_at: string }

export const creditsApi = {
  balance: () => D<{ credits: number }>(api.get('/credits/balance')),
  history: () => D<{ transactions: CreditTx[] }>(api.get('/credits/history')),
  plans: () => D<{ plans: Plan[] }>(api.get('/credits/plans')),
  packs: () => D<{ packs: Pack[] }>(api.get('/credits/packs')),
  costs: () => D<{ costs: Record<string, number>; creditValueUsd: number }>(api.get('/credits/costs')),
  adminMetrics: () => D<any>(api.get('/credits/admin/metrics')),
};
