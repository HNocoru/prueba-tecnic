# Asistente IA de WhatsApp (voz y texto) — prueba técnica 1to1ai

App web multi-negocio: alguien llama o escribe al WhatsApp de un negocio, una IA lo
atiende en español de México y en el dashboard queda quién fue, qué se dijo y cómo
terminó.

## Stack

- Next.js + TypeScript + Tailwind + shadcn/ui + Supabase (Postgres, Auth, Realtime, Storage) en Vercel.
- Worker de voz en repo aparte `pt-worker` (Python, LiveKit Agents + Phonic), fuera de Vercel.
- App única de Next.js en la raíz (`app/`, `modules/`, `components/`, `shared/`); tipos generados de Supabase en `shared/db`.

## Cómo correr el proyecto localmente (sin WhatsApp)

Este es el entregable del slice 00: una URL pública donde se puede iniciar sesión y ver
`/contacts` protegido. Sin WhatsApp: no hay webhook, ni worker de voz, ni integración con
Meta en esta fase.

### Requisitos

- Node.js y pnpm.
- Supabase CLI (con Docker disponible) para la base de datos local.

### Pasos

1. Instalar dependencias:

   ```bash
   pnpm install
   ```

2. Levantar Supabase local:

   ```bash
   pnpm db:start
   ```

3. Ejecutar las pruebas de aislamiento RLS (pgTAP) contra Supabase local:

   ```bash
   pnpm db:test
   ```

4. Crear el usuario demo (requiere variables de entorno locales en `.env`, no versionado):

   ```bash
   pnpm db:seed-user
   ```

5. Levantar la app:

   ```bash
   pnpm dev
   ```

6. Checks del repositorio y pruebas automatizadas:

   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   pnpm arch
   pnpm test:integration
   pnpm test:e2e
   ```

### Pruebas E2E de navegador (Playwright)

Para ejecutar la suite E2E de Playwright:

1. Asegúrate de tener Supabase local corriendo (`pnpm db:start`) y el usuario demo sembrado:
   ```bash
   pnpm db:seed-user
   ```
2. Compila la app (`pnpm build`). Playwright inicia y detiene por sí mismo el servidor
   (`next start -p 3200`, `reuseExistingServer: false`): si el puerto 3200 está ocupado, la
   ejecución falla de inmediato en lugar de probar un servidor viejo. El servidor hereda el
   entorno de quien ejecuta el comando; necesita `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` (valores locales de
   `pnpm exec supabase status -o env`; las `NEXT_PUBLIC_*` también deben estar presentes al compilar).
3. Ejecuta Playwright con las credenciales demo y el entorno de Supabase:
   ```bash
   DEMO_USER_EMAIL=demo@example.com DEMO_USER_PASSWORD=DemoPassword123! pnpm test:e2e
   ```
   Puedes usar `PLAYWRIGHT_BASE_URL` para apuntar a otra URL y `PLAYWRIGHT_PORT` para cambiar el puerto.
   _Nota:_ Las capturas de pantalla y videos generados en caso de fallos se almacenan fuera del repositorio (`/tmp/playwright-artifacts`).

### Variables de entorno

El adaptador de Supabase espera, entre otras, `NEXT_PUBLIC_SUPABASE_URL` y
`NEXT_PUBLIC_SUPABASE_ANON_KEY`. El archivo de ejemplo y la configuración del entorno
quedan pendientes (creado por el humano; bloqueo por política de seguridad).

## Comandos disponibles

Todos los comandos listados arriba existen en el `package.json` del repositorio.

| Comando             | Descripción                                  |
| ------------------- | -------------------------------------------- |
| `pnpm install`      | Instalar dependencias del workspace.         |
| `pnpm db:start`     | Levantar Supabase local.                     |
| `pnpm db:test`      | Probar aislamiento RLS (pgTAP) contra local. |
| `pnpm db:seed-user` | Crear usuario demo.                          |
| `pnpm dev`          | Levantar la app Next.js.                     |
| `pnpm lint`         | Linter.                                      |
| `pnpm typecheck`    | Tipos.                                       |
| `pnpm test`         | Tests.                                       |
| `pnpm arch`         | Reglas de arquitectura (dependency-cruiser). |

## Sin WhatsApp

En esta fase no se integra WhatsApp, LLM ni voz. El flujo local corre sobre Supabase y la
autenticación; el resto de slices añade los canales.

## Verificación

- `pnpm lint && pnpm arch` en verde.
- Cada comando del README existe en el `package.json`.
