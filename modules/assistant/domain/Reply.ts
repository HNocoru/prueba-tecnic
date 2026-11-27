/** Tipos y reglas puras del asistente de texto (sin dependencias externas). */

export type MessageDirection = "inbound" | "outbound";
export type MessageKind = "text" | "audio" | "image" | "document";

/** Entrada del caso de uso: el mensaje entrante ya quedó persistido por el webhook. */
export interface ReplyRequest {
  readonly tenantId: string;
  readonly conversationId: string;
  readonly inboundMessageId: string;
}

export interface StoredInboundMessage {
  readonly id: string;
  readonly direction: MessageDirection;
  readonly kind: MessageKind;
  readonly body: string | null;
  readonly waId: string;
  readonly phoneE164: string | null;
}

export type SkipReason = "outbound" | "self_echo" | "duplicate" | "rate_limited" | "missing";
export type ReplyFailure = "llm" | "send" | "storage" | "unconfigured";

export type ReplyResult =
  | { readonly status: "sent"; readonly wamid: string }
  | { readonly status: "skipped"; readonly reason: SkipReason }
  | { readonly status: "failed"; readonly reason: ReplyFailure; readonly error: string };

export type InboundDecision =
  | { readonly allowed: true; readonly mode: "llm" | "text_only" }
  | { readonly allowed: false; readonly reason: "outbound" | "self_echo" };

/** Respuesta fija para mensajes no textuales: no consume LLM. */
export const TEXT_ONLY_REPLY = "Por favor envía tu mensaje en texto para poder ayudarte.";

/** Compara teléfonos ignorando espacios, paréntesis, guiones y el prefijo +. */
export function normalizePhone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length > 0 ? digits : null;
}

/**
 * Regla anti-bucle: nunca responder un outbound ni un eco del propio número.
 * Los mensajes no textuales se aceptan solo con respuesta fija, sin LLM.
 */
export function classifyInbound(
  message: StoredInboundMessage,
  ownPhones: readonly (string | null)[],
): InboundDecision {
  if (message.direction === "outbound") return { allowed: false, reason: "outbound" };

  const normalizedOwn = ownPhones
    .map(normalizePhone)
    .filter((phone): phone is string => phone !== null);
  const candidates = [message.waId, message.phoneE164].map(normalizePhone);
  if (candidates.some((phone) => phone !== null && normalizedOwn.includes(phone))) {
    return { allowed: false, reason: "self_echo" };
  }

  return { allowed: true, mode: message.kind === "text" ? "llm" : "text_only" };
}
