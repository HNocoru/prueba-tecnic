import { describe, expect, it } from "vitest";

import { InMemoryCallRepository } from "../testing/InMemoryCallRepository";
import { EndCall } from "./EndCall";

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

const valid = {
  ended_reason: "completed",
  answered_at: "2026-11-26T10:00:05.000Z",
  ended_at: "2026-11-26T10:03:00.000Z",
  duration_sec: 175,
  error: null,
};

describe("EndCall", () => {
  it("cierra la llamada con motivo, duración y fecha", async () => {
    const repo = repository();

    const result = await new EndCall(repo).execute("call-1", valid);

    expect(result).toEqual({ ok: true });
    expect(repo.lastEnd).toEqual({
      endedReason: "completed",
      answeredAt: "2026-11-26T10:00:05.000Z",
      endedAt: "2026-11-26T10:03:00.000Z",
      durationSec: 175,
      error: null,
    });
    expect(repo.calls.get("call-1")?.endedAt).toBe("2026-11-26T10:03:00.000Z");
  });

  it("acepta ended_reason de la lista cerrada y error opcional", async () => {
    const repo = repository();
    const result = await new EndCall(repo).execute("call-1", {
      ...valid,
      ended_reason: "failed",
      error: "se cayó la sesión",
    });
    expect(result).toEqual({ ok: true });
  });

  it("un segundo end responde ok sin cambiar el resultado", async () => {
    const repo = repository();
    const useCase = new EndCall(repo);

    await useCase.execute("call-1", valid);
    const second = await useCase.execute("call-1", valid);

    expect(second).toEqual({ ok: true });
    expect(repo.lastEnd).toEqual({
      endedReason: "completed",
      answeredAt: "2026-11-26T10:00:05.000Z",
      endedAt: "2026-11-26T10:03:00.000Z",
      durationSec: 175,
      error: null,
    });
  });

  it("rechaza motivos fuera de la lista", async () => {
    const repo = repository();
    expect(await new EndCall(repo).execute("call-1", { ...valid, ended_reason: "otro" })).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(repo.lastEnd).toBeNull();
  });

  it("rechaza fechas que no son ISO-8601", async () => {
    const repo = repository();
    expect(await new EndCall(repo).execute("call-1", { ...valid, ended_at: "ayer" })).toEqual({
      ok: false,
      error: "invalid",
    });
  });

  it("devuelve not_found si la llamada no existe", async () => {
    const repo = repository();
    expect(await new EndCall(repo).execute("no-existe", valid)).toEqual({
      ok: false,
      error: "not_found",
    });
  });
});
