# Asistente IA de WhatsApp (voz y texto) — prueba técnica 1to1ai

App web multi-negocio: alguien llama o escribe al WhatsApp de un negocio, una IA lo atiende en
español de México y, en una página, queda **quién fue, qué se dijo y cómo terminó**.

## Qué hace

- **Cualquier negocio puede usarla.** Cada persona se registra en `/signup`, configura su negocio
  (perfil, horarios, catálogo, preguntas frecuentes, tono del asistente) y liga su número de
  WhatsApp. Los datos de cada negocio están aislados por tenant con RLS en Supabase.
- **Texto:** un mensaje entrante crea el contacto (la primera vez), se guarda en su conversación y
  el asistente responde por la Graph API de WhatsApp.
- **Voz:** una llamada entrante se contesta por el WhatsApp Connector de LiveKit; un worker de voz
  (repo aparte, `pt-worker`) conversa y la app guarda turnos, duración, cierre y resumen.
- **Memoria compartida:** el resumen de cada llamada y de cada conversación de texto se guarda por
  contacto; si vuelve por voz o por texto, el asistente ya sabe de qué hablaron.
- **Solicitudes:** el asistente puede abrir una solicitud (pendiente, en proceso o cancelada) a
  partir de la conversación y nunca la marca como completada. El importe sale solo del catálogo.
- **Dashboard:** bandeja con conversaciones, línea de tiempo de mensajes y llamadas (con
  transcripción y resumen), contactos y estado de cada chat, en tiempo real.
- **Tope de 5 minutos por llamada:** a los 4:30 el asistente se despide y a los 5:00 se cuelga.

## Arquitectura

```
Meta (WhatsApp Cloud API)
  ├─ messages ──► POST /api/whatsapp/webhook ─► app Next.js (Vercel) ─► Supabase (Postgres, Auth, Realtime)
  │                      │ firma HMAC + idempotencia              ▲
  │                      └─► asistente de texto (Groq) ──► Graph API (respuesta)
  └─ calls ─────► webhook ─► LiveKit WhatsApp Connector ─► worker de voz (pt-worker, Python)
                                                              │  GET /context · POST /turns · POST /end
                                                              └──► /api/internal/calls/* (token compartido)
```

- **App única de Next.js** en la raíz: `app/` (rutas), `modules/` (dominio hexagonal), `components/`
  (UI), `shared/` (entorno, Supabase, logger). Los módulos solo se importan por su `index.ts`
  (`pnpm arch` lo verifica).
- **Módulos:** `auth`, `business`, `channels/whatsapp`, `conversations`, `assistant` (texto),
  `calls`, `memory`.
- **Contexto compartido:** el texto y la voz leen el negocio con el mismo caso de uso
  (`GetBusinessContext`) y la misma memoria por contacto (`contact_memory`).
- **Base de datos:** migraciones en `supabase/migrations` (8) con pruebas pgTAP en
  `supabase/tests`.
- El contrato entre la app y el worker está en [`docs/04-worker-contract.md`](docs/04-worker-contract.md);
  la arquitectura completa, en [`docs/02-architecture.md`](docs/02-architecture.md).

## Stack

Next.js 16 · TypeScript · Tailwind CSS 4 + shadcn/ui · Supabase (Postgres, Auth, Realtime) · Vercel.
LLM de texto: Groq (modelo por variable de entorno). Voz: LiveKit Agents + Phonic (speech-to-speech)
en el worker. Ver [Decisiones y límites](#decisiones-y-límites-conocidos) para lo que difiere del PDF.

## Cómo correrlo en local

### Requisitos

Node.js, pnpm, Docker y la CLI de Supabase (`pnpm exec supabase`).

### Pasos

1. Instalar dependencias: `pnpm install`.
2. Levantar Supabase local: `pnpm db:start`.
3. Crear un `.env` en la raíz (no se versiona) con las variables de la
   [tabla de abajo](#variables-de-entorno). Los valores locales de Supabase salen de
   `pnpm exec supabase status -o env`.
4. Crear la base con migraciones y datos de demostración: `pnpm db:reset`.
5. Crear el usuario demo (solo local): `DEMO_USER_EMAIL=demo@example.com DEMO_USER_PASSWORD='DemoPassword123!' pnpm db:seed-user`.
6. Levantar la app: `pnpm dev` y abrir `http://localhost:3000`.

Con el usuario demo se ve un negocio con conversaciones, llamadas y solicitudes de ejemplo. Para
probar el alta desde cero, entra a `/signup` y crea una cuenta nueva.

> `pnpm db:reset` **borra todos los datos locales**, incluidas las cuentas que hayas creado, y la
> sesión de un usuario borrado sigue pareciendo válida hasta que se cierra. No lo corras mientras
> alguien prueba la app. Para una base vacía, sin el negocio demo: `pnpm exec supabase db reset --no-seed`.

### Variables de entorno

Solo servidor, salvo las `NEXT_PUBLIC_*`. Nunca se imprimen ni se envían al navegador.

| Variable                                                    | Obligatoria        | Para qué                                                       |
| ----------------------------------------------------------- | ------------------ | -------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sí                 | Cliente de Supabase (también al compilar)                      |
| `SUPABASE_SERVICE_ROLE_KEY`                                 | Sí                 | Escritura del servidor: webhook, API interna, memoria          |
| `WHATSAPP_APP_SECRET`                                       | Sí                 | Verifica la firma `X-Hub-Signature-256` del webhook            |
| `WHATSAPP_VERIFY_TOKEN`                                     | Sí                 | Verificación del webhook al configurarlo en Meta               |
| `WORKER_API_TOKEN`                                          | Sí                 | Secreto compartido con el worker para `/api/internal/*`        |
| `WHATSAPP_ACCESS_TOKEN`                                     | Para responder     | Enviar mensajes y contestar llamadas                           |
| `WHATSAPP_BUSINESS_ACCOUNT_ID`                              | Para ligar números | Cuenta de WhatsApp Business de la plataforma                   |
| `GROQ_API_KEY`, `LLM_MODEL`                                 | Para el texto      | Sin ellas el asistente registra el fallo y no rompe el webhook |
| `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`      | Para llamadas      | WhatsApp Connector de LiveKit Cloud                            |
| `LOG_LEVEL`                                                 | No                 | Nivel de log (`info` por defecto)                              |

## Conectar WhatsApp (número de prueba de Meta)

1. En [developers.facebook.com](https://developers.facebook.com) crea una app con el caso de uso de
   WhatsApp y usa el número de prueba que Meta entrega.
2. En la configuración del número **activa las llamadas** (vienen apagadas).
3. En la configuración del webhook usa `https://<tu-dominio>/api/whatsapp/webhook` y tu
   `WHATSAPP_VERIFY_TOKEN`, y suscribe los campos **`messages`** y **`calls`**.
   En local, expón el puerto con un túnel (por ejemplo `ngrok http 3000`).
4. Agrega a la lista de destinatarios (máximo 5) los teléfonos que recibirán respuestas por
   **texto**. Cualquier teléfono puede **llamar**.
5. `pnpm meta:check` revisa la suscripción de la cuenta; con `--fix <URL>` la corrige.
6. En el dashboard, en el inicio, escribe el número de WhatsApp Business del negocio. El servidor
   comprueba que exista en la cuenta de la plataforma y lo liga. El cliente nunca ve el webhook, el
   token ni identificadores internos.

## Voz (worker)

El worker vive en el repo hermano `pt-worker` (Python, LiveKit Agents + Phonic). Habla con la app
solo por HTTP con el contrato de `docs/04-worker-contract.md` y se registra como `whatsapp-agent`.
Necesita la URL de la app y `WORKER_API_TOKEN`. Debe estar encendido para contestar llamadas.

## Pruebas

| Comando                                      | Qué cubre                                               |
| -------------------------------------------- | ------------------------------------------------------- |
| `pnpm lint` · `pnpm typecheck` · `pnpm arch` | Estilo, tipos y reglas de dependencias entre módulos    |
| `pnpm test`                                  | Pruebas unitarias (Vitest)                              |
| `pnpm db:test`                               | Pruebas pgTAP de RLS y esquema contra Supabase local    |
| `pnpm test:integration`                      | Integración con Supabase local (requiere usuario demo)  |
| `pnpm test:e2e`                              | Navegador con Playwright (requiere `pnpm build` previo) |

E2E: la suite arranca su propio servidor en el puerto 3200 y falla de inmediato si está ocupado.
Necesita `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`
del entorno local, y las `NEXT_PUBLIC_*` también al compilar. Con `PLAYWRIGHT_WORKERS=N` corre
archivos en paralelo (por defecto 1).

Tras un `pnpm db:reset`, Realtime tarda más de un minuto en recuperarse: si fallan solo los tests de
Realtime, vuelve a correr la integración.

## Seguridad y robustez

- **Webhook firmado:** se verifica `X-Hub-Signature-256` sobre el cuerpo crudo y cada evento es
  idempotente (`webhook_events`), así que reintentos y duplicados no generan dos respuestas.
- **RLS por tenant** en todas las tablas; el tenant sale siempre de la sesión o del número, nunca de
  la entrada del cliente. La clave de servicio solo se usa en el servidor, con `tenant_id` explícito.
- **Secretos solo en el servidor.** El token del worker protege `/api/internal/*`.
- **Asistente de texto:** tope de 20 respuestas por hora y conversación, tiempo máximo y un
  reintento ante fallos del modelo, y el razonamiento interno del modelo nunca se envía al cliente.
- **Memoria:** se trata como dato no confiable: va en un bloque delimitado, sin saltos de línea y con
  topes de longitud, para que un cliente no pueda inyectar instrucciones.
- **Llamadas:** al terminar, el resumen se genera en segundo plano y la respuesta a `end` no espera
  al modelo.

## Decisiones y límites conocidos

- **shadcn/ui:** decisión tomada. La interfaz usa shadcn/ui (`components/ui`) con tokens propios de la
  dirección A (`components/theme/tokens.ts`). MUI se retiró por no usarse en ningún componente visible.
- **Ligar un número** solo funciona con números registrados en la cuenta de WhatsApp Business de la
  plataforma. Un alta para cualquier negocio con su propio número requiere Embedded Signup de Meta y
  un token por negocio; no está construido.
- **Un solo modelo para texto** (por variable de entorno). El de prueba, `qwen/qwen3.8-27b`, aparece
  como modelo en vista previa en Groq y puede retirarse con poco aviso.
- **Notas de voz:** se reconocen, pero el asistente responde con un texto fijo; no se transcriben.
- **Recuperar contraseña** no está incluido: se entra con el registro de cuenta.
- **Métricas del inicio** son un espacio reservado ("Disponible pronto").
- **Completar una solicitud** está reservado al dueño del negocio, pero todavía no hay una pantalla
  para hacerlo.
- **Llamadas:** si el worker nunca envía `end`, la fila no se cierra sola; el campo de error del
  worker no se guarda en la base.
- **Bandeja:** los filtros por texto buscan solo en las páginas ya cargadas.
- **Voces del asistente:** `roberto` o `eduardo` (el catálogo de Phonic no es configurable aún).

## Documentación

- [`docs/01-requirements.md`](docs/01-requirements.md) — requerimientos y supuestos.
- [`docs/02-architecture.md`](docs/02-architecture.md) — arquitectura y decisiones de diseño.
- [`docs/04-worker-contract.md`](docs/04-worker-contract.md) — contrato app ↔ worker.
- [`docs/ui-setup.md`](docs/ui-setup.md) — sistema visual y mediciones de rendimiento.
- [`docs/decisions/DECISIONS.md`](docs/decisions/DECISIONS.md) — registro de decisiones y deudas.
