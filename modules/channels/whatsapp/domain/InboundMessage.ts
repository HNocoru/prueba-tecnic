export type MessageKind = "text" | "audio" | "image" | "document";

/** Mensaje entrante de WhatsApp ya validado y normalizado. */
export interface InboundMessage {
  wamid: string;
  phoneNumberId: string;
  /** Identificador de WhatsApp del contacto, tal cual lo envía Meta. */
  waId: string;
  /** Teléfono en E.164 si se pudo normalizar. */
  phoneE164: string | null;
  profileName: string | null;
  kind: MessageKind;
  /** Texto, o caption en imagen/documento. */
  body: string | null;
  mediaId: string | null;
  occurredAt: Date;
}
