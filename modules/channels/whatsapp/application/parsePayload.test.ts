import { describe, expect, it } from "vitest";

import {
  accountUpdatePayload,
  audioPayload,
  callConnectPayload,
  callTerminatePayload,
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
    expect(result).toEqual({ ok: true, messages: [], calls: [] });
  });

  it("ignora account_update (WEBHOOK_CONFIG_UPDATED) sin mensajes", () => {
    expect(parsePayload(accountUpdatePayload)).toEqual({ ok: true, messages: [], calls: [] });
  });

  it("extrae el evento calls/connect con número, contacto y hora", () => {
    const result = parsePayload(callConnectPayload());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.messages).toEqual([]);
    expect(result.calls).toEqual([
      {
        waCallId: "wacid.CALL1",
        phoneNumberId: "1370925136115469",
        event: "connect",
        waId: "5215512345678",
        occurredAt: new Date(1767225600 * 1000),
        sdpOffer: "v=0 offer",
      },
    ]);
  });

  it("extrae el evento calls/terminate", () => {
    const result = parsePayload(callTerminatePayload("wacid.CALL9"));
    expect(result.ok && result.calls[0]).toMatchObject({
      waCallId: "wacid.CALL9",
      event: "terminate",
      sdpOffer: null,
    });
  });

  it("ignora eventos de calls que no son connect ni terminate", () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              field: "calls",
              value: {
                metadata: { phone_number_id: "1" },
                calls: [{ id: "wacid.1", event: "ringing" }],
              },
            },
          ],
        },
      ],
    };
    expect(parsePayload(payload)).toEqual({ ok: true, messages: [], calls: [] });
  });

  it("un value de calls sin forma reconocible es error", () => {
    const payload = { entry: [{ changes: [{ field: "calls", value: {} }] }] };
    expect(parsePayload(payload).ok).toBe(false);
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
