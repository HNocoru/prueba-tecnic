import type { ContactMemory } from "../domain/ContactMemory";

export interface CallTurnForSummary {
  readonly role: "user" | "assistant";
  readonly text: string;
}

export interface SummarizableCall {
  readonly contactId: string;
  readonly turns: readonly CallTurnForSummary[];
  /** calls.summary ya escrito: un segundo end no vuelve a llamar al LLM. */
  readonly hasSummary: boolean;
}

/** Persistencia del módulo: siempre con tenant_id explícito, nunca tomado de la entrada. */
export interface CallMemoryRepository {
  loadCallForSummary(tenantId: string, callId: string): Promise<SummarizableCall | null>;
  /** Escribe solo si la llamada no tenía resumen; devuelve false si otra petición ganó la carrera. */
  saveCallSummary(tenantId: string, callId: string, summary: string): Promise<boolean>;
  readContactMemory(tenantId: string, contactId: string): Promise<ContactMemory>;
  /** Memoria del contacto de una llamada; vacía si no hay fila. La usa GetCallContext. */
  readForCall(tenantId: string, callId: string): Promise<ContactMemory>;
  saveContactMemory(tenantId: string, contactId: string, memory: ContactMemory): Promise<void>;
}

/** Genera texto a partir de un system fijo y una transcripción como contenido de usuario. */
export interface SummaryLlmPort {
  generateSummary(system: string, transcript: string): Promise<string>;
}

export type SummarizeResult =
  | { status: "summarized" }
  | { status: "skipped"; reason: "missing" | "no_turns" | "already_summarized" }
  | { status: "failed"; reason: "llm_failed" | "invalid_output" };
