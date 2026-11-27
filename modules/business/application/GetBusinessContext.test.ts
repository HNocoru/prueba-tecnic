import { describe, it, expect } from "vitest";
import { GetBusinessContext } from "./GetBusinessContext";
import type { BusinessRepository, BusinessProfileRow, AssistantConfigRow } from "./ports";

class FakeBusinessRepository implements BusinessRepository {
  constructor(
    private readonly profile: BusinessProfileRow,
    private readonly hours: { weekday: number; opens: string; closes: string }[],
    private readonly catalog: {
      id: string;
      kind: "product" | "service";
      name: string;
      description: string | null;
      price: number | null;
      currency: string;
      active: boolean;
    }[],
    private readonly faqs: { id: string; question: string; answer: string; position: number }[],
    private readonly assistant: AssistantConfigRow,
  ) {}
  async getProfile(): Promise<BusinessProfileRow> {
    return this.profile;
  }
  async upsertProfile(): Promise<void> {
    /* no-op */
  }
  async listHours() {
    return this.hours;
  }
  async replaceHours(): Promise<void> {
    /* no-op */
  }
  async listCatalogItems() {
    return this.catalog;
  }
  async replaceCatalogItems(): Promise<void> {
    /* no-op */
  }
  async listFaqs() {
    return this.faqs;
  }
  async replaceFaqs(): Promise<void> {
    /* no-op */
  }
  async getAssistantConfig(): Promise<AssistantConfigRow> {
    return this.assistant;
  }
  async upsertAssistantConfig(): Promise<void> {
    /* no-op */
  }
}

describe("GetBusinessContext", () => {
  it("devuelve el contexto con horas y FAQs ordenadas", async () => {
    const repo = new FakeBusinessRepository(
      {
        legalName: "Mi Negocio",
        description: "Desc",
        address: "Dir",
        timezone: "America/Mexico_City",
        policies: "Pol",
        contactPhone: "555",
      },
      [
        { weekday: 6, opens: "10:00", closes: "14:00" },
        { weekday: 0, opens: "09:00", closes: "18:00" },
      ],
      [
        {
          id: "c1",
          kind: "service",
          name: "Corte",
          description: null,
          price: 100,
          currency: "MXN",
          active: true,
        },
      ],
      [
        { id: "1", question: "Q2", answer: "A2", position: 2 },
        { id: "2", question: "Q1", answer: "A1", position: 1 },
      ],
      {
        name: "Bot",
        tone: "amigable",
        voice: "roberto",
        language: "es-MX",
        greeting: "Hola",
        escalationMessage: "Llamo a alguien",
      },
    );
    const uc = new GetBusinessContext(repo);
    const ctx = await uc.execute("tenant-1");
    expect(ctx.name).toBe("Mi Negocio");
    expect(ctx.hours[0]?.weekday).toBe(0);
    expect(ctx.faqs[0]?.question).toBe("Q1");
    expect(ctx.assistant.voice).toBe("roberto");
    expect(ctx.catalog[0]?.kind).toBe("service");
  });

  it("usa el nombre del asistente si legalName es null", async () => {
    const repo = new FakeBusinessRepository(
      {
        legalName: null,
        description: null,
        address: null,
        timezone: "UTC",
        policies: null,
        contactPhone: null,
      },
      [],
      [],
      [],
      {
        name: "Asistente",
        tone: null,
        voice: "eduardo",
        language: "es",
        greeting: null,
        escalationMessage: null,
      },
    );
    const uc = new GetBusinessContext(repo);
    const ctx = await uc.execute("tenant-1");
    expect(ctx.name).toBe("Asistente");
  });

  it("excluye del contexto los productos inactivos", async () => {
    const item = (id: string, active: boolean) => ({
      id,
      kind: "product" as const,
      name: `P${id}`,
      description: null,
      price: 10,
      currency: "MXN",
      active,
    });
    const repo = new FakeBusinessRepository(
      {
        legalName: "N",
        description: null,
        address: null,
        timezone: "UTC",
        policies: null,
        contactPhone: null,
      },
      [],
      [item("1", true), item("2", false)],
      [],
      {
        name: "Bot",
        tone: null,
        voice: "roberto",
        language: "es",
        greeting: null,
        escalationMessage: null,
      },
    );
    const ctx = await new GetBusinessContext(repo).execute("t");
    expect(ctx.catalog.map((c) => c.name)).toEqual(["P1"]);
  });
});
