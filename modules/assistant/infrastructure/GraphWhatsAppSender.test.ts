import { describe, expect, it } from "vitest";

import { GraphWhatsAppSender } from "./GraphWhatsAppSender";

describe("GraphWhatsAppSender", () => {
  it("publica el texto a la versión fija de Graph con el teléfono del tenant", async () => {
    let url = "";
    let init: RequestInit = {};
    const sender = new GraphWhatsAppSender({
      accessToken: "dummy-token",
      graphVersion: "v25.0",
      resolvePhoneNumberId: async (tenantId) => (tenantId === "t1" ? "PHONE_ID" : null),
      fetchImpl: async (u: string, i: RequestInit) => {
        url = u;
        init = i;
        return new Response(JSON.stringify({ messages: [{ id: "wamid.OUT" }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    });
    await expect(sender.sendText("t1", "5215512345678", "hola")).resolves.toBe("wamid.OUT");
    expect(url).toBe("https://graph.facebook.com/v25.0/PHONE_ID/messages");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer dummy-token");
    expect(JSON.parse(init.body as string)).toEqual({
      messaging_product: "whatsapp",
      to: "5215512345678",
      type: "text",
      text: { body: "hola" },
    });
  });

  it("no filtra el token en el error y falla sin teléfono configurado", async () => {
    const sender = new GraphWhatsAppSender({
      accessToken: "SECRETO-GRAPH",
      graphVersion: "v25.0",
      resolvePhoneNumberId: async () => null,
      fetchImpl: async () => {
        throw new Error("no debería llamarse");
      },
    });
    const error = await sender.sendText("t1", "5215512345678", "hola").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).not.toContain("SECRETO-GRAPH");
  });
});
