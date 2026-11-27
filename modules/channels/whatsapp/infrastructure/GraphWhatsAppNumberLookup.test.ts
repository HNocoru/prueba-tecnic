import { describe, expect, it } from "vitest";

import { GraphWhatsAppNumberLookup } from "./GraphWhatsAppNumberLookup";

type FetchCall = { url: string; init: RequestInit };

function fakeResponse(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 400,
    json: async () => body,
  } as Response;
}

const body = {
  data: [
    {
      id: "1370925136115469",
      display_phone_number: "5215512345678",
      verified_name: "Negocio Demo",
    },
  ],
};

describe("GraphWhatsAppNumberLookup", () => {
  it("pide id, número visible y nombre verificado; el token solo va en la cabecera", async () => {
    const calls: FetchCall[] = [];
    const lookup = new GraphWhatsAppNumberLookup({
      accessToken: "SECRETO-GRAPH",
      fetchImpl: async (url, init) => {
        calls.push({ url, init });
        return fakeResponse(body);
      },
    });

    const numbers = await lookup.listPhoneNumbers("WABA-123");

    expect(numbers).toEqual([{ phoneNumberId: "1370925136115469", displayPhone: "5215512345678" }]);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://graph.facebook.com/v25.0/WABA-123/phone_numbers?fields=id,display_phone_number,verified_name",
    );
    const headers = calls[0]?.init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer SECRETO-GRAPH");
    expect(calls[0]?.url).not.toContain("SECRETO-GRAPH");
  });

  it("reintenta una vez y no expone token ni cuerpo de respuesta en el error", async () => {
    let attempts = 0;
    const lookup = new GraphWhatsAppNumberLookup({
      accessToken: "SECRETO-GRAPH",
      fetchImpl: async () => {
        attempts += 1;
        return fakeResponse({ error: { message: "Bearer SECRETO-GRAPH expirado" } }, false);
      },
    });

    let thrown: unknown;
    try {
      await lookup.listPhoneNumbers("WABA-123");
    } catch (error) {
      thrown = error;
    }
    const message = thrown instanceof Error ? thrown.message : "";
    expect(attempts).toBe(2);
    expect(message).toContain("Graph");
    expect(message).not.toContain("SECRETO-GRAPH");
    expect(message).not.toContain("expirado");
    expect(message).not.toContain("Bearer");
  });

  it("aborta cada intento al vencer el timeout", async () => {
    let aborts = 0;
    const lookup = new GraphWhatsAppNumberLookup({
      accessToken: "TOKEN",
      timeoutMs: 1,
      fetchImpl: (_, init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => {
            aborts += 1;
            reject(new Error("abortado"));
          });
        }),
    });

    await expect(lookup.listPhoneNumbers("WABA-123")).rejects.toBeInstanceOf(Error);
    expect(aborts).toBe(2);
  });

  it("sin token falla sin mencionar secretos", async () => {
    const lookup = new GraphWhatsAppNumberLookup({ accessToken: undefined });
    let thrown: unknown;
    try {
      await lookup.listPhoneNumbers("WABA-123");
    } catch (error) {
      thrown = error;
    }
    const message = thrown instanceof Error ? thrown.message : "";
    expect(message).toContain("WHATSAPP_ACCESS_TOKEN");
    expect(message).not.toContain("Bearer");
  });
});
