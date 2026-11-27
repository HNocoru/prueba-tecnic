# Decisiones del slice 00 — Esqueleto

Decisiones y deudas registradas durante el slice 00 (docs/00-skeleton.md, odd/tasks/slice-00-skeleton.md).

## Decisiones

- **App en este repo** (app única en la raíz; tipos generados de Supabase en `shared/db`); **worker en repo aparte `pt-worker`**.

- **App única de Next.js en la raíz** con route groups `(web)` (HTML) y `api` (HTTP); `packages/db` pasa a `shared/db`. El logout pasa de `/auth/logout` a `/api/auth/logout`. Se descarta el monorepo porque el worker vive en un repo aparte. Nueva regla de arquitectura `components-only-from-app`: `modules/` no importa `components/`.

- **Dos repos (app y worker)** por despliegues en hosts distintos (decisión del usuario).

- **Caliope como referencia, no base** (sin pruebas reales de voz).

- **Worker sin acceso a base de datos;** HTTP a la API de la app.

- **`docs/00-skeleton.md` es el plan original;** estos cambios de alcance se registran aquí.

- **Multitenant, opción A:** `auth.uid()` + tabla `tenant_members` + función `current_tenant()` (`SECURITY DEFINER`). El `service_role` solo se usa en el servidor y con `tenant_id` explícito.

- **Contactos:** `wa_id` y `phone_e164` separados. No se crea la tabla `contact_phones` ni la de identidades. El riesgo de duplicado (formato 52 vs 521) se verifica en el slice 01. La normalización de teléfonos se hará con `zod` + `libphonenumber-js` en la app.

- **No adoptar** los patrones de `ai-call-center` ni de `api-caliope-core-s2s` (alembic, roles `app_*`, outbox, campañas, particiones).

## Deudas

- Eliminar `apps/voice-worker` y actualizar el README raíz (hecho en este handoff).

- El aislamiento de webhook y worker depende del código (pendiente de resolver).

- La revisión nativa de T0.3 está pendiente: falta el modelo `review-resilience` en el routing.

- El archivo de ejemplo de variables de entorno (`.env.example`) está pendiente: lo crea el humano (bloqueado por política de seguridad).

- La migración `20260101000000` tiene timestamp arbitrario.

- Supabase alojado no está configurado (T0.8).

## Seguridad

- Punto de revisión de seguridad: `current_tenant()` es `SETOF` y `SECURITY DEFINER`.

## Slice 02 — Llamada contestada (API interna del worker)

Decisiones y deudas del handoff `odd/handoffs/S02-A-app-internal-api.md`.

### Decisiones

- **API interna con Bearer `WORKER_API_TOKEN`:** rutas bajo `/api/internal/*`; el token se compara en
  tiempo constante (SHA-256 + `timingSafeEqual`) y sin token válido se responde 401. El worker nunca
  recibe `tenant_id`: la app lo deduce del `call_id`.
- **Lógica en `modules/calls`** (domain → application con puertos → infrastructure + composition);
  `app/api/internal` solo valida el Bearer, lee el cuerpo y traduce el resultado a códigos HTTP.
- **El webhook `calls` se normaliza en `channels/whatsapp`**, dueño de `whatsapp_numbers` y
  `webhook_events`, y delega en `modules/calls`. El tenant se resuelve por `phone_number_id`; el
  evento se registra con id `call:{wa_call_id}:{evento}` para que un reintento de Meta no duplique.
- **`terminate` cierra de forma best-effort** (`caller_hangup` y duración calculada). El `end` del
  worker es autoritativo y puede reescribir motivo y duración; un segundo `end` deja los mismos valores.
- **Contexto mínimo:** nombre de `tenants`, tono/voz/idioma de `assistant_configs` y los últimos 12
  mensajes de texto de la conversación. `memory` va vacío hasta que exista `contact_memory`.

### Deudas

- **Formato exacto del webhook `calls` "Por verificar":** se acepta la forma pública `value.calls[]`
  y, por tolerancia, el evento plano en `value` (`event`/`call_id`). Falta capturar un evento real
  del Connector de WhatsApp y ajustar el parser.
- ~~No se contesta la llamada~~ → resuelto en la sección «Aceptar la llamada por el Connector» (abajo).
- **`modules/business` no existe:** `faq` y `hours` van vacíos; `is_new` se aproxima con
  `contacts.created_at >= calls.started_at`. Reemplazar por memoria/negocio reales en el slice 05/08.
- **`contact_memory` no existe:** el contexto devuelve `memory: { summary: "", facts: {} }`.
- **`call_turns` no tiene `UNIQUE(call_id, position)`:** la idempotencia por `seq` se logra leyendo
  las posiciones existentes antes de insertar (carrera no cubierta). Añadir la restricción en una migración.
- **`started_ms` de los turnos no se persiste** (no hay columna) y **`calls` no tiene columna para el
  error del worker ni `answered_at`**: el error de `/end` se descarta.
- **Heartbeat sin persistencia:** no hay tabla de salud; el endpoint solo valida y registra en el log.
- **Sin resumen de llamada:** generarlo requiere el LLM de texto (slice 04/05).
- **Contacto y conversación desde el adaptador de `calls`:** se crean en `SupabaseCallRepository`
  porque `conversations` aún no expone un caso de uso de escritura (regla 6 de tablas pendiente).

## Slice 02 · Aceptar la llamada por el WhatsApp Connector de LiveKit

- **API verificada** en docs.livekit.io (`telephony/connectors/whatsapp`, `reference/telephony/connectors-api`)
  y en `livekit-server-sdk@2.20.1` (instalado): `new ConnectorClient(host, apiKey, secret)`;
  `acceptWhatsAppCall({ whatsappPhoneNumberId, whatsappApiKey, whatsappCloudApiVersion, whatsappCallId,
sdp: SessionDescription{type:"offer"}, roomName, agents: RoomAgentDispatch[], participantMetadata,
participantAttributes })` y `disconnectWhatsAppCall(whatsappCallId, whatsappApiKey, reason)`.
  El SDK lo expone; no hizo falta HTTP/Twirp manual.
- **Puerto `WhatsAppCallGateway`** en `modules/calls/application`; adaptador `LiveKitWhatsAppCallGateway`
  en infraestructura. El token de Meta (`WHATSAPP_ACCESS_TOKEN`) solo vive en el adaptador y los
  errores del Connector se re-lanzan sin el mensaje original (puede traer token/SDP).
- **call_id al worker:** UUID de `calls.id` en `participantAttributes.call_id`, en
  `participantMetadata` y en la `metadata` del `RoomAgentDispatch` (JSON `{"call_id": ...}`), las dos
  vías que lee `pt-worker/.../call_id.py`. Agente `whatsapp-agent` (constante `AGENT_NAME` del worker),
  sala `call-{uuid}`.
- **Idempotencia por wacid:** `startCall` devuelve `{callId, created}`; solo se contesta si `created`.
  Además la ingesta ya descarta eventos `call:{wacid}:{evento}` procesados.
- **`terminate`:** cierra la fila y luego `disconnectWhatsAppCall(..., USER_INITIATED)` (Meta ya colgó;
  no requiere otra llamada a Meta). El fallo del disconnect no se propaga (la fila ya está cerrada).
- **Variables** `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`: opcionales en el zod para que
  build y entornos sin voz arranquen. Si falta alguna (o `WHATSAPP_ACCESS_TOKEN`), `connect` falla con
  un error claro y el evento queda `failed` en `webhook_events`. Solo servidor.

### Deudas

- **Sin verificar contra LiveKit/Meta reales:** solo hay pruebas con puertos falsos; falta una llamada real.
  `session.sdp` en `calls[]` sigue "Por verificar" hasta capturar un evento real.
- **Si `accept` falla, la fila `calls` queda abierta** (sin `ended_at`) y un reintento no vuelve a
  contestar (`created=false`). Cerrarla como `failed` requiere un puerto de escritura nuevo.
- **Versión de Cloud API (`26.0`) y nombre del agente fijos en código:** moverlos a env si cambian.
- **`pre_accept` de Meta:** no se hace; se asume que el Connector gestiona el flujo de Graph API.
- **`LIVEKIT_URL` `wss://`** se convierte a `https://` para el `ConnectorClient`.
- **Doble desconexión:** si el worker ya cerró la sala, el `disconnect` puede fallar; se ignora.

## S03 · Bandeja en tiempo real + rendimiento

- **Realtime:** migración `20260104000000_realtime_inbox.sql` añade `messages`, `conversations` y `calls`
  a `supabase_realtime` (idempotente). No se tocó ninguna política: `postgres_changes` evalúa la RLS de
  SELECT con el JWT del suscriptor (verificado: un mensaje de otro tenant no llegó al suscriptor).
- **Cliente:** `InboxRealtime` (client) escucha INSERT/UPDATE y llama `router.refresh()` con debounce de
  300 ms; sin lógica de negocio. Al reconectar refresca para recuperar eventos perdidos.
- **`listConversations`:** una consulta acotada (50 conversaciones más recientes + contacto por embed +
  `messages` con `limit 1` por padre, usa `ix_messages_conversation_occurred`). Ya no se leen todos los
  mensajes ni contactos del tenant. Sin migración de vista/índice: el índice ya existía.
- **Timeline:** `InboxScreen` pide el timeline una sola vez y filtra/cuenta en memoria; el repositorio pide
  mensajes y llamadas en paralelo.
- **Esqueletos:** `loading.tsx` en inbox y home, `InboxSkeleton` como fallback de Suspense; misma rejilla.
- **Caché:** no se usa `"use cache"` con datos de tenant; el shell sigue prerenderizado y los datos por
  sesión van dentro de Suspense.

### Deudas

- ~~**Tope de 50 conversaciones:** una conversación más antigua no aparece en la lista y su URL directa
  devuelve "No encontramos esa conversación".~~ Resuelto en S04 con paginación y `getConversation`.

## S04 · Rendimiento global y paginación

### Medición (Fase 1, antes de tocar código)

App en producción local (`pnpm build && pnpm start`, puerto 3100) contra Supabase local, con 300
contactos/conversaciones y una conversación con 600 mensajes. Mediana de 7 peticiones autenticadas;
«bytes» es el HTML de la respuesta. La instrumentación temporal contó `auth.getUser()` por navegación.

| Ruta                          | Antes (ms) | Después (ms) | Antes (KB) | Después (KB) | `getUser` antes | Después |
| ----------------------------- | ---------: | -----------: | ---------: | -----------: | --------------: | ------: |
| `/home`                       |         24 |           21 |       28.5 |         28.8 |               4 |       1 |
| `/inbox`                      |         27 |           24 |       83.6 |         68.3 |               2 |       1 |
| `/inbox/[id]` (600 mensajes)  |         62 |           26 |      423.2 |        100.9 |               2 |       1 |
| `/inbox/[id]?filter=messages` |         56 |           23 |      423.5 |        101.1 |               2 |       1 |
| `/inbox/[id]?filter=calls`    |         30 |           21 |       87.7 |         85.3 |               2 |       1 |
| `/contacts`                   |    6 (307) |           18 |        8.1 |         60.3 |               1 |       1 |

**Causa principal: H1 (viajes de autenticación).** Cada navegación de `/home` hacía cuatro
verificaciones de red (`proxy.getUser` + `requireUser` del layout + dos `resolveTenantId`), y las de
bandeja dos. Al dejar una sola verificación en el proxy, el tiempo de `/home` y `/inbox` baja ~15 %
aun en local, donde la latencia de red es mínima; el ahorro real crece con la latencia a Supabase.

**H2 confirmada.** El filtro era navegación completa y volvía a consultar la conversación (56 ms y
423 KB por clic). Ahora es estado local sobre la timeline cargada: 0 peticiones al cambiar de pestaña.
La ruta con `?filter=` sigue funcionando para compartir el enlace, pero ya solo carga la primera página.

**H3 confirmada en parte.** La bandeja resolvía tenant, lista, conversación y timeline en cascada.
Ahora lista, últimos 50 mensajes y llamadas van en un solo `Promise.all`; `getConversation` solo se
usa para enlaces directos fuera de la primera página.

**H4:** `connection()` del layout era redundante: `requireUser()` ya lee `headers()`. Se eliminó; el
shell de cada ruta sigue siendo ◐ (Partial Prerender) y el contenido de sesión va dentro de Suspense.

### Decisiones

- **Una verificación por petición:** el proxy valida con `getClaims()` y reenvía el `sub` en la
  cabecera interna `x-verified-user-id`, sobrescribiéndola siempre. Layout y páginas leen esa
  identidad con `React.cache()` y `headers()`. La RLS con el JWT de la sesión sigue siendo la
  autorización real de los datos; si la cabecera falta, `requireUser()` redirige a `/login` (falla cerrado).
- **Cursor opaco** `(fecha, id)` en base64url, compartido por conversaciones, mensajes y contactos.
  Un cursor inválido lanza `InvalidCursorError`; las acciones lo traducen a página vacía y las
  pruebas verifican que no se reinicia la lista en silencio.
- **Página de 30** en conversaciones/contactos y **50 mensajes**; botón «Cargar más» / «Cargar
  anteriores» (sin observer). Las llamadas de una conversación se siguen cargando completas.
- **`getConversation` en el puerto** resuelve la deuda del slice 03: un enlace directo ya no depende
  de la primera página.
- **Realtime:** `router.refresh()` sigue renovando la primera página; las páginas antiguas ya
  cargadas y los mensajes desplazados se conservan en estado del cliente y se mezclan por tipo+id.
- **Índices keyset** en la migración `20260105000000_pagination_indexes.sql`: conversaciones
  `(tenant_id, last_activity_at DESC, id DESC)`, mensajes y llamadas `(conversation_id, fecha DESC, id DESC)`
  y contactos `(tenant_id, created_at DESC, id DESC)`.
- **Contactos** deja de redirigir a `/inbox`: página propia dentro del dashboard, con la misma
  paginación y esqueleto.

### Deudas y riesgos

- **Confianza en la cabecera:** depende de que el matcher del proxy cubra toda ruta que use
  `requireUser()`. Una ruta nueva fuera del matcher falla cerrado, pero conviene revisarlo al añadir
  entradas. Alternativa más estricta: firmar la cabecera o volver a `getUser()` en esa ruta.
- **`getClaims()` con JWT HS256** (Supabase local) cae internamente en `getUser()`: sigue siendo una
  llamada de red. Con claves asimétricas/JWKS se verifica local y el ahorro sería mayor.
- **Llamadas sin paginar:** una conversación con muchísimas llamadas aún carga todas. Pendiente si
  aparece ese volumen.
- **Conteos del panel:** con mensajes paginados el número se marca con `+` cuando hay más; no es un
  `COUNT(*)` exacto.
- **Medición en localhost:** las latencias absolutas son bajas; la comparación relativa y el conteo
  de llamadas son la evidencia, no una promesa de ms en producción.
- **Sin verificación visual en navegador:** no hay Chrome en el entorno; solo se verificó build,
  tipos, lint, pruebas y la respuesta HTML de las rutas.

## Slice 05 — Pruebas unitarias, integración y E2E de navegador

Decisiones y deudas del handoff `odd/handoffs/S05-tests-e2e.md`.

### Decisiones

- **Validación de login en domain/application:**
  - `emailSchema`: rechaza correos vacíos, sin `@`, sin dominio, con espacios o que excedan 254 caracteres (RFC 5321).
  - `loginPasswordSchema`: en el login solo se exige contraseña no vacía (`min(1)`), protegiendo el acceso a cuentas preexistentes.
  - `strongPasswordSchema`: reservado para alta y cambio de contraseña (mínimo 12 caracteres, mayúscula, minúscula, dígito y símbolo).
  - El mensaje de error de autenticación se mantiene genérico (`"Email o contraseña incorrectos."`) para prevenir enumeración de usuarios.
- **Suite de integración (`pnpm test:integration`):**
  - Configuración aislada en `vitest.integration.config.ts` apuntando a `tests/integration/**/*.test.ts`.
  - Verifica creación de sesión con Supabase local, rechazo con credenciales erróneas, revocación con logout, aislamiento multitenant en `whatsapp_numbers` y verificación estricta de headers/firmas para `/api/internal/*` y el webhook de Meta.
- **E2E con Playwright (`pnpm test:e2e`):**
  - Configurado en `playwright.config.ts` y `e2e/app.spec.ts` apuntando a Chromium (aprovechando cache existente en `~/.cache/ms-playwright`).
  - Salida de artefactos y capturas configurada en `/tmp/playwright-artifacts` para mantener el árbol de git limpio.
  - Prueba el flujo completo: Login -> Redirección a `/home` -> Navegación de todos los ítems del sidebar (`/inbox`, `/contacts`, `/business`, `/assistant`, `/account`, `/home`) -> Logout.
  - Prueba de tarjeta "Conectar WhatsApp" y filtrado/búsqueda en la bandeja de entrada.
- **Flujos no implementados (Fases F3/F5):**
  - Marcados honestamente con `test.fixme` en la suite de Playwright: métricas del dashboard, gráficas, edición de perfil de usuario, configuración de negocio y configuración del asistente.

### Deudas y hallazgos

- **Botones y enlaces sin acción (muertos):**
  - En `/business`: pantalla de estado vacío sin formulario funcional aún.
  - En `/assistant`: pantalla de estado vacío sin controles de configuración.
  - En `/account`: pantalla de estado vacío sin edición de perfil.
  - En `/inbox`: las conversaciones y llamadas se visualizan, pero no existe caja de texto para enviar mensajes salientes directos (la atención es autónoma vía webhook).

## Slice 06 — Bandeja rediseñada (tres paneles)

Decisiones y deudas del handoff `odd/handoffs/S06-inbox-redesign.md`.

### Decisiones

- **Tres paneles:** lista de chats, conversación y detalle adaptable. En móvil se muestra un panel a la vez
  (`list` → `chat` → `details`) con botones de vuelta y foco programático en el panel destino; en tablet
  se muestran lista y conversación, y el detalle sustituye a la conversación; en escritorio conviven los tres.
- **Estado del chat = solicitud más reciente del contacto.** El adaptador enriquece cada página de
  conversaciones con una **segunda consulta acotada a los contactos de la página** (`requests` por
  `contact_id`), sin N+1. El dominio expone `latestRequest` en `ConversationSummary` y una regla pura
  `latestRequest()` por `(created_at, id)`. Los estados sin solicitud se muestran como «Sin estado».
- **Indicador de estado accesible:** color, ícono propio y texto visible («Pendiente», «En proceso», etc.).
  El color nunca es la única señal.
- **Filtros de la lista locales:** chips por estado y búsqueda por nombre/teléfono filtran lo ya cargado,
  sin navegación ni consulta al servidor. El valor se refleja en la URL (`q`, `status`) con
  `history.replaceState` y cada enlace de conversación arrastra `q`, `status` y `filter`, por lo que el
  estado se conserva al navegar y al compartir el enlace.
- **Solo texto y llamadas:** se retiró el reproductor de audio y no se renderizan imágenes ni documentos.
  Un audio se representa por su transcripción; si no la tiene, por su etiqueta. Las llamadas son tarjetas
  compactas clicables dentro de la línea de tiempo.
- **Reporte y sesión bajo demanda:** las llamadas ya cargadas bastan para el reporte (inicio, duración,
  resultado y resumen). Los turnos se piden al pulsar «Ver sesión» con una server action que resuelve el
  tenant desde la sesión y aplica la RLS; nunca se acepta el tenant del cliente. La transcripción usa
  `call_turns` como burbujas (cliente a la izquierda, asistente a la derecha) y muestra estados vacío,
  cargando y error.
- **Paginación y Realtime intactos:** se conservan los cursores de S04, «Cargar más»/«Cargar anteriores»,
  la mezcla por tipo+id y `router.refresh()` de S03. Se añadió `aria-live` para anunciar mensajes nuevos
  sin mover el foco.
- **Skeletons por panel:** lista, conversación, contacto y transcripción tienen su propio esqueleto; el
  fallback de la página compone los tres paneles. Cada panel tiene estados vacío y error propios.
- **Seed demo idempotente:** contactos en los cinco estados (incluido «Sin estado»), conversaciones,
  mensajes, solicitudes, dos llamadas y cinco turnos con ids fijos y `ON CONFLICT DO NOTHING`.

### Deudas y riesgos

- **Búsqueda y chips filtran solo páginas cargadas.** Con muchas conversaciones, un contacto antiguo no
  aparece hasta pulsar «Cargar más». Si el volumen lo exige, el siguiente paso es llevar `q`/`status` a la
  consulta keyset del servidor.
- **Solicitudes por página:** la segunda consulta trae todas las solicitudes históricas de los contactos
  visibles. Está acotada por página (30 contactos), pero no por número de solicitudes; conviene un índice
  parcial o `DISTINCT ON` si crece.
- **Turnos sin paginar:** una llamada con transcripción muy larga se carga completa al abrir la sesión.
- **Hora relativa:** se calcula en el cliente después de montar y se refresca cada minuto; el HTML inicial
  muestra la hora absoluta para evitar desajustes de hidratación.
- **Sin verificación visual en navegador:** no hay Chrome en el entorno. Se verificaron tipos, lint,
  pruebas, build y la respuesta de las rutas, pero no se revisaron capturas ni interacción real.
- **Riesgo heredado de S04:** la identidad verificada depende de que el matcher del proxy cubra toda ruta
  que use `requireUser()`; una ruta nueva fuera del matcher falla cerrado (redirige a login).

## Pendientes de la primera llamada real (S09)

- **Idempotencia de turnos en la BD:** índice único `(call_id, position)` en `call_turns` (la migración
  elimina antes duplicados, conservando la fila más antigua) e inserción con `ON CONFLICT DO NOTHING`;
  el filtro previo por `seq` se mantiene para evitar escrituras en reintentos.
- **`terminate` de Meta no cierra la fila `calls`:** solo cuelga el lado LiveKit con `USER_INITIATED`
  (best-effort). La fila se cierra con el `end` del worker, que trae motivo y duración.
- **`end` con `time_limit`** (con o sin `hangup_failed`) cuelga con `BUSINESS_INITIATED`; si Meta ya
  terminó la llamada se registra el error y se responde 200. Un `end` repetido no vuelve a colgar.

### Deudas

- **Sin cierre de respaldo si el worker no envía `end`:** la fila queda abierta; hace falta un barrido o
  cierre por tiempo máximo.
- **Resumen y memoria todavía no se generan** (slice 05); el `end` solo guarda motivo y duración.
- **`hangup_failed` se guarda como texto en `error`:** `calls` no tiene columna `error`, así que hoy se
  descarta al persistir y no hay alerta.
- **Sin verificar contra Meta ni LiveKit reales:** la desconexión `BUSINESS_INITIATED` solo se probó con
  dobles.

## S11 · Responder texto con IA

Handoff: `odd/handoffs/S11-ai-text-reply.md`. Módulo nuevo `modules/assistant` (dominio, aplicación,
infraestructura, composición y `index.ts`), sin migraciones.

### Decisiones

- **Disparo desde la ingesta:** `IngestWhatsAppWebhook.execute` devuelve los mensajes insertados
  (`created === true` en `insertMessageIfNew`). El webhook ya usaba `after()` de `next/server`; solo se
  amplió ese callback con `dispatchAssistantReplies`, que absorbe cualquier error. Así la respuesta 200
  a Meta no espera al LLM ni a Graph.
- **Idempotencia sin migración:** el reclamo usa `webhook_events` con `provider = "assistant"` y
  `event_id = reply:<wamid>` y `ON CONFLICT DO NOTHING`. El mismo wamid nunca genera dos respuestas,
  aunque Meta reenvíe el evento o se reintente el caso de uso.
- **Anti-bucle:** se descartan mensajes `direction = "outbound"` y ecos del propio número. El número
  propio se toma de `business_profiles.contact_phone`, con respaldo en
  `whatsapp_numbers.display_phone`, normalizando dígitos.
- **Mensajes no textuales:** la regla 2 pide una respuesta fija corta para audio/imagen/documento sin
  LLM; por eso esos mensajes también se despachan, pero el caso de uso usa `TEXT_ONLY_REPLY` y nunca
  llama al modelo. La integración con LLM queda reservada a `kind = "text"`.
- **Prompt:** el system prompt se arma solo con el `BusinessContext` del tenant (negocio, horarios,
  catálogo, FAQs, políticas y mensaje de escalamiento). El texto del cliente viaja como último mensaje
  de usuario; nunca entra al system prompt.
- **Proveedores:** Graph usa la versión `v25.0` de `scripts/meta-check.mts` y el token
  `WHATSAPP_ACCESS_TOKEN`. El modelo sale de `LLM_MODEL` y la key de `GROQ_API_KEY`; ambas son
  opcionales y su ausencia se registra como error sin romper el webhook. El adaptador de Groq (fetch, sin SDK) se crea con
  `timeout = 15_000` ms y `maxRetries = 1`.
- **Errores redactados:** `redactError` sustituye credenciales (Bearer y claves `sk-ant-`) antes de
  escribir en `webhook_events.error`. Un fallo de Graph impide guardar el outbound.

### Deudas y riesgos

- **Adaptador temporal del negocio:** `SupabaseBusinessContextReader` consulta las cinco tablas con
  service_role. Cuando `modules/business` exponga `getBusinessContext(tenantId)`, se cambia solo una
  línea en `modules/assistant/composition.ts`.
- **Sin verificación real:** no se probaron respuestas reales de Groq ni envíos reales a Meta por
  falta de credenciales; las pruebas usan dobles y la API local.
- **Realtime no verificado de extremo a extremo:** el outbound se escribe en la misma tabla `messages`
  con `direction = "outbound"`, que es lo que consume la bandeja y la publicación Realtime existente;
  no se abrió un canal Realtime en la prueba.
- **Tiempo total del LLM:** el timeout de 15 s es por intento de la SDK; con 1 reintento el tiempo de
  pared puede ser mayor. `after()` está limitado por `maxDuration` de la ruta.
- **Gasto y token:** el tope es 20 respuestas por hora y conversación (`MAX_REPLIES_PER_HOUR`). Un
  cambio de ese valor o del modelo afecta costos y comportamiento; los tokens solo viven en variables
  de entorno del servidor.
- **Sin reintento automático:** si el LLM o Graph fallan, el error queda en `webhook_events.error`,
  pero un reenvío de Meta no vuelve a disparar la respuesta porque el mensaje entrante ya existe.
  La recuperación es manual o requiere un job futuro.

## Parte 3 del rediseño (S10)

Rama `feat/ui-p3-login-home` desde `feat/ui-p2-fundacion`. Sin commit ni push.

- **Validación del login en español:** `noValidate` + zod por campo. `loginFieldErrors` envuelve
  `credentialsSchema` sin duplicar reglas; la contraseña en login sigue siendo solo no vacía y
  la regla fuerte queda reservada para alta/cambio. Error de credenciales genérico, sin revelar
  si el correo existe. Reason: el navegador mostraba mensajes en inglés y la validación nativa
  bloqueaba antes de la acción.
- **Conectado deja de pedir configuración:** cuando `view.showForm` es `false`, la tarjeta oculta
  el formulario y los pasos de Meta; conserva la URL del webhook y el botón de copiar. El token
  de verificación nunca se renderiza ni entra al portapapeles. Reason: el estado "Conectado"
  contradecía la guía que seguía pidiendo suscribir `messages`.
- **Título "WhatsApp del negocio" y saludo según estado:** se evita que el título "Conectar
  WhatsApp" acompañe al badge "Conectado" y que el lead pida conectar cuando ya hay número.
  El saludo personalizado del artboard (nombre y negocio) se omite porque esos datos no llegan a
  `/home` y el handoff prohíbe tocar auth. Reason: consistencia entre título, badge y copy.
- **Campos del login normalizados:** la server action convierte a string vacío lo que no sea
  texto antes de validar; así un campo ausente responde en español y nunca llega a `parse`.
  Reason: robustez de la frontera con `FormData`.
- **Métricas declaradas como próximamente:** `—` y "Disponible pronto" hasta la Parte 5, sin
  cifras inventadas ni consultas nuevas.
- **Deuda P2 saldada:** los esqueletos de home usan `role="status"` con texto accesible y barras
  `aria-hidden`; `CardSkeleton` recibe el mismo correctivo para el resto de pantallas.
- **Deuda P2 saldada:** los titulares de login y home usan `--font-display` de forma explícita;
  la comprobación queda cubierta con `document.fonts.check` en el navegador. El check debe
  aplicarse a la primera familia resuelta: pasar la lista completa de `font-family` da falso.
- **Contención del texto solo para lectores de pantalla:** el `sr-only` de cada métrica de `/home`
  necesita un contenedor `relative`; sin él se posiciona contra el documento, escapa del `main`
  con `overflow-y-auto` e infla `html.scrollHeight`. Reason: el shell exige que solo `main`
  desplace; la corrección es una clase, no un cambio de layout.
- **Localizadores E2E estables:** el botón de copiar cambia su nombre accesible a "URL copiada",
  así que la prueba lo localiza por `button[type="button"]`, no por el nombre inicial. Reason: el
  nombre accesible debe reflejar el nuevo estado; el test no debe depender de él.

### Verificación

- `pnpm lint`, `pnpm typecheck`, `pnpm test` (137/137), `pnpm arch`, `pnpm db:test` (65/65),
  `pnpm test:e2e` (45 passed, 5 skipped) y build dummy: todos exit 0.
- La medición "antes" se rehízo sobre `683a5a7` con el mismo método y reprodujo los valores base.
  HTML: `/login` 11 484 → 16 825 B; `/home` 34 852 → 50 812 B. JS: 550 936 → 552 226 B y
  562 432 → 564 699 B; peticiones de JS sin cambios (9 y 10).
- **Aprendizaje de entorno:** el E2E debe correr sobre un build hecho con las claves locales
  reales; con `NEXT_PUBLIC_*` en `dummy` el Realtime de la bandeja falla por `MalformedJWT`.

### Deudas

- **JS de `/home` ya era alto antes de esta entrega** (562 432 B en la medición base); se vigila
  que la Parte 3 no lo incremente salvo por la funcionalidad nueva.
- **Sin juicio de píxeles:** axe, E2E y fuentes se verifican en navegador, pero nadie revisó la
  composición visual real contra los artboards; queda pendiente una revisión humana de capturas.

## 2026-11-27 · Voz: se mantiene S2S con Phonic

- Se descartó pasar a cascada (Deepgram + Groq + Cartesia). `reference/ai-call-center` es solo referencia de consumo de LLM y respuestas en audio. El worker sigue con S2S (Phonic) y arquitectura basada en servicios; el contrato no cambia.

## 2026-11-27 · S14: registro de cuentas

- **Alta atómica en el caso de uso:** `RegisterAccount` valida, crea usuario, negocio y membresía
  y deshace tenant y usuario si falla cualquier paso, incluido el inicio de sesión posterior:
  la acción llama a `rollback` con los identificadores devueltos. Reason: no hay transacción
  que abarque Auth y PostgREST a la vez; el deshacer explícito es la única frontera consistente.
- **Deshacer sin reintento:** si Supabase rechaza el borrado de compensación, `RegisterAccount`
  conserva el error original y no expone el detalle interno. Reason: un error de deshacer no debe
  ocultar ni filtrar el motivo del alta; queda como deuda operativa si el proveedor falla.
- **Tenant siempre generado en servidor:** el slug se deriva del nombre del negocio con un
  sufijo aleatorio y el `tenant_id` nunca entra en el `FormData`. La membresía usa el rol
  por defecto (`operator`) porque el esquema no define `owner`. Reason: un cliente no puede
  asignarse a un tenant ajeno.
- **Correo duplicado sin distinción de proveedor:** se detecta por código o mensaje de GoTrue
  y se devuelve siempre `Ya existe una cuenta con ese correo.`; cualquier otro error se
  convierte en un mensaje genérico. Reason: no filtrar existencia de cuentas ni detalles internos.
- **Login intacto:** el único cambio es el enlace "Crear cuenta"; el inicio de sesión sigue sin
  aplicar la regla de contraseña fuerte, que solo rige el alta. Reason: no invalidar cuentas
  existentes ni ampliar el alcance del handoff.
- **Deuda P2 — sin límite de abuso en la app:** el registro no añade captcha, rate limit ni
  verificación propia. Solo existe `auth.rate_limit.sign_in_sign_ups = 30` en la configuración
  local de Supabase. Reason: el handoff pide anotarlo, no implementarlo; cualquier control
  nuevo necesita una decisión de producto sobre fricción y coste.

## 2026-11-27 · S17: rediseño de Contactos, Negocio, Asistente y Cuenta

- **Presentación separada de datos:** los formularios de Negocio y Asistente conservan sus
  actions, nombres de campo y validación; solo cambian clases, títulos y estados. Reason: el
  handoff autoriza el rediseño, no una nueva API ni un cambio de contrato.
- **Sin estados inventados:** Contact no expone estado de conversación, así que la lista no
  muestra los chips del artboard. Reason: un estado falso sería peor que una columna ausente.
- **Progreso derivado:** la tarjeta de Negocio cuenta cuatro secciones ya consultadas por la
  página. Reason: dar contexto sin añadir consultas ni cifras inventadas.
- **Dominio cerrado en Asistente:** se conservan `roberto | eduardo` y `es-MX`; los nombres de
  voz del artboard no se adoptan. Reason: el esquema es la fuente de verdad y el rediseño no
  puede ampliar la validación.
- **Cuenta sin mutaciones nuevas:** solo se muestra la sesión real y se reutiliza el POST de
  logout; guardar datos y cambiar contraseña quedan como "Próximamente". Reason: no hay backend
  para esas funciones y el handoff prohíbe lógica falsa o cifras inventadas.
- **Excepción de pruebas:** `vitest.config.ts` incluye `tests/*.test.ts`; las pruebas nuevas
  están en la superficie permitida `tests` y no arrastran `tests/integration/**`. Reason:
  `pnpm test` solo contaba `modules/**` y `shared/**`, fuera de la lista de superficies.
- **Sin E2E:** no se usó el puerto 3200. Reason: otro agente posee ese puerto y el handoff prohíbe
  ejecutar la suite E2E. axe y overflow se comprobaron aparte en el puerto 3300 sin hallazgos.
