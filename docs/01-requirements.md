# 01 · Requerimientos

Fuente: PDF de la prueba técnica de 1to1ai ("Un asistente de IA para WhatsApp").

**Etiquetas de origen:** `[E]` explícito en el PDF · `[I]` inferencia nuestra · `[D]` decisión nuestra ·
`[S]` supuesto por confirmar.
**Estado de cada punto:** Definido · Ambiguo · Faltante · Supuesto.
**Prioridad:** Obligatorio · Recomendable · Opcional.

## 1. Contexto y objetivo

Construir una app web donde alguien llama o escribe al WhatsApp de un negocio, una IA lo atiende
y en una página queda **quién fue, qué se dijo y cómo terminó** `[E]`.

- No es para un negocio específico: debe servir a cualquiera que venda por WhatsApp. Para probarla
  se inventa uno `[E]`.
- El PDF fija un plazo de 3 días desde que se recibe `[E]`. Este proyecto se planea por slices, no
  por estimaciones de tiempo; el plazo real se gestiona fuera de estos documentos.
- Se permite usar IA sin límite `[E]`. Hay un canal de dudas por WhatsApp con los evaluadores `[E]`.
- **Qué significa "bien resuelto" `[I]`:** cumple todo lo pedido, el asistente se comporta bien en
  llamada y en texto, la app es clara y aguanta uso real durante una semana, y las decisiones
  están justificadas (el audio de entrega pide honestidad sobre lo que quedó mal).

## 2. Requerimientos funcionales

| ID    | Requerimiento                                                                                                   | Origen        | Prioridad                      |
| ----- | --------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------ |
| RF-01 | Un asistente de IA contesta llamadas y mensajes de texto en español de México                                   | `[E]`         | Obligatorio                    |
| RF-02 | La app sirve a cualquier negocio (datos multi-tenant: un negocio por número de WhatsApp)                        | `[E]` + `[I]` | Obligatorio                    |
| RF-03 | La primera vez que alguien llama o escribe, se crea su contacto                                                 | `[E]`         | Obligatorio                    |
| RF-04 | Cada contacto tiene una conversación con sus llamadas y mensajes en orden                                       | `[E]`         | Obligatorio                    |
| RF-05 | De cada llamada se guarda: cuándo fue, cuánto duró, cómo terminó, transcripción completa y resumen              | `[E]`         | Obligatorio                    |
| RF-06 | Memoria: si alguien vuelve, por voz o por texto, el asistente ya sabe de qué hablaron antes                     | `[E]`         | Obligatorio                    |
| RF-07 | Inicio de sesión: solo con sesión se ven la lista de contactos y la conversación de cada uno                    | `[E]`         | Obligatorio                    |
| RF-08 | Tope de 5 minutos por llamada: al llegar, el asistente se despide y cuelga                                      | `[E]`         | Obligatorio                    |
| RF-09 | Un webhook recibe los campos `calls` y `messages` de Meta                                                       | `[E]`         | Obligatorio                    |
| RF-10 | Responder notas de voz de WhatsApp (descargar, transcribir, responder y mostrar la transcripción)               | `[I]`         | Recomendable                   |
| RF-11 | Configuración del negocio (nombre, tono, preguntas frecuentes, horarios)                                        | `[D]`         | Obligatorio para cumplir RF-02 |
| RF-12 | Agenda por herramientas (`check_availability`, `book_appointment`, `request_human`) compartidas por voz y texto | `[D]`         | Opcional (diferenciador)       |
| RF-13 | Vista Kanban por etapa de la conversación                                                                       | `[D]`         | Opcional, al final             |

## 3. Requerimientos no funcionales

| ID     | Requerimiento                                                                                                          | Origen                                                                         |
| ------ | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| RNF-01 | Al menos 2 llamadas simultáneas                                                                                        | `[E]`                                                                          |
| RNF-02 | Disponible a cualquier hora durante la semana siguiente a la entrega; los evaluadores llamarán y escribirán sin avisar | `[E]`                                                                          |
| RNF-03 | Que aguante uso real: duplicados, reintentos, payloads inválidos, ráfagas                                              | `[E]` + `[I]`                                                                  |
| RNF-04 | UX clara, fácil de usar y que se vea bien                                                                              | `[E]`                                                                          |
| RNF-05 | Webhooks firmados: verificar `X-Hub-Signature-256` sobre el cuerpo crudo, y procesar de forma idempotente              | `[I]` (los evaluadores enviarán webhooks de prueba firmados con el app secret) |
| RNF-06 | Seguridad: RLS por tenant, secretos solo en servidor, rotar el app secret al terminar                                  | `[I]` + `[E]` (rotación)                                                       |
| RNF-07 | Latencia de voz baja (silencios largos se sienten como falla)                                                          | `[I]`                                                                          |
| RNF-08 | Observabilidad mínima: último webhook recibido, estado del worker de voz, proveedor de LLM activo                      | `[D]`                                                                          |

## 4. Stack y restricciones

- **Obligatorio `[E]`:** Next.js, TypeScript, Tailwind, shadcn/ui, Supabase (base de datos y login),
  despliegue en Vercel.
- Lo que no pueda correr en Vercel se construye y hospeda donde se prefiera `[E]`.
- Es libre elegir proveedores de LLM, STT y voz `[I]` (no hay restricción en el PDF; confirmar
  con los evaluadores si hay tope de gasto, ver §7).
- **Del número de prueba de Meta `[E]`:** las llamadas iniciadas por el cliente no se cobran; por
  texto solo responde a la lista de destinatarios (máximo 5); las llamadas vienen apagadas y hay
  que activarlas en la configuración del número; el webhook debe suscribirse a `calls` y `messages`.
  Hay que agregar a la lista de destinatarios el número de los evaluadores (+52 961 286 4799) `[E]`;
  eso deja 4 cupos para nuestras propias pruebas `[I]`.

## 5. Entregables `[E]`

Por WhatsApp, dentro del plazo:

1. Link del repo con README para correr la app (si es privado, dar acceso).
2. Audio de 3 a 5 minutos: qué fue lo más difícil, qué se decidió y qué se dejó mal.
3. Número de WhatsApp, URL de la app, usuario y contraseña (o registro), URL del webhook y app
   secret de Meta. Cambiar el app secret cuando termine el proceso.

## 6. Criterios de evaluación `[E]`

Que cumpla (funciona todo lo pedido) · experiencia de usuario · el asistente funciona bien en
llamadas y mensajes · que aguante uso real · cómo se resuelve (las decisiones y lo que se nos
ocurrió para que la app le sirva a un negocio).

## 7. Ambigüedades, faltantes y supuestos

| Tema                                                          | Estado   | Tratamiento actual                                                                                                                   |
| ------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| ¿Un solo negocio configurable o multi-negocio real?           | Ambiguo  | `[D]` Modelar multi-tenant en datos (tenant por `phone_number_id`); la demo usa un número, y se muestra un segundo negocio con datos |
| ¿Qué significa "cómo terminó"?                                | Ambiguo  | `[D]` Enum: `completed`, `caller_hangup`, `time_limit`, `failed`, `missed`                                                           |
| ¿Quién usa el login (dueño del negocio u operador)?           | Faltante | `[S]` Un usuario operador por negocio; email y contraseña                                                                            |
| ¿La transcripción incluye ambos lados?                        | Ambiguo  | `[S]` Sí, con rol y orden por turno                                                                                                  |
| ¿El asistente ejecuta acciones (agendar, pedidos)?            | Faltante | `[S]` Solo conversa con la información del negocio; la agenda es opcional (RF-12)                                                    |
| Idioma de la UI y de los resúmenes                            | Faltante | `[S]` Español                                                                                                                        |
| Si el cliente habla otro idioma                               | Faltante | `[S]` Responder en español de México                                                                                                 |
| Volumen y SLA más allá de "2 simultáneas"                     | Faltante | No inventar; diseñar para 2 simultáneas con holgura                                                                                  |
| ¿Se permite hospedar el webhook y el worker fuera de Vercel?  | Ambiguo  | El PDF permite hospedar fuera lo que no corra en Vercel; **confirmar por WhatsApp**                                                  |
| ¿Hay tope de gasto o restricción para APIs de pago?           | Faltante | **Confirmar por WhatsApp**                                                                                                           |
| ¿Prefieren WebRTC o SIP para las llamadas?                    | Faltante | `[D]` WebRTC (Calling API vía Graph API); confirmar                                                                                  |
| ¿Las llamadas de prueba serán desde celular (iPhone/Android)? | Faltante | La Calling API solo soporta esos dispositivos; documentar en el README                                                               |
| Retención y privacidad                                        | Faltante | `[S]` Guardar transcripción, no audio de llamadas                                                                                    |

## 8. Fuera de alcance `[D]`

Llamadas salientes del negocio, pagos, plantillas de WhatsApp, multimedia distinta de notas de
voz, onboarding completo de negocios, analítica avanzada, microservicios, telefonía SIP/PBX.
