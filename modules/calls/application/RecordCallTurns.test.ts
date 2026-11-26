import { describe, expect, it } from "vitest";

import { InMemoryCallRepository } from "../testing/InMemoryCallRepository";
import { RecordCallTurns } from "./RecordCallTurns";

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
  return repo;
}

const body = (seq: number, text = "Hola") => ({
  turns: [{ seq, role: "user", text, started_ms: 1200 }],
});

describe("RecordCallTurns", () => {
  it("guarda los turnos de una llamada existente", async () => {
    const repo = repository();

    const result = await new RecordCallTurns(repo).execute("call-1", body(1));

    expect(result).toEqual({ ok: true });
    expect(repo.turns.get("call-1")).toEqual([
      { seq: 1, role: "user", text: "Hola", startedMs: 1200 },
    ]);
  });

  it("es idempotente por (call_id, seq)", async () => {
    const repo = repository();
    const useCase = new RecordCallTurns(repo);

    await useCase.execute("call-1", body(1));
    await useCase.execute("call-1", body(1));
    await useCase.execute("call-1", body(2, "Segundo"));

    expect(repo.turns.get("call-1")?.map((turn) => turn.seq)).toEqual([1, 2]);
  });

  it("rechaza un cuerpo inválido sin guardar", async () => {
    const repo = repository();

    const result = await new RecordCallTurns(repo).execute("call-1", {
      turns: [{ seq: -1, role: "system", text: "", started_ms: -5 }],
    });

    expect(result).toEqual({ ok: false, error: "invalid" });
    expect(repo.turns.size).toBe(0);
  });

  it("rechaza un lote vacío", async () => {
    const repo = repository();
    expect(await new RecordCallTurns(repo).execute("call-1", { turns: [] })).toEqual({
      ok: false,
      error: "invalid",
    });
  });

  it("devuelve not_found si la llamada no existe", async () => {
    const repo = repository();
    expect(await new RecordCallTurns(repo).execute("no-existe", body(1))).toEqual({
      ok: false,
      error: "not_found",
    });
  });
});
