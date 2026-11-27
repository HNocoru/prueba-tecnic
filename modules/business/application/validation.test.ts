import { describe, it, expect } from "vitest";
import {
  assistantConfigInputSchema,
  businessHoursInputSchema,
  businessHoursListSchema,
  businessProfileInputSchema,
  catalogItemInputSchema,
  faqInputSchema,
} from "./validation";

describe("validación de dominio (business)", () => {
  it("rechaza horarios con apertura mayor o igual al cierre", () => {
    const result = businessHoursInputSchema.safeParse({
      weekday: 1,
      opens: "10:00",
      closes: "09:00",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBeTruthy();
    }
  });

  it("acepta horarios válidos", () => {
    const result = businessHoursInputSchema.safeParse({
      weekday: 1,
      opens: "09:00",
      closes: "18:00",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza horarios traslapados del mismo día", () => {
    const result = businessHoursListSchema.safeParse([
      { weekday: 1, opens: "09:00", closes: "12:00" },
      { weekday: 1, opens: "11:00", closes: "14:00" },
    ]);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("traslapan");
    }
  });

  it("acepta horarios en días distintos sin traslape", () => {
    const result = businessHoursListSchema.safeParse([
      { weekday: 1, opens: "09:00", closes: "12:00" },
      { weekday: 2, opens: "11:00", closes: "14:00" },
    ]);
    expect(result.success).toBe(true);
  });

  it("rechaza precio negativo en catálogo", () => {
    const result = catalogItemInputSchema.safeParse({
      kind: "product",
      name: "Café",
      description: null,
      price: -1,
      currency: "MXN",
      active: true,
    });
    expect(result.success).toBe(false);
  });

  it("acepta precio nulo y precio cero", () => {
    const nullPrice = catalogItemInputSchema.safeParse({
      kind: "service",
      name: "Consulta",
      description: null,
      price: null,
      currency: "MXN",
      active: true,
    });
    expect(nullPrice.success).toBe(true);
    const zeroPrice = catalogItemInputSchema.safeParse({
      kind: "service",
      name: "Demo",
      description: null,
      price: 0,
      currency: "MXN",
      active: true,
    });
    expect(zeroPrice.success).toBe(true);
  });

  it("requiere nombre del asistente", () => {
    const result = assistantConfigInputSchema.safeParse({
      name: "",
      tone: null,
      voice: "roberto",
      language: "es-MX",
      greeting: null,
      escalationMessage: null,
    });
    expect(result.success).toBe(false);
  });

  it("rechaza timezone vacío en perfil", () => {
    const result = businessProfileInputSchema.safeParse({
      legalName: null,
      description: null,
      address: null,
      timezone: "",
      policies: null,
      contactPhone: null,
    });
    expect(result.success).toBe(false);
  });

  it("rechaza timezone no IANA en perfil", () => {
    const result = businessProfileInputSchema.safeParse({
      legalName: null,
      description: null,
      address: null,
      timezone: "Marte/Fobos",
      policies: null,
      contactPhone: null,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("IANA");
    }
  });

  it("acepta timezone IANA válido en perfil", () => {
    const result = businessProfileInputSchema.safeParse({
      legalName: null,
      description: null,
      address: null,
      timezone: "America/Mexico_City",
      policies: null,
      contactPhone: null,
    });
    expect(result.success).toBe(true);
  });

  it("valida FAQ con pregunta y respuesta obligatorias", () => {
    const result = faqInputSchema.safeParse({ question: "", answer: "R", position: 0 });
    expect(result.success).toBe(false);
  });
});
