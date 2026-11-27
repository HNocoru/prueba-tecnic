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

  const metaError = (code: number, message = "Mensaje de Meta", details = "Detalle de Meta") =>
    new Response(JSON.stringify({ error: { code, message, error_data: { details } } }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  const okResponse = () =>
    new Response(JSON.stringify({ messages: [{ id: "wamid.RETRY" }] }), { status: 200 });

  it("incluye estado, código, mensaje y detalle de Meta sin filtrar el token", async () => {
    const sender = new GraphWhatsAppSender({
      accessToken: "SECRETO-GRAPH",
      resolvePhoneNumberId: async () => "P",
      fetchImpl: async () => metaError(100, "Bearer SECRETO-GRAPH inválido", "token SECRETO-GRAPH"),
    });
    const error = (await sender.sendText("t1", "5512345678", "hola").catch((e) => e)) as Error;
    expect(error.message).toContain("400");
    expect(error.message).toContain("100");
    expect(error.message).toContain("inválido");
    expect(error.message).toContain("token [REDACTED]");
    expect(error.message).not.toContain("SECRETO-GRAPH");
  });

  it("ante 131030 con 521 + 10 dígitos reintenta una vez con 52 + 10 dígitos", async () => {
    const targets: string[] = [];
    const sender = new GraphWhatsAppSender({
      accessToken: "t",
      resolvePhoneNumberId: async () => "P",
      fetchImpl: async (_u: string, i: RequestInit) => {
        const to = JSON.parse(i.body as string).to as string;
        targets.push(to);
        return to.startsWith("521") ? metaError(131030) : okResponse();
      },
    });
    await expect(sender.sendText("t1", "5219601162655", "hola")).resolves.toBe("wamid.RETRY");
    expect(targets).toEqual(["5219601162655", "529601162655"]);
  });

  it("no reintenta con otros códigos ni con números que no son 521", async () => {
    let calls = 0;
    const other = new GraphWhatsAppSender({
      accessToken: "t",
      resolvePhoneNumberId: async () => "P",
      fetchImpl: async () => {
        calls += 1;
        return metaError(100);
      },
    });
    await expect(other.sendText("t1", "5219601162655", "hola")).rejects.toThrow("100");
    expect(calls).toBe(1);

    const foreign = new GraphWhatsAppSender({
      accessToken: "t",
      resolvePhoneNumberId: async () => "P",
      fetchImpl: async () => {
        calls += 1;
        return metaError(131030);
      },
    });
    await expect(foreign.sendText("t1", "15551234567", "hola")).rejects.toThrow("131030");
    expect(calls).toBe(2);
  });
});
