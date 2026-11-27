import { describe, expect, it } from "vitest";

import { InMemoryCallRepository } from "../testing/InMemoryCallRepository";
import { GetCallContext } from "./GetCallContext";

const call = {
  id: "call-1",
  tenantId: "tenant-1",
  conversationId: "conversation-1",
  startedAt: "2026-11-26T10:00:00.000Z",
  endedAt: null,
  waCallId: "wacid.CALL1",
};

function repository(): InMemoryCallRepository {
  const repo = new InMemoryCallRepository();
  repo.calls.set(call.id, call);
  repo.context = {
    business: {
      name: "Estética Luna",
      tone: "cercano",
      faq: "",
      hours: "",
      voice: "roberto",
      language: "es",
    },
    contact: { displayName: "Ana", isNew: false },
    recentTurns: [
      {
        role: "user",
        channel: "text",
        text: "¿Cuánto cuesta el corte?",
        at: "2026-11-25T18:00:00.000Z",
      },
    ],
  };
  return repo;
}

const fakeBusinessContext = {
  execute: async () => ({
    name: "Estética Luna",
    description: null,
    address: null,
    timezone: "America/Mexico_City",
    policies: null,
    contactPhone: null,
    hours: [],
    catalog: [],
    faqs: [],
    assistant: {
      name: "Asistente",
      tone: "cercano",
      voice: "roberto" as const,
      language: "es",
      greeting: null,
      escalationMessage: null,
    },
  }),
};

describe("GetCallContext", () => {
  it("arma la respuesta del contrato con snake_case y los límites fijos", async () => {
    const result = await new GetCallContext(repository(), fakeBusinessContext as never).execute(
      "call-1",
    );

    expect(result).toEqual({
      ok: true,
      context: {
        call_id: "call-1",
        business: {
          name: "Estética Luna",
          tone: "cercano",
          faq: "",
          hours: "",
          voice: "roberto",
          language: "es",
        },
        contact: { display_name: "Ana", is_new: false },
        memory: { summary: "", facts: {} },
        recent_turns: [
          {
            role: "user",
            channel: "text",
            text: "¿Cuánto cuesta el corte?",
            at: "2026-11-25T18:00:00.000Z",
          },
        ],
        limits: { max_call_seconds: 300, goodbye_at_seconds: 270 },
      },
    });
  });

  it("devuelve not_found si la llamada no existe", async () => {
    const result = await new GetCallContext(repository(), fakeBusinessContext as never).execute(
      "no-existe",
    );
    expect(result).toEqual({ ok: false, error: "not_found" });
  });

  it("devuelve ended si la llamada ya terminó", async () => {
    const repo = repository();
    repo.calls.set(call.id, { ...call, endedAt: "2026-11-26T10:05:00.000Z" });

    const result = await new GetCallContext(repo, fakeBusinessContext as never).execute("call-1");

    expect(result).toEqual({ ok: false, error: "ended" });
  });

  it("trae la memoria del contacto desde el módulo memory", async () => {
    const reader = {
      readForCall: async (tenantId: string, callId: string) => {
        expect(tenantId).toBe("tenant-1");
        expect(callId).toBe("call-1");
        return { summary: "Le gusta el café", facts: { ciudad: "CDMX" } };
      },
    };

    const result = await new GetCallContext(
      repository(),
      fakeBusinessContext as never,
      reader,
    ).execute("call-1");

    if (!result.ok) throw new Error("se esperaba contexto");
    expect(result.context.memory).toEqual({
      summary: "Le gusta el café",
      facts: { ciudad: "CDMX" },
    });
  });

  const richContext = (overrides: object = {}) => ({
    execute: async () => ({
      ...{
        name: "Estética Luna",
        description: "Salón de belleza",
        address: "Calle 5 #10, CDMX",
        timezone: "America/Mexico_City",
        policies: "Cancelar con 24 h",
        contactPhone: "5512345678",
        hours: [],
        catalog: [
          {
            kind: "service",
            name: "Corte",
            description: "De cabello",
            price: 150,
            currency: "MXN",
          },
        ],
        faqs: [{ question: "¿Aceptan tarjeta?", answer: "Sí" }],
        assistant: {
          name: "Asistente",
          tone: "cercano",
          voice: "roberto",
          language: "es",
          greeting: null,
          escalationMessage: null,
        },
        ...overrides,
      },
    }),
  });

  it("manda a la voz productos con precio, dirección, políticas y preguntas, con las mismas claves", async () => {
    const result = await new GetCallContext(repository(), richContext() as never).execute("call-1");
    if (!result.ok) throw new Error("se esperaba contexto");
    const faq = result.context.business.faq;
    for (const part of [
      "SOBRE EL NEGOCIO",
      "Salón de belleza",
      "DIRECCIÓN",
      "Calle 5 #10, CDMX",
      "POLÍTICAS",
      "Cancelar con 24 h",
      "PRODUCTOS Y SERVICIOS",
      "- Corte: De cabello (150 MXN)",
      "PREGUNTAS FRECUENTES",
      "P: ¿Aceptan tarjeta?\nR: Sí",
    ]) {
      expect(faq).toContain(part);
    }
    expect(Object.keys(result.context.business).sort()).toEqual(
      ["faq", "hours", "language", "name", "tone", "voice"].sort(),
    );
  });

  it("respeta el tope de 6000 caracteres cortando por elementos completos", async () => {
    const faqs = Array.from({ length: 200 }, (_, i) => ({
      question: `Pregunta ${i}`,
      answer: "respuesta ".repeat(10),
    }));
    const result = await new GetCallContext(repository(), richContext({ faqs }) as never).execute(
      "call-1",
    );
    if (!result.ok) throw new Error("se esperaba contexto");
    const faq = result.context.business.faq;
    expect(faq.length).toBeLessThanOrEqual(6000);
    expect(
      faq.endsWith(
        "respuesta respuesta respuesta respuesta respuesta respuesta respuesta respuesta respuesta respuesta ",
      ),
    ).toBe(true);
    expect(faq).toContain("SOBRE EL NEGOCIO");
  });
});
