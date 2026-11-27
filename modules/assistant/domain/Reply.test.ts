import { describe, expect, it } from "vitest";

import { classifyInbound, TEXT_ONLY_REPLY, type StoredInboundMessage } from "./Reply";

const inbound = (overrides: Partial<StoredInboundMessage> = {}): StoredInboundMessage => ({
  id: "wamid.1",
  direction: "inbound",
  kind: "text",
  body: "¿Abren el sábado?",
  waId: "5215512345678",
  phoneE164: "+525512345678",
  contactId: "contact-1",
  ...overrides,
});

const ownPhones = ["+525599887766"];

describe("classifyInbound (regla anti-bucle)", () => {
  it("rechaza mensajes outbound", () => {
    expect(classifyInbound(inbound({ direction: "outbound" }), ownPhones)).toEqual({
      allowed: false,
      reason: "outbound",
    });
  });

  it("rechaza el eco del propio número (waId)", () => {
    expect(classifyInbound(inbound({ waId: "525599887766" }), ownPhones)).toEqual({
      allowed: false,
      reason: "self_echo",
    });
  });

  it("rechaza el eco del propio número (E.164)", () => {
    expect(classifyInbound(inbound({ phoneE164: "+52 55 9988 7766" }), ownPhones)).toEqual({
      allowed: false,
      reason: "self_echo",
    });
  });

  it("acepta texto para el LLM", () => {
    expect(classifyInbound(inbound(), ownPhones)).toEqual({ allowed: true, mode: "llm" });
  });

  it.each(["audio", "image", "document"] as const)(
    "acepta %s solo con respuesta fija y sin LLM",
    (kind) => {
      expect(classifyInbound(inbound({ kind, body: null }), ownPhones)).toEqual({
        allowed: true,
        mode: "text_only",
      });
    },
  );

  it("la respuesta fija es corta y pide texto", () => {
    expect(TEXT_ONLY_REPLY.length).toBeLessThan(160);
    expect(TEXT_ONLY_REPLY.toLowerCase()).toMatch(/texto/);
  });
});
