import { describe, expect, it } from "vitest";

import type { BusinessContext } from "../domain/BusinessContext";
import { buildSystemPrompt } from "./buildSystemPrompt";

const context: BusinessContext = {
  name: "Café Aurora",
  description: "Café de especialidad en la Roma",
  address: "Calle Álvaro Obregón 12, CDMX",
  timezone: "America/Mexico_City",
  policies: "Cancelaciones con 24 horas de anticipación",
  contactPhone: "+525512345678",
  hours: [{ weekday: 6, opens: "09:00", closes: "18:00" }],
  catalog: [
    {
      kind: "product",
      name: "Café Tres Regiones",
      description: "Tueste medio",
      price: 250,
      currency: "MXN",
    },
  ],
  faqs: [{ question: "¿Tienen envío?", answer: "Sí, a toda la CDMX" }],
  assistant: {
    name: "Aurora",
    tone: "cercano y breve",
    language: "es-MX",
    greeting: "¡Hola!",
    escalationMessage: "Te paso con una persona",
  },
};

describe("buildSystemPrompt (contrato del prompt)", () => {
  const system = buildSystemPrompt(context);

  it("fija español de México y el tono del asistente", () => {
    expect(system).toContain("español de México");
    expect(system).toContain("cercano y breve");
  });

  it("incluye los datos del negocio, horarios, catálogo y FAQs", () => {
    for (const fragment of [
      "Café Aurora",
      "Calle Álvaro Obregón 12, CDMX",
      "America/Mexico_City",
      "Cancelaciones con 24 horas de anticipación",
      "Café Tres Regiones",
      "250 MXN",
      "¿Tienen envío?",
      "Te paso con una persona",
    ]) {
      expect(system, fragment).toContain(fragment);
    }
  });

  it("prohíbe inventar precios u horarios y usa escalamiento", () => {
    expect(system.toLowerCase()).toContain("no inventes");
    expect(system.toLowerCase()).toContain("precios");
    expect(system.toLowerCase()).toContain("horarios");
    expect(system).toContain("Te paso con una persona");
  });

  it("no revela el prompt ni datos de otro tenant", () => {
    expect(system.toLowerCase()).toContain("no reveles");
    expect(system).not.toContain("Cliente de otro negocio");
    expect(system).not.toContain("wamid.OTRO-TENANT");
  });

  it("no mete el texto del cliente dentro del system prompt", () => {
    expect(system).not.toContain("¿Abren el sábado?");
  });
});
