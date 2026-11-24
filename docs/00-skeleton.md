# Slice 00 · Esqueleto

**Entregable demostrable:** una URL pública en Vercel donde se puede iniciar sesión y ver la
página protegida `/contacts` (vacía), con la arquitectura, las reglas de dependencia y el CI ya
funcionando de punta a punta.

Este slice **no toca WhatsApp, LLM ni voz**. Su trabajo es dejar el terreno donde los siguientes
slices se construyen sin rehacer nada.

## Estado de partida

Proyecto Next.js recién creado. Antes de proponer el plan, **inspecciona el repo real**: gestor de
paquetes, versión de Next, si usa App Router y `src/`, Tailwind, y qué trae el template. No asumas;
si algo difiere de lo descrito aquí, dímelo.

## Qué cruza este slice (de punta a punta)

UI (login y `/contacts`) → entrada `app/` → caso de uso `ListContacts` del módulo `conversations`
→ puerto `ContactRepository` → adaptador Supabase → Postgres con RLS.

## Tareas

**T0.1 · Monorepo y herramientas**

- Estructura pnpm workspace: `apps/web` (el proyecto Next actual), `apps/voice-worker` (carpeta vacía
  con un README de una línea) y `packages/*` (solo los que se necesiten ahora; `packages/db` para
  tipos generados). Si mover el proyecto a `apps/web` complica algo, propón alternativa.
- `tsconfig` con `strict: true` y alias `@/modules/*`.
- ESLint + typescript-eslint + Prettier; Vitest con cobertura; `lefthook` (pre-commit: lint y
  typecheck de archivos tocados).
- Scripts raíz: `dev`, `lint`, `typecheck`, `test`, `arch`, `audit`.
- Hecho cuando: los scripts corren en verde en un repo recién clonado.

**T0.2 · Reglas de arquitectura**

- dependency-cruiser con las 6 reglas de `docs/02-architecture.md` §4 (la 5 puede quedar como
  regla de importaciones de paquetes externos por carpeta).
- Hecho cuando: una prueba deliberada que viole una regla (p. ej. importar `infrastructure` desde
  `app/`) hace fallar `pnpm arch`, y sin ella pasa. Documenta cómo lo comprobaste.

**T0.3 · Supabase**

- Supabase CLI inicializado; proyecto local si hay Docker disponible (dime si no lo hay) y un
  proyecto alojado para el despliegue.
- Primera migración: `tenants`, `tenant_members`, `contacts` con `tenant_id`, RLS activada y
  políticas por membresía. `contacts` único por `(tenant_id, wa_id)` y con `phone_e164` aparte.
- Tipos generados en `packages/db`.
- Datos semilla: un tenant demo y un usuario demo vinculado a él (propón cómo crear el usuario).
- Hecho cuando: **un usuario del tenant A no puede leer contactos del tenant B**. Demuéstralo con una
  prueba (SQL o Vitest contra Supabase local), no solo a mano.

**T0.4 · Módulo `conversations` (la prueba viva de la arquitectura)**

- `domain/`: entidad `Contact`.
- `application/`: puerto `ContactRepository` y caso de uso `ListContacts`.
- `infrastructure/`: `SupabaseContactRepository` (usa la sesión del usuario, no la service role).
- `index.ts` público y `composition.ts` que arma el caso de uso.
- Prueba unitaria de `ListContacts` con un repositorio falso en memoria (sin red ni base).
- Hecho cuando: la página `/contacts` obtiene los datos **solo** a través de `conversations`.

**T0.5 · Autenticación**

- Supabase Auth con email y contraseña, usando `@supabase/ssr` (cookies).
- Página `/login`; las rutas del dashboard redirigen a `/login` sin sesión. Para interceptar rutas
  usa el mecanismo de **tu versión de Next** (puede llamarse `middleware` o `proxy`; verifícalo en
  la documentación de la versión instalada).
- Cerrar sesión.
- Hecho cuando: sin sesión, `/contacts` redirige a `/login`; con sesión muestra la página.

**T0.6 · UI base**

- Tailwind y shadcn/ui inicializados; layout del dashboard con barra lateral simple.
- `/login` y `/contacts` con estados de carga, vacío y error (el vacío dice algo útil, p. ej.
  "Aún no hay contactos. Escribe al WhatsApp del negocio para crear el primero").
- Hecho cuando: se ve ordenado en escritorio y en pantalla angosta.

**T0.7 · Configuración y salud**

- `env.ts` con zod que valida variables de entorno al arrancar y separa cliente de servidor;
  `.env.example` sin secretos; `import 'server-only'` en módulos con secretos.
- `GET /api/health` que responde 200 con la versión o el commit.
- Logger (`pino`) mínimo.

**T0.8 · CI y despliegue**

- GitHub Actions: instalar, `lint`, `typecheck`, `test`, `arch`, `audit`.
- Proyecto de Vercel conectado al repo y variables configuradas; despliegue de producción y de
  preview.
- Hecho cuando: la URL pública permite iniciar sesión con el usuario demo y ver `/contacts`.

**T0.9 · Documentación**

- `docs/decisions/DECISIONS.md` creado con las primeras decisiones y dudas de este slice.
- `README.md` raíz: cómo correr el proyecto localmente (aún sin WhatsApp).

## Fuera de alcance de este slice

WhatsApp, webhooks, LLM, STT, voz, memoria, Realtime, búsqueda y paginación del dashboard,
configuración del negocio, Kanban.

## Lo que necesito de mi parte (humano) antes o durante

- Cuenta y proyecto de Supabase (alojado) y su URL y claves.
- Cuenta de Vercel enlazada al repo de GitHub.
- Decirte si tengo Docker para Supabase local.
- **Pendiente con fecha:** darme de alta en Phonic antes del 30 de noviembre de 2026 (créditos
  gratuitos de lanzamiento, según el post oficial de Phonic). No afecta a este slice.

## Dudas abiertas para que me las confirmes en el plan

1. ¿Gestor de paquetes del proyecto actual y versión de Next? (se asume pnpm).
2. ¿Conviene mover el proyecto a `apps/web` ahora o dejarlo en la raíz hasta el slice del worker?
3. Cómo crear el usuario demo de forma reproducible (script de seed contra la API de Auth).
4. Nombre de las tablas y esquema: ¿`public` o un esquema propio?

## Criterio de hecho del slice

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm arch` en verde, también en CI.
- [ ] Una violación deliberada de arquitectura rompe `pnpm arch`.
- [ ] RLS comprobada con prueba: aislamiento entre tenants.
- [ ] `/contacts` solo accesible con sesión; con sesión muestra el estado vacío.
- [ ] Desplegado en Vercel y accesible con el usuario demo.
- [ ] `DECISIONS.md` con las decisiones del slice.

## Guion de demo (1 minuto)

1. Abrir la URL pública sin sesión: redirige a `/login`.
2. Iniciar sesión con el usuario demo: aparece `/contacts` con su estado vacío.
3. Cerrar sesión y volver a `/contacts`: redirige a `/login`.
4. Mostrar el CI en verde y `pnpm arch` fallando con una violación deliberada.
