import { describe, expect, it } from "vitest";

import { InMemoryNumberStore } from "../testing/InMemoryNumberStore";
import type { WhatsAppNumberLookup } from "./ports";
import type { ConnectResult } from "./ConnectWhatsAppNumber";
import { ConnectWhatsAppNumber } from "./ConnectWhatsAppNumber";
import { GetWhatsAppConnection } from "./GetWhatsAppConnection";

function errorOf(result: ConnectResult): string {
  if (result.ok) throw new Error("Se esperaba un error");
  return result.error;
}

const ACCOUNT_NUMBER = { phoneNumberId: "1370925136115469", displayPhone: "5215512345678" };

class FakeLookup implements WhatsAppNumberLookup {
  calls = 0;
  seenWabaId: string | null = null;
  constructor(
    private readonly numbers: Array<{ phoneNumberId: string; displayPhone: string }> = [
      ACCOUNT_NUMBER,
    ],
    private readonly failure: Error | null = null,
  ) {}

  async listPhoneNumbers(wabaId: string) {
    this.calls += 1;
    this.seenWabaId = wabaId;
    if (this.failure) throw this.failure;
    return this.numbers;
  }
}

const config = { wabaId: "WABA" };
const valid = { displayPhone: "+5215512345678" };

describe("ConnectWhatsAppNumber", () => {
  it("guarda el número como pendiente usando el id que devuelve Graph", async () => {
    const store = new InMemoryNumberStore();
    const lookup = new FakeLookup();
    const result = await new ConnectWhatsAppNumber(store, lookup, config).execute("t1", valid);

    expect(result).toEqual({ ok: true });
    expect(lookup.seenWabaId).toBe("WABA");
    expect(store.rows.get("t1")).toEqual({
      phoneNumberId: ACCOUNT_NUMBER.phoneNumberId,
      displayPhone: valid.displayPhone,
      status: "pending",
    });
  });

  it("reemplaza el número del mismo tenant (upsert)", async () => {
    const store = new InMemoryNumberStore();
    const lookup = new FakeLookup([
      ACCOUNT_NUMBER,
      { phoneNumberId: "999999999999999", displayPhone: "5215512345679" },
    ]);
    const uc = new ConnectWhatsAppNumber(store, lookup, config);
    await uc.execute("t1", valid);
    await uc.execute("t1", { displayPhone: "+5215512345679" });

    expect(store.rows.size).toBe(1);
    expect(store.rows.get("t1")?.displayPhone).toBe("+5215512345679");
  });

  it("normaliza +52 1 55 1234 5678 frente a 5215512345678", async () => {
    const store = new InMemoryNumberStore();
    const result = await new ConnectWhatsAppNumber(store, new FakeLookup(), config).execute("t1", {
      displayPhone: "+52 1 55-1234 5678",
    });

    expect(result).toEqual({ ok: true });
    expect(store.rows.get("t1")?.displayPhone).toBe("+5215512345678");
    expect(store.rows.get("t1")?.phoneNumberId).toBe(ACCOUNT_NUMBER.phoneNumberId);
  });

  it.each(["", "5215512345", "+0123", "55 1234 5678", "+52 1 55-12"])(
    "rechaza %s sin guardar ni consultar Graph",
    async (displayPhone) => {
      const store = new InMemoryNumberStore();
      const lookup = new FakeLookup();
      const result = await new ConnectWhatsAppNumber(store, lookup, config).execute("t1", {
        displayPhone,
      });

      expect(result).toEqual({
        ok: false,
        error: "Escribe el número con código de país, por ejemplo +52 55 1234 5678.",
      });
      expect(store.rows.size).toBe(0);
      expect(lookup.calls).toBe(0);
    },
  );

  it("rechaza un número que no está en la cuenta", async () => {
    const store = new InMemoryNumberStore();
    const result = await new ConnectWhatsAppNumber(store, new FakeLookup([]), config).execute(
      "t1",
      valid,
    );

    expect(result).toEqual({
      ok: false,
      error:
        "No encontramos ese número como cuenta de WhatsApp Business. Revisa que esté registrado e inténtalo de nuevo.",
    });
    expect(store.rows.size).toBe(0);
  });

  it("Graph caído devuelve un mensaje genérico sin tokens ni cuerpos", async () => {
    const store = new InMemoryNumberStore();
    const lookup = new FakeLookup([], new Error('Bearer SECRETO-GRAPH rechazado: {"body":1}'));
    const result = await new ConnectWhatsAppNumber(store, lookup, config).execute("t1", valid);

    expect(result).toEqual({
      ok: false,
      error: "No pudimos verificar el número ahora. Inténtalo de nuevo en unos minutos.",
    });
    expect(errorOf(result)).not.toContain("SECRETO-GRAPH");
    expect(errorOf(result)).not.toContain("Bearer");
    expect(store.rows.size).toBe(0);
  });

  it("WABA sin configurar falla sin consultar Graph", async () => {
    const store = new InMemoryNumberStore();
    const lookup = new FakeLookup();
    const result = await new ConnectWhatsAppNumber(store, lookup, { wabaId: undefined }).execute(
      "t1",
      valid,
    );

    expect(result).toEqual({
      ok: false,
      error: "No pudimos verificar el número ahora. Inténtalo de nuevo en unos minutos.",
    });
    expect(lookup.calls).toBe(0);
    expect(store.rows.size).toBe(0);
  });

  it("rechaza un número ya usado por otro tenant sin revelar de quién es", async () => {
    const store = new InMemoryNumberStore();
    const uc = new ConnectWhatsAppNumber(store, new FakeLookup(), config);
    await uc.execute("t1", valid);
    const result = await uc.execute("t2", valid);

    expect(result).toEqual({
      ok: false,
      error: "Ese número ya está conectado a otro negocio.",
    });
    expect(errorOf(result)).not.toContain("t1");
    expect(store.rows.has("t2")).toBe(false);
  });
});

describe("GetWhatsAppConnection", () => {
  it("sin número devuelve solo el estado y un número vacío", async () => {
    const r = await new GetWhatsAppConnection(new InMemoryNumberStore()).execute("t1");
    expect(r).toEqual({ status: "not_connected", displayPhone: null });
  });

  it("devuelve el número guardado y nunca expone el id técnico al cliente", async () => {
    const store = new InMemoryNumberStore();
    await new ConnectWhatsAppNumber(store, new FakeLookup(), { wabaId: "WABA" }).execute(
      "t1",
      valid,
    );
    const r = await new GetWhatsAppConnection(store).execute("t1");

    expect(r.status).toBe("pending");
    expect(r.displayPhone).toBe(valid.displayPhone);
    expect(Object.keys(r).sort()).toEqual(["displayPhone", "status"]);
    expect(JSON.stringify(r)).not.toContain(ACCOUNT_NUMBER.phoneNumberId);
    expect(JSON.stringify(r)).not.toMatch(/webhook|verify|token/i);
  });
});
