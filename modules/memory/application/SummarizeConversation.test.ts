import { describe, expect, it, vi } from "vitest";

import type { ContactMemory } from "../domain/ContactMemory";
import type { CallTurnForSummary, ConversationSummaryStore, SummaryLlmPort } from "./ports";
import { SummarizeConversation } from "./SummarizeConversation";

const TURNS: CallTurnForSummary[] = [
  { role: "user", text: "Quiero una cita mañana" },
  { role: "assistant", text: "A las diez le va bien" },
];

const VALID = JSON.stringify({
  summary: "Pidió una cita para mañana a las diez.",
  facts: { ciudad: "CDMX", cita: "mañana 10:00" },
});

class FakeStore implements ConversationSummaryStore {
  updatedAt: string | null = "2026-11-27T09:00:00.000Z";
  memory: ContactMemory = { summary: "Le gusta el café", facts: { ciudad: "Guadalajara" } };
  writes = 0;
  expected: string | null | undefined;
  onBeforeSave: (() => void) | null = null;

  async readMemoryState() {
    return { updatedAt: this.updatedAt };
  }
  async readContactMemory() {
    return this.memory;
  }
  async saveContactMemoryIfUnchanged(
    _tenantId: string,
    _contactId: string,
    expectedUpdatedAt: string | null,
    memory: ContactMemory,
  ): Promise<boolean> {
    this.expected = expectedUpdatedAt;
    this.onBeforeSave?.();
    if (expectedUpdatedAt !== this.updatedAt) return false;
    this.writes += 1;
    this.memory = memory;
    this.updatedAt = "2026-11-27T09:15:00.000Z";
    return true;
  }
}

function llmReturning(raw: string): SummaryLlmPort & { system: string; transcript: string } {
  return {
    system: "",
    transcript: "",
    async generateSummary(system: string, transcript: string) {
      this.system = system;
      this.transcript = transcript;
      return raw;
    },
  };
}

describe("SummarizeConversation", () => {
  it("fusiona la memoria previa con el resumen de texto", async () => {
    const store = new FakeStore();
    const useCase = new SummarizeConversation(
      store,
      llmReturning(VALID),
      () => new Date("2026-11-27T10:00:00.000Z"),
    );
    await expect(useCase.execute("tenant-1", "contact-1", TURNS)).resolves.toEqual({
      status: "summarized",
    });
    expect(store.memory).toEqual({
      summary: "Pidió una cita para mañana a las diez.. Le gusta el café",
      facts: { ciudad: "CDMX", cita: "mañana 10:00" },
    });
  });

  it("omite el resumen si la memoria se actualizó hace menos de 10 minutos", async () => {
    const store = new FakeStore();
    const llm = llmReturning(VALID);
    const useCase = new SummarizeConversation(
      store,
      llm,
      () => new Date("2026-11-27T09:09:59.000Z"),
    );
    await expect(useCase.execute("tenant-1", "contact-1", TURNS)).resolves.toEqual({
      status: "skipped",
      reason: "cooldown",
    });
    expect(llm.system).toBe("");
    expect(store.writes).toBe(0);
  });

  it("permite el resumen exactamente a los 10 minutos", async () => {
    const store = new FakeStore();
    const useCase = new SummarizeConversation(
      store,
      llmReturning(VALID),
      () => new Date("2026-11-27T09:10:00.000Z"),
    );
    await expect(useCase.execute("tenant-1", "contact-1", TURNS)).resolves.toEqual({
      status: "summarized",
    });
  });

  it("no duplica la memoria si otra escritura cambió la marca durante el resumen", async () => {
    const store = new FakeStore();
    store.onBeforeSave = () => {
      store.updatedAt = "2026-11-27T09:16:00.000Z";
    };
    const useCase = new SummarizeConversation(
      store,
      llmReturning(VALID),
      () => new Date("2026-11-27T10:00:00.000Z"),
    );
    await expect(useCase.execute("tenant-1", "contact-1", TURNS)).resolves.toEqual({
      status: "skipped",
      reason: "conflict",
    });
    expect(store.writes).toBe(0);
    expect(store.expected).toBe("2026-11-27T09:00:00.000Z");
  });

  it("no rompe nada si el LLM falla", async () => {
    const store = new FakeStore();
    const llm: SummaryLlmPort = { generateSummary: vi.fn().mockRejectedValue(new Error("red")) };
    const useCase = new SummarizeConversation(
      store,
      llm,
      () => new Date("2026-11-27T10:00:00.000Z"),
    );
    await expect(useCase.execute("tenant-1", "contact-1", TURNS)).resolves.toEqual({
      status: "failed",
      reason: "llm_failed",
    });
    expect(store.writes).toBe(0);
  });

  it("nunca envía el texto del cliente en el system prompt", async () => {
    const store = new FakeStore();
    const llm = llmReturning(VALID);
    await new SummarizeConversation(store, llm, () => new Date("2026-11-27T10:00:00.000Z")).execute(
      "tenant-1",
      "contact-1",
      TURNS,
    );
    expect(llm.system).not.toContain("Quiero una cita mañana");
    expect(llm.transcript).toContain("Quiero una cita mañana");
  });

  it("descarta los bloques <think> del proveedor", async () => {
    const store = new FakeStore();
    const useCase = new SummarizeConversation(
      store,
      llmReturning(`<think>json</think>\n${VALID}`),
      () => new Date("2026-11-27T10:00:00.000Z"),
    );
    await expect(useCase.execute("tenant-1", "contact-1", TURNS)).resolves.toEqual({
      status: "summarized",
    });
  });

  it("no llama al LLM cuando no hay turnos nuevos", async () => {
    const store = new FakeStore();
    const llm: SummaryLlmPort = { generateSummary: vi.fn() };
    await expect(
      new SummarizeConversation(store, llm, () => new Date()).execute("tenant-1", "contact-1", []),
    ).resolves.toEqual({ status: "skipped", reason: "no_turns" });
    expect(llm.generateSummary).not.toHaveBeenCalled();
  });
});
