import { describe, expect, it, vi } from "vitest";

import type { ContactMemory } from "../domain/ContactMemory";
import type { CallMemoryRepository, SummarizableCall, SummaryLlmPort } from "./ports";
import { SummarizeCall } from "./SummarizeCall";

class FakeRepository implements CallMemoryRepository {
  call: SummarizableCall | null = {
    contactId: "contact-1",
    turns: [
      { role: "user", text: "Quiero una cita mañana" },
      { role: "assistant", text: "A las diez le va bien" },
    ],
    hasSummary: false,
  };
  memory: ContactMemory = { summary: "", facts: {} };
  savedSummary: string | null = null;
  savedMemory: ContactMemory | null = null;
  summaryWrites = 0;

  async loadCallForSummary(): Promise<SummarizableCall | null> {
    return this.call;
  }
  async readContactMemory(): Promise<ContactMemory> {
    return this.memory;
  }
  async readForCall(): Promise<ContactMemory> {
    return this.memory;
  }
  async saveCallSummary(_tenantId: string, _callId: string, summary: string): Promise<boolean> {
    this.summaryWrites += 1;
    this.savedSummary = summary;
    return true;
  }
  async saveContactMemory(
    _tenantId: string,
    _contactId: string,
    memory: ContactMemory,
  ): Promise<void> {
    this.savedMemory = memory;
  }
}

function llmReturning(raw: string): SummaryLlmPort & { system: string } {
  return {
    system: "",
    async generateSummary(system: string): Promise<string> {
      this.system = system;
      return raw;
    },
  };
}

const validOutput = JSON.stringify({
  summary: "El cliente pidió una cita para mañana a las diez.",
  facts: { ciudad: "CDMX", cita: "mañana 10:00" },
});

describe("SummarizeCall", () => {
  it("guarda el resumen y la memoria del contacto cuando el LLM responde bien", async () => {
    const repo = new FakeRepository();
    const llm = llmReturning(validOutput);
    await expect(new SummarizeCall(repo, llm).execute("tenant-1", "call-1")).resolves.toEqual({
      status: "summarized",
    });
    expect(repo.savedSummary).toBe("El cliente pidió una cita para mañana a las diez.");
    expect(repo.savedMemory).toEqual({
      summary: "El cliente pidió una cita para mañana a las diez.",
      facts: { ciudad: "CDMX", cita: "mañana 10:00" },
    });
  });

  it("rechaza JSON inválido sin escribir nada", async () => {
    const repo = new FakeRepository();
    const llm = llmReturning("no es json");
    await expect(new SummarizeCall(repo, llm).execute("tenant-1", "call-1")).resolves.toEqual({
      status: "failed",
      reason: "invalid_output",
    });
    expect(repo.savedSummary).toBeNull();
    expect(repo.savedMemory).toBeNull();
  });

  it("no rompe nada cuando el LLM cae", async () => {
    const repo = new FakeRepository();
    const llm: SummaryLlmPort = { generateSummary: vi.fn().mockRejectedValue(new Error("red")) };
    await expect(new SummarizeCall(repo, llm).execute("tenant-1", "call-1")).resolves.toEqual({
      status: "failed",
      reason: "llm_failed",
    });
    expect(repo.savedSummary).toBeNull();
    expect(repo.savedMemory).toBeNull();
  });

  it("no llama al LLM si la llamada no tuvo turnos", async () => {
    const repo = new FakeRepository();
    repo.call = { contactId: "contact-1", turns: [], hasSummary: false };
    const llm: SummaryLlmPort = { generateSummary: vi.fn() };
    await expect(new SummarizeCall(repo, llm).execute("tenant-1", "call-1")).resolves.toEqual({
      status: "skipped",
      reason: "no_turns",
    });
    expect(llm.generateSummary).not.toHaveBeenCalled();
  });

  it("fusiona la memoria previa: el resumen anterior se incorpora y el hecho nuevo gana", async () => {
    const repo = new FakeRepository();
    repo.memory = {
      summary: "Le gusta el café",
      facts: { ciudad: "Guadalajara", mascota: "gato" },
    };
    const llm = llmReturning(
      JSON.stringify({ summary: "Pidió una cita", facts: { ciudad: "CDMX" } }),
    );
    await new SummarizeCall(repo, llm).execute("tenant-1", "call-1");
    expect(repo.savedMemory).toEqual({
      summary: "Pidió una cita. Le gusta el café",
      facts: { ciudad: "CDMX", mascota: "gato" },
    });
    expect(repo.savedSummary).toBe("Pidió una cita");
  });

  it("limita el número de hechos fusionados", async () => {
    const repo = new FakeRepository();
    repo.memory = {
      summary: "",
      facts: Object.fromEntries(
        Array.from({ length: 30 }, (_, index) => [`viejo-${index}`, "valor"]),
      ),
    };
    const llm = llmReturning(JSON.stringify({ summary: "Nuevo", facts: { reciente: "sí" } }));
    await new SummarizeCall(repo, llm).execute("tenant-1", "call-1");
    expect(Object.keys(repo.savedMemory!.facts)).toHaveLength(20);
    expect(repo.savedMemory!.facts.reciente).toBe("sí");
  });

  it("un segundo end no vuelve a resumir ni pisa el resumen", async () => {
    const repo = new FakeRepository();
    repo.call = {
      contactId: "contact-1",
      turns: [{ role: "user", text: "hola" }],
      hasSummary: true,
    };
    const llm: SummaryLlmPort = { generateSummary: vi.fn() };
    await expect(new SummarizeCall(repo, llm).execute("tenant-1", "call-1")).resolves.toEqual({
      status: "skipped",
      reason: "already_summarized",
    });
    expect(llm.generateSummary).not.toHaveBeenCalled();
    expect(repo.summaryWrites).toBe(0);
  });

  it("dos ends concurrentes no duplican el resumen en la memoria", async () => {
    const repo = new FakeRepository();
    repo.readContactMemory = async () => repo.savedMemory ?? repo.memory;
    let claimed = false;
    repo.saveCallSummary = async (_tenantId, _callId, summary) => {
      if (claimed) return false;
      claimed = true;
      repo.savedSummary = summary;
      return true;
    };
    const useCase = new SummarizeCall(repo, llmReturning(validOutput));
    // Ambas peticiones leyeron la llamada abierta antes de que la primera ganara el guard.
    await useCase.execute("tenant-1", "call-1");
    await expect(useCase.execute("tenant-1", "call-1")).resolves.toEqual({
      status: "skipped",
      reason: "already_summarized",
    });
    expect(repo.savedMemory!.summary).toBe("El cliente pidió una cita para mañana a las diez.");
  });

  it("nunca mete el texto del cliente en el system prompt", async () => {
    const repo = new FakeRepository();
    const llm = llmReturning(validOutput);
    await new SummarizeCall(repo, llm).execute("tenant-1", "call-1");
    expect(llm.system).not.toContain("Quiero una cita mañana");
    expect(llm.system).not.toContain("A las diez le va bien");
  });

  it("descarta bloques <think> antes de validar el JSON", async () => {
    const repo = new FakeRepository();
    const llm = llmReturning(`<think>debo responder con json</think>\n${validOutput}`);
    await expect(new SummarizeCall(repo, llm).execute("tenant-1", "call-1")).resolves.toEqual({
      status: "summarized",
    });
  });

  it("descarta respuestas vacías", async () => {
    const repo = new FakeRepository();
    const llm = llmReturning("<think>razonamiento sin respuesta</think>");
    await expect(new SummarizeCall(repo, llm).execute("tenant-1", "call-1")).resolves.toEqual({
      status: "failed",
      reason: "invalid_output",
    });
    expect(repo.savedSummary).toBeNull();
  });
});
