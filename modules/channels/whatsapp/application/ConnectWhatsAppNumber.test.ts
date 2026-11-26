import { describe, expect, it } from "vitest";

import { InMemoryNumberStore } from "../testing/InMemoryNumberStore";
import { ConnectWhatsAppNumber } from "./ConnectWhatsAppNumber";
import { GetWhatsAppConnection } from "./GetWhatsAppConnection";

const valid = { phoneNumberId: "123456789012345", displayPhone: "+5215512345678" };

describe("ConnectWhatsAppNumber", () => {
  it("guarda el número como pendiente", async () => {
    const store = new InMemoryNumberStore();
    const result = await new ConnectWhatsAppNumber(store).execute("t1", valid);
    expect(result).toEqual({ ok: true });
    expect(store.rows.get("t1")).toEqual({ ...valid, status: "pending" });
  });

  it("reemplaza el número del mismo tenant (upsert)", async () => {
    const store = new InMemoryNumberStore();
    const uc = new ConnectWhatsAppNumber(store);
    await uc.execute("t1", valid);
    await uc.execute("t1", { ...valid, phoneNumberId: "999999999999999" });
    expect(store.rows.size).toBe(1);
    expect(store.rows.get("t1")?.phoneNumberId).toBe("999999999999999");
  });

  it.each([
    ["abc123456789012", "+5215512345678"],
    ["12345678901234", "+5215512345678"],
    ["123456789012345678901", "+5215512345678"],
    ["123456789012345", "5215512345678"],
    ["123456789012345", "+0123"],
    ["123456789012345", "55 1234 5678"],
  ])("rechaza %s / %s sin guardar", async (phoneNumberId, displayPhone) => {
    const store = new InMemoryNumberStore();
    const result = await new ConnectWhatsAppNumber(store).execute("t1", {
      phoneNumberId,
      displayPhone,
    });
    expect(result.ok).toBe(false);
    expect(store.rows.size).toBe(0);
  });

  it("rechaza un phone_number_id ya usado por otro tenant", async () => {
    const store = new InMemoryNumberStore();
    const uc = new ConnectWhatsAppNumber(store);
    await uc.execute("t1", valid);
    const result = await uc.execute("t2", valid);
    expect(result).toEqual({
      ok: false,
      error: "Ese ID de número ya está conectado a otro negocio.",
    });
    expect(store.rows.has("t2")).toBe(false);
  });
});

describe("GetWhatsAppConnection", () => {
  const config = { appUrl: "https://app.test", verifyTokenConfigured: true };

  it("sin número devuelve no conectado y la URL del webhook", async () => {
    const r = await new GetWhatsAppConnection(new InMemoryNumberStore(), config).execute("t1");
    expect(r).toEqual({
      status: "not_connected",
      phoneNumberId: null,
      displayPhone: null,
      webhookUrl: "https://app.test/api/whatsapp/webhook",
      verifyTokenConfigured: true,
    });
  });

  it("sin URL pública usa ruta relativa", async () => {
    const r = await new GetWhatsAppConnection(new InMemoryNumberStore(), {
      appUrl: undefined,
      verifyTokenConfigured: false,
    }).execute("t1");
    expect(r.webhookUrl).toBe("/api/whatsapp/webhook");
    expect(r.verifyTokenConfigured).toBe(false);
  });

  it("devuelve el número guardado y no expone secretos", async () => {
    const store = new InMemoryNumberStore();
    await new ConnectWhatsAppNumber(store).execute("t1", valid);
    const r = await new GetWhatsAppConnection(store, config).execute("t1");
    expect(r.status).toBe("pending");
    expect(r.phoneNumberId).toBe(valid.phoneNumberId);
    expect(Object.keys(r).sort()).toEqual(
      ["displayPhone", "phoneNumberId", "status", "verifyTokenConfigured", "webhookUrl"].sort(),
    );
  });
});
