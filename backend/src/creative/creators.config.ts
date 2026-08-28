// ── AI Creators para UGC — personas 100% SINTÉTICAS (nunca reales) ────────────
// La descripción física es genérica y no identifica a ninguna persona real.
export interface CreatorPreset {
  key: string; name: string; description: string; appearance: string;
  ageRange: string; style: string; tone: string; scene: string;
}

export const CREATOR_PRESETS: CreatorPreset[] = [
  { key: 'ugc_casual',    name: 'UGC Casual',    description: 'Persona joven, cotidiana', appearance: 'young adult, casual everyday clothing, natural look, no makeup emphasis', ageRange: '20-30', style: 'casual', tone: 'cercano y espontáneo', scene: 'living room / bedroom' },
  { key: 'ugc_beauty',    name: 'UGC Beauty',    description: 'Estética beauty', appearance: 'young adult, soft glam, clean skin, beauty-influencer aesthetic', ageRange: '20-32', style: 'beauty', tone: 'aspiracional y suave', scene: 'bathroom / vanity mirror' },
  { key: 'ugc_fitness',   name: 'UGC Fitness',   description: 'Estética fitness', appearance: 'athletic adult, sportswear, energetic, gym aesthetic', ageRange: '22-38', style: 'fitness', tone: 'motivador y enérgico', scene: 'gym / home workout' },
  { key: 'ugc_tech',      name: 'UGC Tech',      description: 'Reseña de producto tech', appearance: 'adult, smart-casual, tech-reviewer vibe', ageRange: '22-40', style: 'tech', tone: 'claro y confiable', scene: 'desk / home office' },
  { key: 'ugc_food',      name: 'UGC Food',      description: 'Gastronomía', appearance: 'adult, casual, warm friendly look', ageRange: '22-45', style: 'food', tone: 'apetitoso y cálido', scene: 'kitchen' },
  { key: 'ugc_lifestyle', name: 'UGC Lifestyle', description: 'Estilo de vida', appearance: 'adult, stylish casual, relaxed lifestyle look', ageRange: '25-40', style: 'lifestyle', tone: 'relajado y real', scene: 'café / outdoor / home' },
  { key: 'ugc_fashion',   name: 'UGC Fashion',   description: 'Moda', appearance: 'adult, fashionable outfit, editorial-casual', ageRange: '20-35', style: 'fashion', tone: 'con actitud', scene: 'mirror / street' },
  { key: 'ugc_ecommerce', name: 'UGC E-commerce',description: 'Reseña de producto genérica', appearance: 'adult, neutral casual clothing, trustworthy', ageRange: '25-45', style: 'ecommerce', tone: 'honesto y directo', scene: 'home / neutral background' },
];

// Escenario sugerido según categoría de producto
export const SCENE_BY_CATEGORY: Record<string, string> = {
  perfume: 'bathroom / bedroom with mirror', belleza: 'bathroom / vanity',
  cosmetica: 'bathroom / vanity', alimento: 'kitchen', comida: 'kitchen',
  bebida: 'kitchen / café', tecnologia: 'desk / home office', gadget: 'desk',
  fitness: 'gym / home workout', deporte: 'gym', ropa: 'mirror / bedroom',
  moda: 'mirror / street', calzado: 'street / bedroom',
};

export function creatorByKey(key?: string): CreatorPreset {
  return CREATOR_PRESETS.find(c => c.key === key) ?? CREATOR_PRESETS[0];
}
