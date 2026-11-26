import { describe, expect, it } from "vitest";

import {
  accountUpdatePayload,
  audioPayload,
  statusPayload,
  textPayload,
} from "../testing/fixtures";
import { parsePayload } from "./parsePayload";

describe("parsePayload", () => {
  it("extrae un mensaje de texto con contacto y número normalizado a E.164", () => {
    const result = parsePayload(textPayload());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.messages).toEqual([
      {
        wamid: "wamid.TEXT1",
        phoneNumberId: "1370925136115469",
        waId: "5215512345678",
        phoneE164: "+525512345678",
        profileName: "Ana",
        kind: "text",
        body: "Hola, ¿tienen paquete premium?",
        mediaId: null,
        occurredAt: new Date(1767225600 * 1000),
      },
    ]);
  });

  it("extrae un audio con su media id", () => {
    const result = parsePayload(audioPayload());
    expect(result.ok && result.messages[0]).toMatchObject({
      kind: "audio",
      body: null,
      mediaId: "MEDIA123",
    });
  });

  it("ignora statuses (sin mensajes)", () => {
    const result = parsePayload(statusPayload);
    expect(result).toEqual({ ok: true, messages: [] });
  });

  it("ignora account_update (WEBHOOK_CONFIG_UPDATED) sin mensajes", () => {
    expect(parsePayload(accountUpdatePayload)).toEqual({ ok: true, messages: [] });
  });

  it("rechaza un payload que no tiene forma de Meta", () => {
    expect(parsePayload({ foo: 1 }).ok).toBe(false);
  });

  it("un mensaje con value malformado sigue siendo error", () => {
    const malformed = {
      entry: [{ changes: [{ field: "messages", value: { metadata: {} } }] }],
    };
    expect(parsePayload(malformed).ok).toBe(false);
  });
});
