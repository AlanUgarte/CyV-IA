# Generación de IA — flujo

Pipeline (backend `CreativeService`, endpoints `/creative/*`):

1. **Analizar** producto (texto y/o foto con GPT vision) → info estructurada.
2. **Estrategia** — GPT define concepto/ángulo/estilo (auto elige el mejor).
3. **Imágenes** — GPT arma 3 prompts visuales → `ImageProvider` genera 3 variantes. Con foto real → se usa como referencia (preservación de packaging/logo).
4. **Video** — GPT arma la animación específica del producto → `VideoProvider` (Seedance i2v, async).
5. **Copy** — GPT genera variantes (conversión/emocional/profesional): título, texto, CTA, descripción, hashtags.

Cada operación pasa por el motor de créditos (`billed()`), registra costo real (`ai_generations`) y persiste assets vía `StorageService` (disco/R2).

## Probar
- Imagen: `POST /creative/images` (requiere `OPENAI_API_KEY`).
- Video: `POST /creative/video` (requiere `SEEDANCE_API_KEY`).
- Copy: `POST /creative/copy` (requiere `OPENAI_API_KEY`).
Sin keys: degradan con error amable y **devuelven los créditos**.
