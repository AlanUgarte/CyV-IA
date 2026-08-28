// ── Planes y packs de créditos (source of truth: backend) ────────────────────
export interface Plan { key: string; name: string; priceUsd: number; monthlyCredits: number; features: string[] }
export interface CreditPack { key: string; credits: number; priceUsd: number }

export const PLANS: Plan[] = [
  { key: 'starter',  name: 'Starter',  priceUsd: 19, monthlyCredits: 100, features: ['100 créditos/mes', 'Imágenes y copy', 'Soporte por email'] },
  { key: 'pro',      name: 'Pro',      priceUsd: 39, monthlyCredits: 250, features: ['250 créditos/mes', 'Video y UGC', 'Campañas completas'] },
  { key: 'business', name: 'Business', priceUsd: 79, monthlyCredits: 600, features: ['600 créditos/mes', 'Todo lo de Pro', 'Prioridad de generación'] },
];

// Pago por transferencia bancaria (el CEO aprueba manualmente)
export const PAYMENT_ALIAS = process.env.PAYMENT_ALIAS ?? 'Alan.ugarte7';
// WhatsApp para enviar el comprobante (formato internacional para wa.me, sin +)
export const PAYMENT_WHATSAPP = process.env.PAYMENT_WHATSAPP ?? '5493412708638';

export const CREDIT_PACKS: CreditPack[] = [
  { key: 'pack_50',   credits: 50,   priceUsd: 9 },
  { key: 'pack_150',  credits: 150,  priceUsd: 25 },
  { key: 'pack_500',  credits: 500,  priceUsd: 70 },
  { key: 'pack_1000', credits: 1000, priceUsd: 120 },
];
