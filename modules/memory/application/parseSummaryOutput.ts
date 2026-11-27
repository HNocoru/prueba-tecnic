import {
  MAX_FACTS,
  MAX_FACT_VALUE_CHARS,
  MAX_SUMMARY_CHARS,
  type FactValue,
} from "../domain/ContactMemory";

export interface ParsedSummary {
  summary: string;
  facts: Record<string, FactValue>;
}

/** Defensa en profundidad: el proveedor puede razonar en <think> aunque se le pida lo contrario. */
export function stripThink(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

export type SummaryParseFailure = "empty_output" | "no_json" | "not_object" | "empty_summary";

export type SummaryParseResult =
  { ok: true; value: ParsedSummary } | { ok: false; reason: SummaryParseFailure };

function sanitizeFact(value: unknown): FactValue | undefined {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  let text: string;
  if (typeof value === "string") text = value;
  else if (typeof value === "object") {
    try {
      text = JSON.stringify(value);
    } catch {
      return undefined;
    }
  } else return undefined;
  return text.slice(0, MAX_FACT_VALUE_CHARS);
}

/**
 * Solo el resumen es obligatorio; los hechos se sanean (listas/objetos a texto corto, valores
 * recortados, claves vacías o excedentes descartadas). El motivo es un código fijo, sin texto
 * del cliente, para poder registrarlo.
 */
export function parseSummaryOutputDetailed(raw: string): SummaryParseResult {
  const cleaned = stripThink(raw);
  if (!cleaned) return { ok: false, reason: "empty_output" };

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) {
    return { ok: false, reason: cleaned.includes("[") ? "not_object" : "no_json" };
  }
  let json: unknown;
  try {
    json = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return { ok: false, reason: "no_json" };
  }
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    return { ok: false, reason: "not_object" };
  }

  const { summary, facts } = json as { summary?: unknown; facts?: unknown };
  const text = typeof summary === "string" ? summary.trim().slice(0, MAX_SUMMARY_CHARS) : "";
  if (!text) return { ok: false, reason: "empty_summary" };

  const clean: Record<string, FactValue> = {};
  if (facts && typeof facts === "object" && !Array.isArray(facts)) {
    for (const [key, value] of Object.entries(facts)) {
      if (Object.keys(clean).length >= MAX_FACTS) break;
      const name = key.trim();
      if (!name) continue;
      const fact = sanitizeFact(value);
      if (fact !== undefined) clean[name] = fact;
    }
  }
  return { ok: true, value: { summary: text, facts: clean } };
}

/** Compatibilidad: null cuando el resultado es inválido. */
export function parseSummaryOutput(raw: string): ParsedSummary | null {
  const result = parseSummaryOutputDetailed(raw);
  return result.ok ? result.value : null;
}
