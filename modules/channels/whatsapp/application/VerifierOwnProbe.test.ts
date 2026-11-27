import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import { InMemoryNumberStore } from "../testing/InMemoryNumberStore";
import { GraphWhatsAppNumberLookup } from "../infrastructure/GraphWhatsAppNumberLookup";
import { ConnectWhatsAppNumber } from "./ConnectWhatsAppNumber";
import { GetWhatsAppConnection } from "./GetWhatsAppConnection";
import type { WhatsAppNumberLookup } from "./ports";

const id = "1370925136115469";
const okNumber = { phoneNumberId: id, displayPhone: "5215512345678" };

function fakeLookup(numbers = [okNumber], failure?: Error) {
  const seen: string[] = [];
  const lookup: WhatsAppNumberLookup = {
    async listPhoneNumbers(wabaId) {
      seen.push(wabaId);
      if (failure) throw failure;
      return numbers;
    },
  };
  return { lookup, seen };
}

function uc(
  lookup: WhatsAppNumberLookup,
  store = new InMemoryNumberStore(),
  wabaId: string | undefined = "WABA-PROBE",
) {
  return { store, connect: new ConnectWhatsAppNumber(store, lookup, { wabaId }) };
}

describe("verifier own probes — S15/S21", () => {
  it("acepta el número tal como lo ve el usuario, guarda pending y no expone el id", async () => {
    const { store, connect } = uc(fakeLookup().lookup);
    const result = await connect.execute("t-own", { displayPhone: "+52 1 55-1234 5678" });
    expect(result).toEqual({ ok: true });
    expect(store.rows.get("t-own")).toEqual({
      phoneNumberId: id,
      displayPhone: "+5215512345678",
      status: "pending",
    });
    const view = await new GetWhatsAppConnection(store).execute("t-own");
    expect(JSON.stringify(view)).not.toContain(id);
    expect(JSON.stringify(view)).not.toMatch(/webhook|verify|token/i);
    expect(view.status).toBe("pending");
  });

  it.each([
    [
      [],
      undefined,
      "No encontramos ese número como cuenta de WhatsApp Business. Revisa que esté registrado e inténtalo de nuevo.",
    ],
    [
      [],
      new Error("Bearer SECRETO-PROBE {body}"),
      "No pudimos verificar el número ahora. Inténtalo de nuevo en unos minutos.",
    ],
  ])("mensajes exactos sin filtrar de Graph", async (numbers, err, expected) => {
    const { lookup, seen } = fakeLookup(numbers as (typeof okNumber)[], err as Error | undefined);
    const { store, connect } = uc(lookup);
    const result = await connect.execute("t-own", { displayPhone: "+5215512345678" });
    expect(result).toEqual({ ok: false, error: expected });
    expect(store.rows.size).toBe(0);
    expect(seen).toEqual(["WABA-PROBE"]);
  });

  it("WABA ausente y duplicado: mensajes exactos, sin consulta y sin escritura ajena", async () => {
    const missingLookup = fakeLookup().lookup;
    const missingStore = new InMemoryNumberStore();
    const missingConnect = new ConnectWhatsAppNumber(missingStore, missingLookup, {
      wabaId: undefined,
    });
    expect(await missingConnect.execute("t-own", { displayPhone: "+5215512345678" })).toEqual({
      ok: false,
      error: "No pudimos verificar el número ahora. Inténtalo de nuevo en unos minutos.",
    });
    expect(missingStore.rows.size).toBe(0);

    const { store, connect } = uc(fakeLookup().lookup);
    expect(await connect.execute("t1", { displayPhone: "+5215512345678" })).toEqual({ ok: true });
    const duplicate = await connect.execute("t2", { displayPhone: "+5215512345678" });
    expect(duplicate).toEqual({ ok: false, error: "Ese número ya está conectado a otro negocio." });
    expect(store.rows.has("t2")).toBe(false);
  });

  it.each(["", "+01234567", "+1234567890123456", "invalido", "55 1234 5678"])(
    "rechaza %s con el mensaje de validación exacto y sin consultar Graph",
    async (displayPhone) => {
      const { lookup, seen } = fakeLookup();
      const { store, connect } = uc(lookup);
      const result = await connect.execute("t-own", { displayPhone });
      expect(result).toEqual({
        ok: false,
        error: "Escribe el número con código de país, por ejemplo +52 55 1234 5678.",
      });
      expect(seen).toEqual([]);
      expect(store.rows.size).toBe(0);
    },
  );

  it("acepta el mínimo de 8 dígitos y rechaza el máximo excedido", async () => {
    const short = fakeLookup([{ phoneNumberId: "min-id", displayPhone: "12345678" }]).lookup;
    expect(await uc(short).connect.execute("t-own", { displayPhone: "+12345678" })).toEqual({
      ok: true,
    });
  });

  it("Graph: token solo en cabecera, un reintento y errores sin token", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const lookup = new GraphWhatsAppNumberLookup({
      accessToken: "SECRETO-PROBE",
      fetchImpl: async (url, init) => {
        calls.push({ url, init });
        return { ok: false, status: 400, json: async () => ({}) } as Response;
      },
    });
    let message = "";
    try {
      await lookup.listPhoneNumbers("WABA/x");
    } catch (error) {
      message = error instanceof Error ? error.message : "";
    }
    expect(calls).toHaveLength(2);
    expect(calls[0]?.url).toBe(
      "https://graph.facebook.com/v25.0/WABA%2Fx/phone_numbers?fields=id,display_phone_number,verified_name",
    );
    expect(JSON.stringify(calls[0]?.init)).toContain("Bearer SECRETO-PROBE");
    expect(calls[0]?.url).not.toContain("SECRETO-PROBE");
    expect(message).not.toContain("SECRETO-PROBE");
    expect(message).not.toContain("400");
  });

  it("Graph: timeout por defecto de 10 s se aborta en cada intento", async () => {
    vi.useFakeTimers();
    try {
      let calls = 0;
      let aborts = 0;
      const lookup = new GraphWhatsAppNumberLookup({
        accessToken: "TOKEN",
        fetchImpl: (_url, init) =>
          new Promise<Response>((_resolve, reject) => {
            calls += 1;
            init.signal?.addEventListener("abort", () => {
              aborts += 1;
              reject(new Error("abortado"));
            });
          }),
      });
      const pending = lookup.listPhoneNumbers("WABA");
      const assertion = expect(pending).rejects.toBeInstanceOf(Error);
      await vi.advanceTimersByTimeAsync(10_000);
      await vi.advanceTimersByTimeAsync(10_000);
      await assertion;
      expect(calls).toBe(2);
      expect(aborts).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("el tenant sale de la sesión en servidor, nunca del FormData", () => {
    const action = readFileSync("app/(web)/(dashboard)/home/actions.ts", "utf8");
    expect(action).toContain("const tenantId = await resolveTenantId()");
    expect(action).not.toMatch(/formData\.get\(\s*["']tenant/);
    expect(action).not.toContain("phoneNumberId");
  });
});
