import { describe, expect, it } from "vitest";

import { InMemoryCallRepository } from "../testing/InMemoryCallRepository";
import { GetCallContext } from "./GetCallContext";

const call = {
  id: "call-1",
  tenantId: "tenant-1",
  conversationId: "conversation-1",
  startedAt: "2026-11-26T10:00:00.000Z",
  endedAt: null,
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

describe("GetCallContext", () => {
  it("arma la respuesta del contrato con snake_case y los límites fijos", async () => {
    const result = await new GetCallContext(repository()).execute("call-1");

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
    const result = await new GetCallContext(repository()).execute("no-existe");
    expect(result).toEqual({ ok: false, error: "not_found" });
  });

  it("devuelve ended si la llamada ya terminó", async () => {
    const repo = repository();
    repo.calls.set(call.id, { ...call, endedAt: "2026-11-26T10:05:00.000Z" });

    const result = await new GetCallContext(repo).execute("call-1");

    expect(result).toEqual({ ok: false, error: "ended" });
  });
});
