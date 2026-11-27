import type { CallTurnForSummary, ContactMemory } from "@/modules/memory";
import type { BusinessContext } from "../domain/BusinessContext";
import type { ConversationTurn } from "../domain/ConversationTurn";
import type { StoredInboundMessage } from "../domain/Reply";
import type { RequestWriter } from "./RequestWriter";

/** Lectura del mensaje entrante ya guardado por el webhook (inboundMessageId es el wamid). */
export interface InboundMessageReader {
  findInbound(tenantId: string, inboundMessageId: string): Promise<StoredInboundMessage | null>;
}

/** Contexto del negocio del tenant. Implementación real prevista en modules/business. */
export interface BusinessContextReader {
  getBusinessContext(tenantId: string): Promise<BusinessContext>;
}

/** Últimos N mensajes de texto de la conversación, en orden cronológico. */
export interface ConversationHistoryReader {
  loadHistory(tenantId: string, conversationId: string, limit: number): Promise<ConversationTurn[]>;
}

/** Generación de texto. La clave y el modelo viven solo en el adaptador. */
export interface LlmPort {
  generate(system: string, history: ConversationTurn[]): Promise<string>;
}

/** Envío por Graph API. Devuelve el wamid del mensaje enviado. */
export interface WhatsAppSenderPort {
  sendText(tenantId: string, to: string, body: string): Promise<string>;
}

/** Escritura y conteo de mensajes outbound de la bandeja. */
export interface MessageWriter {
  countRecentOutbound(tenantId: string, conversationId: string, since: Date): Promise<number>;
  insertOutbound(
    tenantId: string,
    conversationId: string,
    message: { body: string; wamid: string; occurredAt: Date },
  ): Promise<void>;
}

/** Reclamo idempotente y registro de errores en webhook_events. */
export interface ReplyEventStore {
  /** Devuelve false si este mensaje entrante ya reclamó una respuesta. */
  tryClaim(tenantId: string, inboundMessageId: string): Promise<boolean>;
  markFailed(tenantId: string, inboundMessageId: string, error: string): Promise<void>;
  markProcessed(tenantId: string, inboundMessageId: string): Promise<void>;
}

export type { RequestWriter };

/** Memoria del contacto con su marca de actualización, leída con tenant y contacto explícitos. */
export interface ContactMemorySnapshot extends ContactMemory {
  readonly updatedAt: string | null;
}

export interface ContactMemoryReader {
  read(tenantId: string, contactId: string): Promise<ContactMemorySnapshot>;
}

/** Resumen de una llamada ya cerrada, mostrado en el contexto del asistente de texto. */
export interface RecentCallSummary {
  readonly at: string | null;
  readonly summary: string;
}

export interface RecentCallSummariesReader {
  readRecent(tenantId: string, contactId: string, limit: number): Promise<RecentCallSummary[]>;
}

/** Cuenta mensajes nuevos del contacto desde una marca de memoria. */
export interface NewMessageCounter {
  countInboundSince(tenantId: string, contactId: string, since: Date): Promise<number>;
}

export interface ConversationSummaryRequest {
  readonly tenantId: string;
  readonly contactId: string;
  readonly turns: readonly CallTurnForSummary[];
}

/** Programación del resumen fuera de la respuesta; la implementación usa after(). */
export interface ConversationSummaryScheduler {
  schedule(request: ConversationSummaryRequest): void;
}
