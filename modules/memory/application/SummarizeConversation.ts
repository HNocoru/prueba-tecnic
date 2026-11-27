import { SUMMARY_COOLDOWN_MS } from "../domain/ContactMemory";
import { SUMMARY_SYSTEM_PROMPT } from "../domain/SummaryPrompt";
import { buildTranscript, mergeMemory } from "./SummarizeCall";
import { logger } from "@/shared/logger";
import { parseSummaryOutputDetailed } from "./parseSummaryOutput";
import type {
  CallTurnForSummary,
  ConversationSummaryStore,
  SummarizeConversationResult,
  SummaryLlmPort,
} from "./ports";

/**
 * Caso de uso: resumir una conversación de texto en la memoria del contacto.
 * Reutiliza el puerto LLM, el parseo y la fusión de SummarizeCall; el texto del cliente
 * viaja como contenido de usuario, nunca en el system prompt.
 */
export class SummarizeConversation {
  constructor(
    private readonly store: ConversationSummaryStore,
    private readonly llm: SummaryLlmPort,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(
    tenantId: string,
    contactId: string,
    turns: readonly CallTurnForSummary[],
  ): Promise<SummarizeConversationResult> {
    if (turns.length === 0) return { status: "skipped", reason: "no_turns" };

    const state = await this.store.readMemoryState(tenantId, contactId);
    const current = this.now();
    if (state.updatedAt) {
      const age = current.getTime() - new Date(state.updatedAt).getTime();
      if (!Number.isNaN(age) && age >= 0 && age < SUMMARY_COOLDOWN_MS) {
        return { status: "skipped", reason: "cooldown" };
      }
    }

    let raw: string;
    try {
      raw = await this.llm.generateSummary(SUMMARY_SYSTEM_PROMPT, buildTranscript(turns));
    } catch {
      return { status: "failed", reason: "llm_failed" };
    }
    const result = parseSummaryOutputDetailed(raw);
    if (!result.ok) {
      logger.warn({ reason: result.reason }, "Resumen del LLM inválido");
      return { status: "failed", reason: "invalid_output" };
    }
    const parsed = result.value;

    const previous = await this.store.readContactMemory(tenantId, contactId);
    const written = await this.store.saveContactMemoryIfUnchanged(
      tenantId,
      contactId,
      state.updatedAt,
      mergeMemory(previous, parsed),
    );
    return written ? { status: "summarized" } : { status: "skipped", reason: "conflict" };
  }
}
