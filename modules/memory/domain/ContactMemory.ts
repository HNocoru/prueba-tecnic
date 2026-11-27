/** Memoria acumulada de un contacto. Hechos planos, nunca secretos (lo impone la BD). */

export type FactValue = string | number | boolean | null;

export interface ContactMemory {
  readonly summary: string;
  readonly facts: Record<string, FactValue>;
}

export const EMPTY_MEMORY: ContactMemory = { summary: "", facts: {} };

/** Topes para que un LLM verboso no llene la columna ni sature el contexto del worker. */
export const MAX_FACTS = 20;
export const MAX_SUMMARY_CHARS = 1200;
export const MAX_FACT_VALUE_CHARS = 200;
export const MAX_TURNS = 40;
export const MAX_TRANSCRIPT_CHARS = 12_000;

/** Un resumen de texto como máximo cada 10 minutos por contacto. */
export const SUMMARY_COOLDOWN_MS = 10 * 60 * 1000;
