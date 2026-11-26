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
