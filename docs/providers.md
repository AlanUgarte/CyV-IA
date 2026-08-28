# Proveedores de IA (arquitectura desacoplada)

El sistema (campaigns, credits, users, billing, frontend) **no conoce** OpenAI/Seedance. Usa interfaces (`backend/src/creative/providers/types.ts`):

- `ImageProvider` → `OpenAIImageProvider` (gpt-image-2). Soporta imagen de referencia (edits) para preservar el producto.
- `VideoProvider` → `SeedanceVideoProvider` (Seedance 1.5 Pro, i2v) o `MagnificVideoProvider` (Kling). Se elige con `VIDEO_PROVIDER`.
- `CopyProvider` → `OpenAICopyProvider` (chat).

Selección por env en `providers.config.ts`. Cambiar de proveedor NO requiere tocar el resto del sistema. Preparados para el futuro (sin implementar): Kling/Runway/Veo.

## Costos reales (solo admin, para el margen)
`credits.config.ts`: imagen ≈ US$0,034, premium ≈ US$0,13, Seedance 1080p US$0,062/seg (10s ≈ US$0,62). Configurables por env. Se registran en `ai_generations` por cada generación.

**Seguridad:** las API keys viven solo en backend, nunca en el navegador.
