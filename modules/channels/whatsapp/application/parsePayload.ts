import { parsePhoneNumberFromString } from "libphonenumber-js";
import { z } from "zod";

import type { InboundCall } from "../domain/InboundCall";
import type { InboundMessage } from "../domain/InboundMessage";

const media = z.object({ id: z.string(), caption: z.string().optional() });

const message = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  timestamp: z.string().regex(/^\d+$/),
  type: z.string(),
  text: z.object({ body: z.string() }).optional(),
  audio: media.optional(),
  image: media.optional(),
  document: media.optional(),
});

const messageValue = z.object({
  metadata: z.object({ phone_number_id: z.string().min(1) }),
  contacts: z
    .array(
      z.object({
        wa_id: z.string(),
        profile: z.object({ name: z.string().optional() }).optional(),
      }),
    )
    .optional(),
  messages: z.array(message).optional(),
});

const callDescriptor = z.object({
  id: z.string().min(1).optional(),
  call_id: z.string().min(1).optional(),
  event: z.string().min(1),
  from: z.string().optional(),
  wa_id: z.string().optional(),
  timestamp: z.string().optional(),
  session: z.object({ sdp_type: z.string().optional(), sdp: z.string().min(1) }).optional(),
});

type CallDescriptor = z.infer<typeof callDescriptor>;

// Forma pública documentada: value.calls[]. También se tolera el evento plano en value
// (event/call_id) porque el formato real del Connector está "Por verificar".
const callValue = z.object({
  metadata: z.object({ phone_number_id: z.string().min(1) }),
  contacts: z.array(z.object({ wa_id: z.string() })).optional(),
  calls: z.array(callDescriptor).optional(),
  event: z.string().optional(),
  call_id: z.string().optional(),
  id: z.string().optional(),
  timestamp: z.string().optional(),
});

const payload = z.object({
  entry: z.array(
    z.object({
      // field distingue mensajes/statuses ("messages") de avisos como "account_update".
      changes: z.array(z.object({ field: z.string(), value: z.unknown() })),
    }),
  ),
});

export type ParseResult =
  { ok: true; messages: InboundMessage[]; calls: InboundCall[] } | { ok: false; error: string };

/** Normaliza a E.164; wa_id de México llega como 521XXXXXXXXXX. */
function toE164(waId: string): string | null {
  const digits = waId.replace(/^\+/, "").replace(/^521(?=\d{10}$)/, "52");
  const parsed = parsePhoneNumberFromString(`+${digits}`);
  return parsed?.isValid() ? parsed.number : null;
}

/** Timestamp de Meta en segundos; si falta, se usa la hora de recepción. */
function toDate(timestamp: string | undefined): Date {
  return timestamp && /^\d+$/.test(timestamp) ? new Date(Number(timestamp) * 1000) : new Date();
}

/**
 * Valida el payload de Meta y extrae los mensajes y eventos de llamada.
 * Se ignoran los cambios que no son de mensajes ni de calls (p. ej. account_update)
 * y los tipos no soportados.
 */
export function parsePayload(input: unknown): ParseResult {
  const parsed = payload.safeParse(input);
  if (!parsed.success) return { ok: false, error: "payload inválido" };

  const messages: InboundMessage[] = [];
  const calls: InboundCall[] = [];
  for (const entry of parsed.data.entry) {
    for (const change of entry.changes) {
      if (change.field === "calls") {
        const parsedCall = callValue.safeParse(change.value);
        if (!parsedCall.success) return { ok: false, error: "payload inválido" };
        const v = parsedCall.data;
        const descriptors: CallDescriptor[] =
          v.calls ??
          (v.event ? [{ event: v.event, id: v.call_id ?? v.id, timestamp: v.timestamp }] : []);
        for (const descriptor of descriptors) {
          if (descriptor.event !== "connect" && descriptor.event !== "terminate") continue;
          const waCallId = descriptor.id ?? descriptor.call_id;
          if (!waCallId) return { ok: false, error: "payload inválido" };
          calls.push({
            waCallId,
            phoneNumberId: v.metadata.phone_number_id,
            event: descriptor.event,
            waId: v.contacts?.[0]?.wa_id ?? descriptor.from ?? descriptor.wa_id ?? null,
            occurredAt: toDate(descriptor.timestamp ?? v.timestamp),
            sdpOffer: descriptor.session?.sdp ?? null,
          });
        }
        continue;
      }
      if (change.field !== "messages") continue;
      const parsedValue = messageValue.safeParse(change.value);
      if (!parsedValue.success) return { ok: false, error: "payload inválido" };
      const v = parsedValue.data;
      for (const m of v.messages ?? []) {
        const kind = m.type;
        if (kind !== "text" && kind !== "audio" && kind !== "image" && kind !== "document")
          continue;
        const mediaPart = kind === "text" ? undefined : m[kind];
        const profile = v.contacts?.find((c) => c.wa_id === m.from)?.profile?.name;
        messages.push({
          wamid: m.id,
          phoneNumberId: v.metadata.phone_number_id,
          waId: m.from,
          phoneE164: toE164(m.from),
          profileName: profile ?? null,
          kind,
          body: kind === "text" ? (m.text?.body ?? null) : (mediaPart?.caption ?? null),
          mediaId: mediaPart?.id ?? null,
          occurredAt: new Date(Number(m.timestamp) * 1000),
        });
      }
    }
  }
  return { ok: true, messages, calls };
}
