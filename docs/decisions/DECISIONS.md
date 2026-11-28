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

## 2026-11-27 · S15: ligar el número sin pedir el phone_number_id

Handoff: `odd/handoffs/S15-link-number.md`. Sin commit ni push.

### Decisiones

- **Un solo campo visible:** la tarjeta pide únicamente el número en formato internacional; se eliminaron el input, el valor del `FormData`, el mensaje de unicidad con la palabra «ID» y el `phoneNumberId` de `WhatsAppConnection`. Reason: el cliente no debe ver ni conocer el identificador técnico; el adaptador de Supabase sigue usándolo internamente para resolver el tenant del webhook.
- **Puerto `WhatsAppNumberLookup`:** el caso de uso pide los números de la cuenta y compara por dígitos con `normalizePhone` de `modules/assistant` (exportado por su `index.ts`). Así `+52 1 55 1234 5678` liga con `5215512345678` y la comparación queda cubierta con un fake. Reason: la normalización ya existía como helper público del dominio de assistant.
- **Adaptador Graph:** `GET /{WABA_ID}/phone_numbers?fields=id,display_phone_number,verified_name` con la versión `v25.0` y `WHATSAPP_ACCESS_TOKEN` solo en la cabecera. Timeout de 10 s por intento y un reintento. Los errores del caso de uso son genéricos: no incluyen token, cuerpo ni estado HTTP. Reason: evitar filtrar credenciales o detalles internos al cliente y no bloquear la UI ante fallos transitorios.
- **WABA configurable:** `WHATSAPP_BUSINESS_ACCOUNT_ID` es opcional en `shared/env.server.ts`; sin valor se responde «Falta configurar la cuenta de WhatsApp Business de la plataforma.» Reason: no fijar el id de la cuenta en código.
- **Estado y unicidad sin cambios:** se guarda `pending` y se mantiene `UNIQUE(phone_number_id)`; un número ajeno responde «Ese número ya está conectado a otro negocio.». El tenant sigue viniendo de `resolveTenantId()` en servidor. Reason: no alterar la llegada del primer webhook ni la frontera de autorización.

### Deudas y riesgos

- **Sin verificación contra Graph real:** las pruebas del adaptador usan `fetchImpl` falso; no se llamó a la cuenta de Meta. Queda pendiente una prueba con un token real.
- **`GRAPH_API_VERSION` duplicado:** el adaptador define `v25.0` porque las superficies permitidas por el handoff no incluyen `modules/assistant`. Si Graph cambia de versión hay que actualizar dos lugares.
- **Sin id técnico en el cliente:** `GetWhatsAppConnection` ya no lo devuelve, pero la tabla `whatsapp_numbers` sigue guardándolo; es necesario para el webhook. No hay migración nueva.

## 2026-11-27 · S18: `Date.now()` solo con sesión real

- **Causa raíz:** `createServerClient` registra `onAuthStateChange`; con las cookies de sesión
  reales, auth-js carga la sesión y compara `expires_at` con `Date.now()` (traza `__loadSession /
_useSession / _emitInitialSession`). Al crear el cliente dentro del render, Next intentaba
  prerenderizar esa lectura en `/home`, `/inbox`, `/business`, `/assistant` y `/contacts` de `next
start` con la sesión del usuario demo. El build sin cookies salía limpio: el fallo no era de
  compilación. Bisect: al dejar `getAll()` sin cookies en el cliente, el error desaparecía.
- **`connection()` en el creador, no en cada página:** `await connection()` va al inicio de
  `createClient()` en `shared/supabase/server.ts`, antes de `cookies()` y de `createServerClient`.
  Reason: es el único punto por donde pasan los clientes con sesión (tenant, conversaciones,
  negocio y auth) y las páginas ya están dentro del `Suspense` del layout del dashboard. Esto no
  revive la decisión H4 de S04 (layout); la frontera dinámica baja al creador del cliente. No se
  desactivó `cacheComponents` ni se ocultó el error con `try/catch`.
- **Medición con sesión, `next start -p 3400`:** HTML `/home` 50 878 → 51 316 B y `/inbox`
  80 838 → 80 966 B; JS sin cambio material (789 887 → 789 887 B y 1 181 199 → 1 181 128 B).
  La tabla de rutas sigue idéntica, con las cinco rutas en ◐ (Partial Prerender). El log del
  servidor pasó de 1 error `Date.now()` por petición a 0 con 27 peticiones RSC reales (16 de
  prefetch). Reason: el coste es ~0,4 KB de HTML por el límite de Suspense; no hay regresión de
  rendimiento ni cambio de estrategia de caché.
- **Prueba de regresión:** `shared/supabase/server.test.ts` fija el orden `connection()` →
  `createServerClient` con `vi.mock`. Reason: el fallo original depende de una sesión real, que no
  se puede reproducir en una prueba unitaria sin arrancar el servidor.

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

## 2026-11-27 · S19: resumen y memoria al terminar una llamada

- **Memoria por contacto en `public.contact_memory`:** PK `(tenant_id, contact_id)`, FK compuesta
  a `contacts`, `facts jsonb` validado con `jsonb_has_secrets` y RLS con lectura por
  `current_tenant()`; la escritura corresponde solo al servidor con `tenant_id` explícito.
  Reason: el contexto del worker debe traer memoria real sin secretos ni escritura del cliente.
- **Resumen fuera de la respuesta del `end`:** `EndCall` programa a través del puerto
  `ScheduleCallSummary` y el adaptador `AfterCallSummary` usa `after()` de `next/server`. Un fallo
  al programar se ignora; un fallo del LLM solo registra un código redactado.
  Reason: el worker espera respuesta en menos de 5 segundos y el texto del cliente nunca se loguea.
- **Idempotencia en dos niveles:** un segundo `end` no reprograma el resumen y `saveCallSummary`
  solo actualiza si `summary` está vacío o nulo. El guard se adquiere antes de fusionar memoria,
  así solo el ganador escribe `contact_memory`. Reason: dos `end` en carrera no duplican llamadas
  al LLM ni concatenan dos veces el resumen del contacto.
- **Transcripción como contenido de usuario:** system prompt fijo, tope de 40 turnos y
  12 000 caracteres, salida validada con zod y limpieza defensiva de bloques `<think>…</think>`.
  Reason: el cliente no puede inyectar instrucciones en el resumen ni ensuciar la memoria.
- **Siguiente paso (fuera de este handoff):** las conversaciones de texto todavía no alimentan
  memoria; las atiende otro agente en `modules/assistant`. Reason: el handoff excluye ese módulo.

### Verificación

- `pnpm test`: 38 archivos, 230 pruebas (base: 36 archivos, 211 pruebas). `pnpm lint`,
  `pnpm typecheck` y `pnpm arch`: exit 0. `pnpm test:integration`: 6 archivos, 31 pruebas.
- `pnpm db:test`: la prueba nueva `contact_memory.test.sql` pasa. El conjunto quedó en
  `Result: FAIL` porque la base local compartida tiene aplicada la migración `20260108000000`
  (ausente en este worktree), que dejó `requests` en la publicación `supabase_realtime` y rompió
  `realtime_publication.test.sql`. Reason: no se modificó esa migración ni la publicación ajena;
  se reporta como fallo ambiental, no propio.

## 2026-11-27 · S16: bandeja Parte 4 y ventana flotante de llamada

- **Ventana flotante con `<dialog>` nativo:** `showModal()` aporta el modo, el atrape de foco y
  Escape; el título recibe el foco al abrir. Reason: evita reimplementar un focus trap con variables
  de estado y aprovecha el comportamiento del navegador para lectores de pantalla.
- **Devolución de foco diferida:** el navegador restaura el foco por su cuenta al cerrar, por lo
  que el botón que abrió la ventana se enfoca de nuevo tras un `setTimeout` corto. Reason: sin ese
  segundo intento el foco queda en `body`, como se reprodujo en Chromium.
- **Tres columnas solo desde `xl` (1280 px):** a 1024 px la lista y la conversación conviven y el
  panel de contacto/reporte se superpone; en móvil se muestra un panel a la vez. Reason: coincide
  con los artboards y evita comprimir la conversación en tres columnas a 1024 px.
- **La transcripción ya no reemplaza al hilo:** al abrir "Ver sesión" se muestra un diálogo; el
  historial queda montado y conserva su desplazamiento. Reason: el handoff pide preservar la posición
  del hilo, y el reporte sigue visible como contexto.
- **Excepción a la lista literal de superficies:** se añadió `tests/**/*.test.ts(x)` a `include` en
  `vitest.config.ts`. Reason: el handoff exige que `pnpm test` cuente pruebas nuevas y la configuración
  original solo descubría `modules/**` y `shared/**`; las pruebas mismas viven en `tests/`, dentro de
  la superficie permitida.

## 2026-11-27 · S21: tarjeta de conexión sin datos de plataforma

- **Modelo de cliente reducido:** `WhatsAppConnection` solo expone `status` y `displayPhone`.
  Se eliminaron `webhookUrl` y `verifyTokenConfigured` de `GetWhatsAppConnection` y del
  componente, junto con el botón de copiar y los pasos de configuración. Reason: esa información
  pertenece a la plataforma; ningún dato de plataforma debe viajar a un componente cliente.
- **La URL del webhook no se movió a otra pantalla:** sigue siendo responsabilidad del operador y
  de `pnpm meta:check`. El handoff la ubica en `docs/05-despliegue.md`, que no existe en este
  worktree; no se creó porque no está en las superficies permitidas.
- **Estados en lenguaje humano:** `pending` pasó a "Listo: esperando tu primer mensaje" y muestra
  el número con la acción secundaria "Cambiar número" en lugar del formulario abierto. Reason:
  esperar el primer mensaje no es una tarea de configuración del cliente.
- **Errores sin jerga:** formato, número no registrado y fallo del servicio tienen textos
  acordados; la causa técnica (cuenta de la plataforma ausente, error del proveedor) se registra
  solo en el log del servidor. Reason: evitar que credenciales o detalles internos lleguen a la UI.
- **Normalización en servidor:** se aceptan espacios, guiones y paréntesis y se guarda E.164; sin
  `+` solo se normalizan cadenas de 11 a 15 dígitos para no interpretar un número local como
  internacional. Reason: conservar la validación S15 y su comparación por dígitos.

## 2026-11-27 · S22: memoria compartida entre texto y voz

- **Bloque de datos delimitado:** la memoria y el resumen de las últimas tres llamadas entran en
  `<<DATOS_DEL_CLIENTE>> … <</DATOS_DEL_CLIENTE>>`, etiquetados como datos no instrucciones, con
  1200 caracteres de resumen, 20 hechos y 200 caracteres por valor. Reason: el contenido viene de
  texto del cliente; los delimitadores se eliminan del contenido para impedir que falsifique el cierre.
  Sin memoria, `buildSystemPrompt` devuelve exactamente el prompt anterior.
- **Un adaptador de lectura en `assistant`:** `SupabaseTextMemoryReader` lee `contact_memory`, las
  llamadas resumidas y el conteo de mensajes con `tenant_id` y `contact_id` explícitos tomados de la
  fila ya resuelta, nunca del texto entrante. Reason: la composición de texto no necesita conocer la
  implementación de `modules/memory` y el service_role no deduce el tenant de la RLS.
- **Umbral en el asistente, enfriamiento en memoria:** el asistente programa un resumen solo con 8
  mensajes entrantes nuevos desde `contact_memory.updated_at`; `SummarizeConversation` reutiliza el
  puerto LLM, `parseSummaryOutput`, `buildTranscript` y `mergeMemory`, aplica 10 minutos de
  enfriamiento y hace CAS sobre `updated_at`. Reason: una sola fuente de verdad para la marca evita
  duplicados cuando dos respuestas terminan al mismo tiempo.
- **`after()` anidado es seguro:** el webhook ya usa `after()` y Next 16.4 permite anidar llamadas;
  el programador registra solo el código fijo `S22_MEMORY_SUMMARY_FAILED`, nunca texto del cliente.
  Reason: el 200 a Meta ya salió y ningún fallo de memoria debe provocar reintentos.
- **Sin migraciones:** `updated_at` ya existía en `contact_memory` y `summary` en `calls`, así que el
  marcador y el historial de llamadas se usan sin tocar el esquema.

## 2026-11-27 · Realtime tarda en recuperarse tras `supabase db reset`

- **Hecho observado (validación 3):** justo después de `db reset` los dos tests de Realtime
  (`inbox-pagination-tenancy` y `ai-requests`) agotan 40 s aun con 4 reintentos de suscripción y 20 s
  de espera previa; en una segunda pasada inmediata pasan los 38 tests de integración (10 archivos).
- **Causa probable (no confirmada):** el contenedor de Realtime se reinicia con el reset y tarda más
  de un minuto en aceptar suscripciones. No hay evidencia de fuga entre negocios: el aislamiento
  también se prueba por RLS en los demás tests, que pasan.
- **Tratamiento:** tras un reset, correr la integración dos veces o esperar a que Realtime responda.
  No se suben los reintentos ni los tiempos; eso ocultaría un fallo real.
- **Regla operativa:** nunca resetear la base local mientras alguien prueba la app: borra los usuarios
  y la sesión (cookie válida, usuario inexistente) produce "no tienes un negocio asignado".

## 2026-11-27 · S23 · shadcn/ui real y MUI retirado

- **Decisión:** la interfaz usa shadcn/ui (`components/ui`: button, input, label, card, badge,
  textarea; `lib/utils.ts` con `cn`) sobre los tokens de la dirección A. Se retiraron
  `@mui/material`, `@mui/icons-material`, `@mui/material-nextjs`, `@emotion/react`,
  `@emotion/styled`, `ThemeRegistry.tsx` y la capa CSS `mui`. Reason: el PDF exige shadcn/ui y MUI
  solo aportaba un proveedor de tema sin ningún componente visible.
- **Componentes escritos a mano, no con la CLI:** se siguió el código new-york oficial con las
  variantes calibradas para reproducir el aspecto anterior; así `app/globals.css` conserva los
  tokens y la paleta sin que una CLI los sobrescriba. `bg-accent` sigue siendo el coral; el botón
  principal lo usa en lugar del acento neutro de shadcn.
- **Medición:** el JS de cliente baja ≈ 55 kB en `/login` y `/signup` y ≈ 50 kB en `/home`
  (672 551 → 617 288 B, 673 323 → 618 034 B y 677 386 → 627 056 B). Detalle en `docs/ui-setup.md`.
- **Pendiente de verificar:** el aspecto visual real y los E2E (los corre el orquestador).

## 2026-11-27 · S24 · La IA responde por texto, conoce los productos y resume la llamada

- **Causa 1 (respuesta vacía):** `GroqLlmAdapter` mandaba `max_tokens=300` sin desactivar el
  razonamiento; Qwen gastaba los tokens en `<think>` y tras limpiarlo no quedaba texto. **Decisión:**
  enviar `reasoning_effort:"none"` y `reasoning_format:"hidden"` (igual que el resumidor), subir
  `max_tokens` a 500, conservar la limpieza de `<think>` y, si aun así queda vacío, un único
  reintento con una instrucción de sistema más corta antes de fallar.
- **Causa 2 (Graph 400):** el cuerpo de error de Meta se descartaba. **Decisión:**
  `GraphWhatsAppSender` lee `error.code`, `error.message` y `error.error_data.details`, redacta el
  token y los incluye en el error y en el log (solo estado y código). **Hipótesis, NO confirmada:**
  los destinatarios mexicanos `521` + 10 dígitos devuelven 400 con código 131030; si llega ese
  código con ese formato se reintenta UNA vez con `52` + 10 dígitos. Hasta ver el código real en
  `webhook_events`/logs no se sabe si el 400 observado era ese; el reintento no afecta otros códigos.
- **Resumen de llamada (`invalid_output`):** `parseSummaryOutput` invalidaba todo por un solo hecho
  no escalar. **Decisión:** solo el resumen es obligatorio; los hechos se sanean (listas/objetos a
  texto JSON corto, valores recortados a 200, claves vacías y excedentes sobre 20 descartadas).
  Se extrae el JSON aunque venga rodeado de texto. El motivo fijo (`empty_output`, `no_json`,
  `not_object`, `empty_summary`) se registra sin texto del cliente.
- **Voz sin catálogo:** `GetCallContext` solo mandaba preguntas y horarios. **Decisión:** el contrato
  con el worker no cambia (mismas claves); `business.faq` ahora lleva las secciones SOBRE EL NEGOCIO,
  DIRECCIÓN, POLÍTICAS, PRODUCTOS Y SERVICIOS (con precio y moneda) y PREGUNTAS FRECUENTES, con tope de
  6000 caracteres cortando por elementos completos. `GetBusinessContext` ahora excluye los productos
  inactivos, lo que también corrige el prompt de texto (que ya incluía catálogo, dirección,
  políticas y horarios, pero listaba inactivos).
- **Guardado:** `SaveCatalogItems` y `SaveFaqs` ignoran en el servidor los renglones totalmente
  vacíos (sin nombre/descripción/precio, o sin pregunta/respuesta) y siguen rechazando los
  parcialmente llenos. Horarios no aplica: no tiene renglones en blanco. Los `catch` de las
  acciones de `business` y `assistant` registran nombre y mensaje del error, nunca datos del cliente.
- **Pendiente de verificar:** el código real de Meta y el efecto en WhatsApp real, y el aspecto en el
  navegador (E2E los corre el orquestador).

## S25 · Bandeja sin recargar la lista y formularios que no pierden datos

- **Causa:** `/inbox/[conversationId]` cargaba lista, hilo y panel en cada navegación y su `loading.tsx` pintaba el esqueleto de las tres columnas.
- **Decisión:** la lista vive en `inbox/layout.tsx` (no se re-renderiza al navegar); `[conversationId]/page.tsx` carga solo hilo y panel, con su propio `loading.tsx` (`ConversationViewSkeleton`). Verificado en navegador: el nodo de la lista conserva su identidad al cambiar de contacto. Caso e2e: "la lista no se desmonta".
- **Formularios de negocio:** no envían renglones vacíos, muestran el resultado con `aria-live` junto al botón, avisan de cambios sin guardar (`beforeunload`) y conservan lo escrito tras guardar. Lógica pura en `components/atoms/form-draft.ts` con pruebas.
- **No verificado:** la tabla antes/después de bytes de HTML/JS (el agente se quedó sin cuota) y el e2e completo en esta rama.
- **Desbordamiento por tokens largos en resúmenes:** se añadió `break-words` al resumen en
  `CallCard`, `CallReportPanel` y `CallWindow`. Reason: `whitespace-pre-wrap` y `line-clamp-2`
  recortan visualmente, pero no parten una URL sin espacios; con datos reales de llamada el
  contenido alcanzó 3505 px de `scrollWidth` frente a 356 px de ancho útil. La corrección vive en
  los tres puntos que renderizan el mismo texto, no en un recorte del contenedor.
- **Coste medido de `/inbox`:** antes (commit `e51d702`) HTML 75968 B y JS 955940 B en 11 archivos;
  después (árbol de trabajo actual) HTML 78952 B y JS 962003 B en 11 archivos. Delta: HTML +2984 B
  (3,93 %) y JS +6063 B (0,63 %). Medido con dos builds de producción, el mismo seed local y
  Chromium a 1440×900, sumando cuerpos de respuesta sin comprimir del documento y los scripts.
  Reason: el aumento corresponde al estado de tres columnas, el panel de contacto y la ventana
  flotante; no se añadió ninguna biblioteca de UI ni archivo JS nuevo, y el diálogo nativo evita
  un mecanismo propio de foco. No es una medición de campo ni incluye caché o compresión.

## 2026-11-27 · S28 · Snapshot del negocio dentro de la llamada

- **Causa:** el worker pedía `GET /context` una sola vez con timeout de 3 s; si tardaba o fallaba, el
  agente arrancaba genérico y decía no tener productos ni horarios.
- **Decisión:** al contestar, la app arma el contexto con `GetCallContext` (tope de 2 s, errores
  tragados) y lo envía en `agents[].metadata` como `{"call_id", "context"}`. Sobre 48 000 bytes UTF-8
  se manda solo `call_id` con un aviso sin contenido. `GET /context` queda como respaldo y contrato.
  El participante sigue llevando solo `call_id`.
- **Idempotencia:** un reintento de Meta no vuelve a pedir snapshot ni a contestar.

## 2026-11-27 · S29 · Cuenta de entrega para los evaluadores

- **Decisión:** `scripts/seed-evaluator.mts` (`pnpm db:seed-evaluator`) crea de forma idempotente
  usuario, negocio vacío, membresía y el número de prueba ya en `connected`, como el usuario demo.
- **Reason:** los evaluadores deben caer en un negocio limpio del Supabase remoto sin usar la
  tarjeta de conexión (que deja el número en `pending` y exige consultar Graph). Nada en el código
  pasa de `pending` a `connected`; el seed demo lo escribe directo, y este script hace lo mismo.
- **Duplicación mínima:** el slug y las filas de alta se copian de `RegisterAccount` porque un
  script de Node no resuelve el alias `@/` ni importa módulos con `server-only`; compartirlo
  obligaría a cruzar fronteras de `pnpm arch`. `tests/seed-evaluator.test.ts` fija el formato.
- **Seguridad:** si el número es de otro negocio, falla sin moverlo; valida antes de crear nada.

## 2026-11-27 · S30 · Negocio ficticio para la cuenta de entrega

- **Decisión:** `EVALUATOR_BUSINESS_PRESET=cafeteria` en `scripts/seed-evaluator.mts` carga "Café Marimba"
  (datos en `scripts/demo-business-cafeteria.mts`): perfil, horarios, catálogo, FAQs y asistente.
- **Reason:** el documento de la prueba dice "inventa uno"; un negocio vacío dejaría al asistente sin
  productos ni horarios ante los evaluadores.
- **No destructivo:** cada sección se inserta solo si está vacía para ese negocio (idempotente).
  `tests/demo-business-cafeteria.test.ts` valida los datos con los esquemas de `modules/business`.

## S31 · Permisos explícitos de service_role (Supabase remoto)

- **Síntoma:** en el Supabase hospedado, `db:seed-evaluator` falló con `permission denied for table whatsapp_numbers` (42501).
- **Causa:** las migraciones daban permisos explícitos a `authenticated`, pero a `service_role` solo los daban los privilegios por defecto de Supabase local. Un proyecto hospedado puede no aplicarlos.
- **Decisión:** migración `20260109000000_service_role_grants.sql` con `GRANT` explícitos a `service_role` (tablas, secuencias, funciones y valores por defecto). No toca `anon` ni `authenticated`. Verificado en local: `service_role` accede; `anon` y `authenticated` siguen sin acceso a lo restringido; `db:test` 93/93.
- **No verificado:** su aplicación en el remoto (la hace el dueño con `supabase db push`).
