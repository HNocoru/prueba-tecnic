import { parsePhoneNumberFromString } from "libphonenumber-js";
import { z } from "zod";

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

const value = z.object({
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

const payload = z.object({
  entry: z.array(z.object({ changes: z.array(z.object({ value })) })),
});

export type ParseResult = { ok: true; messages: InboundMessage[] } | { ok: false; error: string };

/** Normaliza a E.164; wa_id de México llega como 521XXXXXXXXXX. */
function toE164(waId: string): string | null {
  const digits = waId.replace(/^\+/, "").replace(/^521(?=\d{10}$)/, "52");
  const parsed = parsePhoneNumberFromString(`+${digits}`);
  return parsed?.isValid() ? parsed.number : null;
}

/** Valida el payload de Meta y extrae los mensajes entrantes (statuses y tipos no soportados se ignoran). */
export function parsePayload(input: unknown): ParseResult {
  const parsed = payload.safeParse(input);
  if (!parsed.success) return { ok: false, error: "payload inválido" };

  const messages: InboundMessage[] = [];
  for (const entry of parsed.data.entry) {
    for (const { value: v } of entry.changes) {
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
  return { ok: true, messages };
}
