import { describe, expect, it } from "vitest";

import { InMemoryCallRepository } from "../testing/InMemoryCallRepository";
import { HandleCallWebhookEvent } from "./HandleCallWebhookEvent";

const TENANT = "tenant-1";
const at = new Date("2026-11-26T10:00:00.000Z");

describe("HandleCallWebhookEvent", () => {
  it("connect crea la llamada del tenant resuelto", async () => {
    const repo = new InMemoryCallRepository();

    await new HandleCallWebhookEvent(repo).execute(TENANT, {
      waCallId: "wacid.CALL1",
      event: "connect",
      waId: "5215512345678",
      occurredAt: at,
    });

    expect(repo.starts).toHaveLength(1);
    expect(repo.starts[0]).toMatchObject({
      tenantId: TENANT,
      event: { waCallId: "wacid.CALL1", waId: "5215512345678" },
    });
  });

  it("terminate cierra la llamada por wa_call_id", async () => {
    const repo = new InMemoryCallRepository();

    await new HandleCallWebhookEvent(repo).execute(TENANT, {
      waCallId: "wacid.CALL1",
      event: "terminate",
      waId: "5215512345678",
      occurredAt: at,
    });

    expect(repo.terminations).toEqual([{ tenantId: TENANT, waCallId: "wacid.CALL1", at }]);
  });

  it("connect sin wa_id falla para que la ingesta lo registre", async () => {
    const repo = new InMemoryCallRepository();

    await expect(
      new HandleCallWebhookEvent(repo).execute(TENANT, {
        waCallId: "wacid.CALL1",
        event: "connect",
        waId: null,
        occurredAt: at,
      }),
    ).rejects.toThrow(/wa_id/);
    expect(repo.starts).toHaveLength(0);
  });
});
