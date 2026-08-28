# Créditos — motor y ledger

**Valor:** 1 crédito = US$0,15 de valor comercial interno (`CREDIT_VALUE_USD`). NO es el costo real del proveedor (ese se registra aparte, ver `providers.md`).

## Costos por operación (configurables por env)
| Operación | Créditos | Env |
|---|---|---|
| Imagen standard | 1 | `IMAGE_STANDARD_CREDITS` |
| Imagen premium | 3 | `IMAGE_PREMIUM_CREDITS` |
| Video 5s | 5 | `VIDEO_5_SECONDS_CREDITS` |
| Video 10s / UGC 10s | 10 | `VIDEO_10_SECONDS_CREDITS` / `UGC_VIDEO_10_CREDITS` |
| Copy | 0 | `COPY_CREDITS` |

Fuente única: `backend/src/config/credits.config.ts`. El frontend los consulta por `GET /creative/costs` y `GET /credits/costs`.

## Reserva → consumo → devolución
`CreditsService` (backend/src/credits):
1. `reserve()` — descuenta el saldo **atómicamente** (nunca negativo), crea una fila `credit_transactions` en estado `reserved`. Soporta **idempotencia** (`Idempotency-Key`): la misma key no cobra dos veces. Admin = bypass (no cobra).
2. Se ejecuta la generación.
3. Éxito → `consume()` marca `consumed` (el saldo ya fue descontado).
4. Error → `release()` devuelve los créditos y registra un `refund`.

El wrapper `billed()` en `CreativeController` orquesta esto por cada operación.

## Ledger (`credit_transactions`)
Tipos: `subscription_grant | purchase | generation | refund | manual_adjustment | expiration`.
Guarda `balance_before/after`, `operation`, `provider`, `model`, `idempotency_key`, `meta`.

## Planes y packs
`backend/src/config/plans.config.ts` — Starter (US$19/100), Pro (US$39/250), Business (US$79/600); packs 50/150/500/1000. Expuestos por `GET /credits/plans` y `/credits/packs`.

## Endpoints
`GET /credits/balance · /history · /plans · /packs · /costs` · `POST /credits/preview` · `POST /credits/grant` (admin) · `GET /credits/admin/metrics` (admin).
