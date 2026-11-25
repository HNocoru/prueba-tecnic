# Asistente IA de WhatsApp (voz y texto) — prueba técnica 1to1ai

App web multi-negocio: alguien llama o escribe al WhatsApp de un negocio, una IA lo
atiende en español de México y en el dashboard queda quién fue, qué se dijo y cómo
terminó.

## Stack

- Next.js + TypeScript + Tailwind + shadcn/ui + Supabase (Postgres, Auth, Realtime, Storage) en Vercel.
- Worker de voz en repo aparte `pt-worker` (Python, LiveKit Agents + Phonic), fuera de Vercel.
- Monorepo pnpm con `apps/web` y `packages/db` (tipos generados de Supabase).

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

6. Checks del repositorio:

   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   pnpm arch
   ```

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
