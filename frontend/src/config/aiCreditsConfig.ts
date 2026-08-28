// Fallback local de costos (la fuente real es el backend: GET /creative/costs).
// No hardcodear estos valores en componentes: importar SIEMPRE desde acá.
export const aiCreditsConfig = {
  analyze: 0,
  strategy: 0,
  imageVariant: 1,
  imageVariantsSet: 3,
  imageRegen: 1,
  video5: 5,
  video10: 10,
  copy: 1,
};

export type AiCreditsConfig = typeof aiCreditsConfig;
