import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  ConnectWhatsAppNumber,
  decideConnectionCard,
  GetWhatsAppConnection,
} from "@/modules/channels/whatsapp";
import type { ConnectionStatus } from "@/modules/channels/whatsapp";
import type { WhatsAppNumberStore } from "@/modules/channels/whatsapp/application/ports";
import { InMemoryNumberStore } from "@/modules/channels/whatsapp/testing/InMemoryNumberStore";

const JARGON = /webhook|verify|token|meta|phone_number_id|\bapi\b/i;
const cardSource = readFileSync(
  fileURLToPath(new URL("../components/organisms/ConnectWhatsAppCard.tsx", import.meta.url)),
  "utf8",
);

function storeWith(phone: string): WhatsAppNumberStore {
  return {
    async findByTenant() {
      return { phoneNumberId: "ID-TECNICO-NO-VISIBLE", displayPhone: phone, status: "pending" };
    },
    async upsertPending() {
      return "saved";
    },
  };
}

describe("S21 · superficie de conexión sin datos de plataforma", () => {
  it("la tarjeta no contiene texto de plataforma en lo que renderiza", () => {
    expect(cardSource).not.toMatch(JARGON);
    expect(cardSource).not.toContain("connection.webhook");
    expect(cardSource).not.toContain("connection.verify");
    expect(cardSource).not.toContain("navigator.clipboard");
  });

  it("la tarjeta sin conectar pide solo el número y usa la ayuda acordada", () => {
    expect(cardSource).toContain("Conecta tu WhatsApp");
    expect(cardSource).toContain("Número de WhatsApp Business");
    expect(cardSource).toContain(
      "Escríbelo con código de país, por ejemplo +52 55 1234 5678. Debe ser un número registrado en WhatsApp Business.",
    );
    expect(cardSource).toContain("Conectar número");
    expect(cardSource).not.toContain("Copiar URL");
  });

  it("pendiente muestra el número y la acción secundaria, sin formulario abierto", () => {
    expect(decideConnectionCard("pending", "+5215512345678").showForm).toBe(false);
    expect(cardSource).toContain("Cambiar número");
    expect(cardSource).toContain("Número conectado:");
  });

  it("el modelo serializado al cliente contiene solo estado y número", async () => {
    const view = await new GetWhatsAppConnection(storeWith("+5215512345678")).execute("t1");
    expect(Object.keys(view).sort()).toEqual(["displayPhone", "status"]);
    expect(JSON.stringify(view)).not.toMatch(JARGON);
  });

  it.each(["not_connected", "pending", "connected", "disconnected"] as ConnectionStatus[])(
    "la decisión de tarjeta %s no serializa jerga",
    (status) => {
      const view = decideConnectionCard(status, "+5215512345678");
      expect(JSON.stringify(view)).not.toMatch(JARGON);
    },
  );

  it("pendiente ya no exige configuración de plataforma", () => {
    expect(decideConnectionCard("pending", "+5215512345678")).toMatchObject({
      label: "Listo: esperando tu primer mensaje",
      showForm: false,
    });
  });
});

describe("S21 · normalización y mensajes sin jerga", () => {
  it.each([
    ["+52 55 1234 5678", "+525512345678", "+525512345678"],
    ["(52) 5512345678", "+525512345678", "+525512345678"],
    ["5215512345678", "5215512345678", "+5215512345678"],
  ])("normaliza %s a E.164", async (input, accountPhone, expected) => {
    const store = new InMemoryNumberStore();
    const lookup = {
      async listPhoneNumbers() {
        return [{ phoneNumberId: "ID-TECNICO", displayPhone: accountPhone }];
      },
    };
    const result = await new ConnectWhatsAppNumber(store, lookup, { wabaId: "WABA" }).execute(
      "t1",
      { displayPhone: input },
    );
    expect(result).toEqual({ ok: true });
    expect(store.rows.get("t1")?.displayPhone).toBe(expected);
  });

  it.each([
    ["55 1234 5678", "Escribe el número con código de país, por ejemplo +52 55 1234 5678."],
    ["1234567", "Escribe el número con código de país, por ejemplo +52 55 1234 5678."],
    [
      "+5215512345679",
      "No encontramos ese número como cuenta de WhatsApp Business. Revisa que esté registrado e inténtalo de nuevo.",
    ],
  ])("devuelve un mensaje llano para %s", async (input, expected) => {
    const lookup = {
      async listPhoneNumbers() {
        return [{ phoneNumberId: "ID-TECNICO", displayPhone: "+525512345678" }];
      },
    };
    const result = await new ConnectWhatsAppNumber(new InMemoryNumberStore(), lookup, {
      wabaId: "WABA",
    }).execute("t1", { displayPhone: input });
    expect(result).toEqual({ ok: false, error: expected });
    if (!result.ok) expect(result.error).not.toMatch(JARGON);
  });

  it("la falta de configuración y el fallo del proveedor comparten el mismo mensaje", async () => {
    const messages: string[] = [];
    const lookup = {
      async listPhoneNumbers() {
        throw new Error("Bearer SECRETO {status:400}");
      },
    };
    const missing = await new ConnectWhatsAppNumber(new InMemoryNumberStore(), lookup, {
      wabaId: undefined,
    }).execute("t1", { displayPhone: "+5215512345678" });
    const failed = await new ConnectWhatsAppNumber(new InMemoryNumberStore(), lookup, {
      wabaId: "WABA",
    }).execute("t1", { displayPhone: "+5215512345678" });
    if (!missing.ok) messages.push(missing.error);
    if (!failed.ok) messages.push(failed.error);

    expect(messages).toEqual([
      "No pudimos verificar el número ahora. Inténtalo de nuevo en unos minutos.",
      "No pudimos verificar el número ahora. Inténtalo de nuevo en unos minutos.",
    ]);
    expect(JSON.stringify(messages)).not.toContain("SECRETO");
  });
});
