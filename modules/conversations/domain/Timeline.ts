/** Entradas de la línea de tiempo: mensajes de WhatsApp y llamadas, con un mismo eje temporal. */

export type Direction = "inbound" | "outbound";
export type MessageKind = "text" | "audio" | "image" | "document";
export type CallOutcome = "completed" | "caller_hangup" | "time_limit" | "failed" | "missed" | null;

export interface MessageEntry {
  readonly type: "message";
  readonly id: string;
  readonly conversationId: string;
  readonly direction: Direction;
  readonly kind: MessageKind;
  readonly body: string | null;
  readonly mediaPath: string | null;
  readonly transcript: string | null;
  /** ISO 8601 del mensaje, usado para ordenar la línea de tiempo. */
  readonly at: string;
}

export interface CallEntry {
  readonly type: "call";
  readonly id: string;
  readonly conversationId: string;
  readonly startedAt: string;
  readonly endedAt: string | null;
  readonly durationSeconds: number | null;
  readonly outcome: CallOutcome;
  readonly summary: string | null;
  /** ISO 8601 del inicio de la llamada, usado para ordenar la línea de tiempo. */
  readonly at: string;
}

export type TimelineEntry = MessageEntry | CallEntry;
