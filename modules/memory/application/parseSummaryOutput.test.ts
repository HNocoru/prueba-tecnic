import { describe, expect, it } from "vitest";

import { MAX_FACTS, MAX_FACT_VALUE_CHARS } from "../domain/ContactMemory";
import { parseSummaryOutputDetailed } from "./parseSummaryOutput";

const run = (value: unknown) => parseSummaryOutputDetailed(JSON.stringify(value));

describe("parseSummaryOutputDetailed", () => {
  it("convierte un hecho tipo lista en texto corto sin invalidar todo", () => {
    const result = run({ summary: "Resumen", facts: { gustos: ["corte", "tinte"], edad: 30 } });
    expect(result).toEqual({
      ok: true,
      value: { summary: "Resumen", facts: { gustos: '["corte","tinte"]', edad: 30 } },
    });
  });

  it("serializa objetos anidados como texto", () => {
    const result = run({ summary: "R", facts: { cita: { dia: "lunes", hora: 10 } } });
    expect(result).toEqual({
      ok: true,
      value: { summary: "R", facts: { cita: '{"dia":"lunes","hora":10}' } },
    });
  });

  it("recorta valores muy largos", () => {
    const result = run({ summary: "R", facts: { nota: "x".repeat(MAX_FACT_VALUE_CHARS + 50) } });
    expect(result.ok && result.value.facts.nota).toBe("x".repeat(MAX_FACT_VALUE_CHARS));
  });

  it("descarta claves vacías y limita el número de hechos", () => {
    const facts: Record<string, string> = { "  ": "vacía" };
    for (let i = 0; i < MAX_FACTS + 5; i += 1) facts[`k${i}`] = "v";
    const result = run({ summary: "R", facts });
    expect(result.ok && Object.keys(result.value.facts)).toHaveLength(MAX_FACTS);
    expect(result.ok && "  " in result.value.facts).toBe(false);
  });

  it("acepta facts ausente o con forma inesperada como vacío", () => {
    expect(run({ summary: "R" })).toEqual({ ok: true, value: { summary: "R", facts: {} } });
    expect(run({ summary: "R", facts: [1, 2] })).toEqual({
      ok: true,
      value: { summary: "R", facts: {} },
    });
  });

  it("resumen vacío sigue siendo inválido, con motivo fijo", () => {
    expect(run({ summary: "  ", facts: {} })).toEqual({ ok: false, reason: "empty_summary" });
    expect(run({ facts: {} })).toEqual({ ok: false, reason: "empty_summary" });
  });

  it("registra motivos fijos para vacío, JSON roto y forma inválida", () => {
    expect(parseSummaryOutputDetailed("")).toEqual({ ok: false, reason: "empty_output" });
    expect(parseSummaryOutputDetailed("no es json")).toEqual({ ok: false, reason: "no_json" });
    expect(parseSummaryOutputDetailed("[1]")).toEqual({ ok: false, reason: "not_object" });
  });

  it("extrae el JSON aunque venga rodeado de texto, cercas o <think>", () => {
    const raw =
      '<think>x</think>Claro:\n```json\n{"summary":"Hola","facts":{"a":true}}\n```\nListo.';
    expect(parseSummaryOutputDetailed(raw)).toEqual({
      ok: true,
      value: { summary: "Hola", facts: { a: true } },
    });
  });
});
