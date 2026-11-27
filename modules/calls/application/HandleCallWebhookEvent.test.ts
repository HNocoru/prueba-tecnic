import { describe, expect, it, vi } from "vitest";

import type { CallWebhookEvent } from "../domain/Call";
import { FakeWhatsAppCallGateway } from "../testing/FakeWhatsAppCallGateway";
import { InMemoryCallRepository } from "../testing/InMemoryCallRepository";
import { EndCall } from "./EndCall";
import { HandleCallWebhookEvent } from "./HandleCallWebhookEvent";

const TENANT = "tenant-1";
const at = new Date("2026-11-26T10:00:00.000Z");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const connect = (over: Partial<CallWebhookEvent> = {}): CallWebhookEvent => ({
  waCallId: "wacid.CALL1",
  event: "connect",
  waId: "5215512345678",
  occurredAt: at,
  phoneNumberId: "PN1",
  sdpOffer: "v=0 offer",
  ...over,
});
const terminate = (over: Partial<CallWebhookEvent> = {}): CallWebhookEvent =>
  connect({ event: "terminate", sdpOffer: null, ...over });

function setup() {
  const repo = new InMemoryCallRepository();
  const gateway = new FakeWhatsAppCallGateway();
  return { repo, gateway, handler: new HandleCallWebhookEvent(repo, gateway) };
}

describe("HandleCallWebhookEvent", () => {
  it("connect crea la llamada del tenant resuelto", async () => {
    const { repo, handler } = setup();

    await handler.execute(TENANT, connect());

    expect(repo.starts).toHaveLength(1);
    expect(repo.starts[0]).toMatchObject({
      tenantId: TENANT,
      event: { waCallId: "wacid.CALL1", waId: "5215512345678" },
    });
  });

  it("connect contesta por el Connector con el call_id interno (UUID) y el SDP offer", async () => {
    const { gateway, handler } = setup();

    await handler.execute(TENANT, connect());

    expect(gateway.accepts).toHaveLength(1);
    const accepted = gateway.accepts[0]!;
    expect(accepted.callId).toMatch(UUID);
    expect(accepted).toMatchObject({
      waCallId: "wacid.CALL1",
      phoneNumberId: "PN1",
      sdpOffer: "v=0 offer",
      roomName: `call-${accepted.callId}`,
    });
  });

  it("un reintento de Meta (mismo wacid) no vuelve a contestar ni duplica la fila", async () => {
    const { repo, gateway, handler } = setup();

    await handler.execute(TENANT, connect());
    await handler.execute(TENANT, connect());

    expect(repo.starts).toHaveLength(1);
    expect(gateway.accepts).toHaveLength(1);
  });

  it("connect sin SDP falla y no contesta", async () => {
    const { gateway, handler } = setup();

    await expect(handler.execute(TENANT, connect({ sdpOffer: null }))).rejects.toThrow(/sdp/i);
    expect(gateway.accepts).toHaveLength(0);
  });

  it("si el Connector falla, el error sube para que la ingesta lo registre", async () => {
    const { gateway, handler } = setup();
    gateway.failAccept = new Error("livekit caído");

    await expect(handler.execute(TENANT, connect())).rejects.toThrow("livekit caído");
  });

  it("terminate deja la fila abierta y cuelga el Connector con USER_INITIATED", async () => {
    const { repo, gateway, handler } = setup();
    await handler.execute(TENANT, connect());
    const [callId] = [...repo.calls.keys()];

    await handler.execute(TENANT, terminate());

    expect(repo.calls.get(callId!)?.endedAt).toBeNull();
    expect(gateway.disconnects).toEqual(["wacid.CALL1"]);
    expect(gateway.disconnectReasons).toEqual(["user_initiated"]);
  });

  it("si colgar en el Connector falla, no se propaga y la fila sigue abierta", async () => {
    const { repo, gateway, handler } = setup();
    await handler.execute(TENANT, connect());
    gateway.failDisconnect = new Error("ya desconectada");

    await expect(handler.execute(TENANT, terminate())).resolves.toBeUndefined();
    const [callId] = [...repo.calls.keys()];
    expect(repo.calls.get(callId!)?.endedAt).toBeNull();
  });

  it("un end posterior al terminate cierra la fila con caller_hangup y su duración", async () => {
    const { repo, gateway, handler } = setup();
    await handler.execute(TENANT, connect());
    await handler.execute(TENANT, terminate());
    const [callId] = [...repo.calls.keys()];

    const result = await new EndCall(repo, gateway).execute(callId!, {
      ended_reason: "caller_hangup",
      answered_at: "2026-11-26T10:00:03.000Z",
      ended_at: "2026-11-26T10:01:00.000Z",
      duration_sec: 57,
      error: null,
    });

    expect(result).toEqual({ ok: true });
    expect(repo.calls.get(callId!)?.endedAt).toBe("2026-11-26T10:01:00.000Z");
    expect(repo.lastEnd).toMatchObject({ endedReason: "caller_hangup", durationSec: 57 });
  });

  it("connect sin wa_id falla para que la ingesta lo registre", async () => {
    const { repo, gateway, handler } = setup();

    await expect(handler.execute(TENANT, connect({ waId: null }))).rejects.toThrow(/wa_id/);
    expect(repo.starts).toHaveLength(0);
    expect(gateway.accepts).toHaveLength(0);
  });

  describe("snapshot del contexto", () => {
    const snap = { call_id: "x", business: { name: "Tienda" } };

    it("pasa el snapshot al gateway al contestar", async () => {
      const repo = new InMemoryCallRepository();
      const gateway = new FakeWhatsAppCallGateway();
      const snapshot = vi.fn().mockResolvedValue(snap);
      await new HandleCallWebhookEvent(repo, gateway, snapshot).execute(TENANT, connect());

      expect(snapshot).toHaveBeenCalledWith(gateway.accepts[0]!.callId);
      expect(gateway.accepts[0]!.contextSnapshot).toEqual(snap);
    });

    it("si el snapshot lanza error, contesta igual sin snapshot", async () => {
      const repo = new InMemoryCallRepository();
      const gateway = new FakeWhatsAppCallGateway();
      const snapshot = vi.fn().mockRejectedValue(new Error("db caída"));
      await new HandleCallWebhookEvent(repo, gateway, snapshot).execute(TENANT, connect());

      expect(gateway.accepts).toHaveLength(1);
      expect(gateway.accepts[0]!.contextSnapshot).toBeUndefined();
    });

    it("si el snapshot tarda más de 2 s, contesta igual sin snapshot", async () => {
      vi.useFakeTimers();
      try {
        const repo = new InMemoryCallRepository();
        const gateway = new FakeWhatsAppCallGateway();
        const snapshot = vi.fn().mockReturnValue(new Promise(() => {}));
        const running = new HandleCallWebhookEvent(repo, gateway, snapshot).execute(
          TENANT,
          connect(),
        );
        await vi.advanceTimersByTimeAsync(2000);
        await running;

        expect(gateway.accepts).toHaveLength(1);
        expect(gateway.accepts[0]!.contextSnapshot).toBeUndefined();
      } finally {
        vi.useRealTimers();
      }
    });

    it("un reintento de Meta no vuelve a pedir snapshot ni a contestar", async () => {
      const repo = new InMemoryCallRepository();
      const gateway = new FakeWhatsAppCallGateway();
      const snapshot = vi.fn().mockResolvedValue(snap);
      const handler = new HandleCallWebhookEvent(repo, gateway, snapshot);

      await handler.execute(TENANT, connect());
      await handler.execute(TENANT, connect());

      expect(snapshot).toHaveBeenCalledTimes(1);
      expect(gateway.accepts).toHaveLength(1);
    });

    it("sin dependencia de snapshot contesta sin contextSnapshot", async () => {
      const { gateway, handler } = setup();
      await handler.execute(TENANT, connect());
      expect(gateway.accepts[0]!.contextSnapshot).toBeUndefined();
    });
  });
});
