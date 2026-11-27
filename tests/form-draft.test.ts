import { describe, expect, it } from "vitest";

import {
  catalogIssues,
  dropBlankCatalogRows,
  dropBlankFaqRows,
  dropBlankHourRows,
  faqIssues,
  hasUnsavedChanges,
  hourIssues,
  summarizeIssues,
} from "@/components/atoms/form-draft";

const emptyCatalog = {
  kind: "service" as const,
  name: "",
  description: "",
  price: "",
  currency: "MXN",
  active: true,
};

describe("S25 renglones vacíos", () => {
  it("descarta el renglón de catálogo sin nombre, descripción ni precio", () => {
    const filled = { ...emptyCatalog, name: "Corte" };
    expect(dropBlankCatalogRows([filled, emptyCatalog, { ...emptyCatalog, name: "   " }])).toEqual([
      filled,
    ]);
  });

  it("conserva un renglón de catálogo con precio aunque no tenga nombre", () => {
    const priced = { ...emptyCatalog, price: "10" };
    expect(dropBlankCatalogRows([priced])).toEqual([priced]);
  });

  it("descarta preguntas sin pregunta ni respuesta y conserva el resto en orden", () => {
    const rows = [
      { question: "", answer: "", position: 0 },
      { question: "¿Horario?", answer: "", position: 1 },
      { question: " ", answer: " ", position: 2 },
    ];
    expect(dropBlankFaqRows(rows)).toEqual([{ question: "¿Horario?", answer: "", position: 0 }]);
  });

  it("descarta horarios sin hora de apertura ni de cierre", () => {
    const rows = [
      { weekday: 1, opens: "", closes: "" },
      { weekday: 2, opens: "09:00", closes: "18:00" },
    ];
    expect(dropBlankHourRows(rows)).toEqual([{ weekday: 2, opens: "09:00", closes: "18:00" }]);
  });
});

describe("S25 detección de cambios", () => {
  it("no hay cambios cuando el contenido es igual", () => {
    expect(hasUnsavedChanges([{ a: 1 }], [{ a: 1 }])).toBe(false);
  });
  it("hay cambios cuando algo difiere", () => {
    expect(hasUnsavedChanges([{ a: 1 }], [{ a: 2 }])).toBe(true);
    expect(hasUnsavedChanges([], [{ a: 2 }])).toBe(true);
  });
});

describe("S25 errores por renglón", () => {
  it("catálogo: marca el renglón con datos pero sin nombre y usa el índice original", () => {
    const rows = [
      { ...emptyCatalog, name: "Corte" },
      emptyCatalog,
      { ...emptyCatalog, price: "10" },
    ];
    expect(catalogIssues(rows)).toEqual([
      { index: 2, field: "name", message: "Escribe el nombre de este elemento." },
    ]);
  });

  it("catálogo: sin errores cuando solo hay renglones vacíos", () => {
    expect(catalogIssues([emptyCatalog])).toEqual([]);
  });

  it("preguntas: pide la pregunta y la respuesta que falten", () => {
    const rows = [
      { question: "", answer: "Sí", position: 0 },
      { question: "¿Envían?", answer: "", position: 1 },
      { question: "", answer: "", position: 2 },
    ];
    expect(faqIssues(rows)).toEqual([
      { index: 0, field: "question", message: "Escribe la pregunta." },
      { index: 1, field: "answer", message: "Escribe la respuesta." },
    ]);
  });

  it("horarios: pide la hora que falte cuando la otra está escrita", () => {
    expect(
      hourIssues([
        { weekday: 1, opens: "09:00", closes: "" },
        { weekday: 2, opens: "", closes: "" },
      ]),
    ).toEqual([{ index: 0, field: "closes", message: "Indica la hora de cierre." }]);
  });

  it("resume los errores con el conteo y el primer renglón", () => {
    expect(summarizeIssues([])).toBeNull();
    expect(summarizeIssues([{ index: 2, field: "name", message: "x" }])).toBe(
      "Revisa el renglón 3: falta un dato obligatorio.",
    );
    expect(
      summarizeIssues([
        { index: 0, field: "name", message: "x" },
        { index: 2, field: "name", message: "x" },
      ]),
    ).toBe("Revisa los renglones 1 y 3: faltan datos obligatorios.");
  });
});
