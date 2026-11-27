import { SUMMARY_SYSTEM_PROMPT } from "../domain/SummaryPrompt";
import {
  MAX_FACTS,
  MAX_SUMMARY_CHARS,
  MAX_TRANSCRIPT_CHARS,
  MAX_TURNS,
  type ContactMemory,
} from "../domain/ContactMemory";
import { parseSummaryOutput, type ParsedSummary } from "./parseSummaryOutput";
import type { CallMemoryRepository, SummarizeResult, SummaryLlmPort } from "./ports";

/** Texto acotado y con rol explícito; lo que diga el cliente nunca entra en el system prompt. */
export function buildTranscript(turns: readonly { role: string; text: string }[]): string {
  const recent = turns.slice(-MAX_TURNS);
  const lines = recent.map(
    (turn) => `${turn.role === "user" ? "Usuario" : "Asistente"}: ${turn.text}`,
  );
  return lines.join("\n").slice(-MAX_TRANSCRIPT_CHARS);
}

/** El resumen nuevo incorpora el anterior; en facts gana el nuevo y se limita el tamaño. */
export function mergeMemory(previous: ContactMemory, next: ParsedSummary): ContactMemory {
  const parts = [next.summary.trim(), previous.summary.trim()].filter(Boolean);
  const merged = parts.join(". ").slice(0, MAX_SUMMARY_CHARS);
  // Los hechos nuevos van primero: si hay que recortar, se conservan los recientes.
  const keys = [
    ...Object.keys(next.facts),
    ...Object.keys(previous.facts).filter((key) => !(key in next.facts)),
  ].slice(0, MAX_FACTS);
  const facts = Object.fromEntries(
    keys.map((key) => [key, key in next.facts ? next.facts[key] : previous.facts[key]]),
  );
  return { summary: merged, facts };
}

/** Caso de uso: resumen de la llamada + memoria del contacto al cerrar (idempotente). */
export class SummarizeCall {
  constructor(
    private readonly repository: CallMemoryRepository,
    private readonly llm: SummaryLlmPort,
  ) {}

  async execute(tenantId: string, callId: string): Promise<SummarizeResult> {
    const call = await this.repository.loadCallForSummary(tenantId, callId);
    if (!call) return { status: "skipped", reason: "missing" };
    if (call.hasSummary) return { status: "skipped", reason: "already_summarized" };
    if (call.turns.length === 0) return { status: "skipped", reason: "no_turns" };

    let raw: string;
    try {
      raw = await this.llm.generateSummary(SUMMARY_SYSTEM_PROMPT, buildTranscript(call.turns));
    } catch {
      return { status: "failed", reason: "llm_failed" };
    }

    const parsed = parseSummaryOutput(raw);
    if (!parsed) return { status: "failed", reason: "invalid_output" };

    // El guard de calls.summary decide quién escribe: solo el ganador fusiona la memoria,
    // así dos ends en carrera no concatenan dos veces el mismo resumen.
    const written = await this.repository.saveCallSummary(tenantId, callId, parsed.summary);
    if (!written) return { status: "skipped", reason: "already_summarized" };

    const previous = await this.repository.readContactMemory(tenantId, call.contactId);
    await this.repository.saveContactMemory(
      tenantId,
      call.contactId,
      mergeMemory(previous, parsed),
    );
    return { status: "summarized" };
  }
}
