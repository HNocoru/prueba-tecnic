import { describe, expect, it } from "vitest";

import { FakeWhatsAppCallGateway } from "../testing/FakeWhatsAppCallGateway";
import { InMemoryCallRepository } from "../testing/InMemoryCallRepository";
import { EndCall } from "./EndCall";

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
  return repo;
}

function withGateway() {
  const repo = repository();
  const gateway = new FakeWhatsAppCallGateway();
  return { repo, gateway, useCase: new EndCall(repo, gateway) };
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

    const result = await new EndCall(repo, new FakeWhatsAppCallGateway()).execute("call-1", valid);

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
    const result = await new EndCall(repo, new FakeWhatsAppCallGateway()).execute("call-1", {
      ...valid,
      ended_reason: "failed",
      error: "se cayó la sesión",
    });
    expect(result).toEqual({ ok: true });
  });

  it("un segundo end responde ok sin cambiar el resultado", async () => {
    const repo = repository();
    const useCase = new EndCall(repo, new FakeWhatsAppCallGateway());

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
    expect(
      await new EndCall(repo, new FakeWhatsAppCallGateway()).execute("call-1", {
        ...valid,
        ended_reason: "otro",
      }),
    ).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(repo.lastEnd).toBeNull();
  });

  it("rechaza fechas que no son ISO-8601", async () => {
    const repo = repository();
    expect(
      await new EndCall(repo, new FakeWhatsAppCallGateway()).execute("call-1", {
        ...valid,
        ended_at: "ayer",
      }),
    ).toEqual({
      ok: false,
      error: "invalid",
    });
  });

  it("devuelve not_found si la llamada no existe", async () => {
    const repo = repository();
    expect(
      await new EndCall(repo, new FakeWhatsAppCallGateway()).execute("no-existe", valid),
    ).toEqual({
      ok: false,
      error: "not_found",
    });
  });

  it("time_limit cuelga el Connector con BUSINESS_INITIATED", async () => {
    const { gateway, useCase } = withGateway();

    const result = await useCase.execute("call-1", { ...valid, ended_reason: "time_limit" });

    expect(result).toEqual({ ok: true });
    expect(gateway.disconnects).toEqual(["wacid.CALL1"]);
    expect(gateway.disconnectReasons).toEqual(["business_initiated"]);
  });

  it("time_limit con error hangup_failed también cuelga y guarda el cierre", async () => {
    const { repo, gateway, useCase } = withGateway();

    await useCase.execute("call-1", {
      ...valid,
      ended_reason: "time_limit",
      error: "hangup_failed",
    });

    expect(gateway.disconnectReasons).toEqual(["business_initiated"]);
    expect(repo.lastEnd).toMatchObject({ endedReason: "time_limit", error: "hangup_failed" });
  });

  it("completed no cuelga el Connector", async () => {
    const { gateway, useCase } = withGateway();
    await useCase.execute("call-1", valid);
    expect(gateway.disconnects).toEqual([]);
  });

  it("si Meta ya terminó la llamada, el error se ignora y el end responde ok y cierra", async () => {
    const { repo, gateway, useCase } = withGateway();
    gateway.failDisconnect = new Error("llamada ya terminada");

    const result = await useCase.execute("call-1", { ...valid, ended_reason: "time_limit" });

    expect(result).toEqual({ ok: true });
    expect(repo.calls.get("call-1")?.endedAt).toBe("2026-11-26T10:03:00.000Z");
  });

  it("un time_limit repetido no vuelve a colgar y deja los mismos valores", async () => {
    const { repo, gateway, useCase } = withGateway();
    const body = { ...valid, ended_reason: "time_limit" };

    await useCase.execute("call-1", body);
    const second = await useCase.execute("call-1", body);

    expect(second).toEqual({ ok: true });
    expect(gateway.disconnects).toHaveLength(1);
    expect(repo.lastEnd).toMatchObject({ endedReason: "time_limit", durationSec: 175 });
  });

  it("time_limit sin wa_call_id no intenta colgar", async () => {
    const repo = new InMemoryCallRepository();
    repo.calls.set("call-1", { ...call, waCallId: null });
    const gateway = new FakeWhatsAppCallGateway();

    const result = await new EndCall(repo, gateway).execute("call-1", {
      ...valid,
      ended_reason: "time_limit",
    });

    expect(result).toEqual({ ok: true });
    expect(gateway.disconnects).toEqual([]);
  });
});
