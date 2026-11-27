import { z } from "zod";

import { MAX_FACT_VALUE_CHARS, MAX_SUMMARY_CHARS, type FactValue } from "../domain/ContactMemory";

export interface ParsedSummary {
  summary: string;
  facts: Record<string, FactValue>;
}

const factValueSchema = z.union([
  z.string().max(MAX_FACT_VALUE_CHARS),
  z.number(),
  z.boolean(),
  z.null(),
]);

const outputSchema = z.object({
  summary: z.string().trim().min(1).max(MAX_SUMMARY_CHARS),
  facts: z.record(z.string(), factValueSchema),
});

/** Defensa en profundidad: el proveedor puede razonar en <think> aunque se le pida lo contrario. */
export function stripThink(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

/** JSON inválido o con forma inesperada: se descarta sin tocar la base de datos. */
export function parseSummaryOutput(raw: string): ParsedSummary | null {
  const cleaned = stripThink(raw)
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  if (!cleaned) return null;

  let json: unknown;
  try {
    json = JSON.parse(cleaned);
  } catch {
    return null;
  }
  const parsed = outputSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}
