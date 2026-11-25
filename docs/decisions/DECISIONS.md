# Decisiones del slice 00 — Esqueleto

Decisiones y deudas registradas durante el slice 00 (docs/00-skeleton.md, odd/tasks/slice-00-skeleton.md).

## Decisiones

- **Monorepo con pnpm:** `apps/web` (Next.js) y `apps/voice-worker` (Python, placeholder). `packages/db` con los tipos generados de Supabase.

- **Multitenant, opción A:** `auth.uid()` + tabla `tenant_members` + función `current_tenant()` (`SECURITY DEFINER`). El `service_role` solo se usa en el servidor y con `tenant_id` explícito.

- **Contactos:** `wa_id` y `phone_e164` separados. No se crea la tabla `contact_phones` ni la de identidades. El riesgo de duplicado (formato 52 vs 521) se verifica en el slice 01. La normalización de teléfonos se hará con `zod` + `libphonenumber-js` en la app.

- **No adoptar** los patrones de `ai-call-center` ni de `api-caliope-core-s2s` (alembic, roles `app_*`, outbox, campañas, particiones).

## Deudas

- El aislamiento de webhook y worker depende del código (pendiente de resolver).

- La revisión nativa de T0.3 está pendiente: falta el modelo `review-resilience` en el routing.

- El archivo de ejemplo de variables de entorno (`.env.example`) está pendiente: lo crea el humano (bloqueado por política de seguridad).

- La migración `20260101000000` tiene timestamp arbitrario.

- Supabase alojado no está configurado (T0.8).

## Seguridad

- Punto de revisión de seguridad: `current_tenant()` es `SETOF` y `SECURITY DEFINER`.
