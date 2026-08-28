// Fuente única de costos de IA en créditos. Cambiá acá y se refleja en todo
// (backend cobra, frontend consulta vía GET /creative/costs).
export const AI_CREDIT_COSTS = {
  analyze: 0,          // análisis del producto (gratis)
  strategy: 0,         // estrategia (gratis)
  imageVariant: 1,     // por cada imagen generada
  imageVariantsSet: 3, // set inicial de 3 variantes
  imageRegen: 1,       // regenerar 1 imagen
  video5: 5,           // video 5s
  video10: 10,         // video 10s
  copy: 1,             // set de copy
} as const;

export type CreditCosts = typeof AI_CREDIT_COSTS;
