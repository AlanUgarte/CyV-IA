# UGC & AI Creators (preparado)

Objetivo: videos UGC (10s, 9:16) protagonizados por **personas 100% sintéticas** (nunca personas reales ni celebridades).

## Estado
- **Preparado:** presets de creator (UGC Casual/Beauty/Fitness/Tech/Food/Lifestyle/Fashion/E-commerce), escenarios por tipo de producto (baño/cocina/gym/escritorio/…), y auto-selección (creator+escena+hook+acción según el producto).
- **Depende de:** `SeedanceVideoProvider` operativo (imagen creator+producto → video). El video real requiere `SEEDANCE_API_KEY`.

## Estructura de video UGC
0–2s Hook · 2–6s Persona+Producto · 6–8s Beneficio · 8–10s CTA. Estética "Reel grabado con celular" (vertical, luz natural, movimiento leve, expresiones naturales).

> Pendiente de implementación de UI/entidad `ai_creators` y del generador de creator; el `VideoProvider` ya soporta image-to-video.
