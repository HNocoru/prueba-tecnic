import { describe, expect, it } from "vitest";

import {
  accountUpdatePayload,
  audioPayload,
  callConnectPayload,
  callTerminatePayload,
  statusPayload,
  textPayload,
} from "../testing/fixtures";
import { InMemoryChannelStore } from "../testing/InMemory";
import { IngestWhatsAppWebhook } from "./IngestWhatsAppWebhook";
import type { CallEventSink } from "./ports";

const TENANT = "tenant-1";
const setup = () => {
  const store = new InMemoryChannelStore({ "1370925136115469": TENANT });
  const calls: { tenantId: string; event: unknown }[] = [];
  const sink: CallEventSink = {
    handle: async (tenantId, event) => {
      calls.push({ tenantId, event });
    },
  };
  return { store, calls, ingest: new IngestWhatsAppWebhook(store, store, store, sink) };
};
const raw = (o: unknown) => JSON.stringify(o);

describe("IngestWhatsAppWebhook", () => {
  it("crea contacto, conversación y mensaje, y marca el evento procesado", async () => {
    const { store, ingest } = setup();
    await ingest.execute(raw(textPayload()));
    expect(store.contacts.size).toBe(1);
    expect([...store.contacts.values()][0]).toMatchObject({
      tenantId: TENANT,
      waId: "5215512345678",
      phoneE164: "+525512345678",
      name: "Ana",
    });
    expect(store.conversations.size).toBe(1);
    expect([...store.messages.values()]).toMatchObject([
      { wamid: "wamid.TEXT1", tenantId: TENANT, direction: "inbound", kind: "text" },
    ]);
    expect(store.events.get("wamid.TEXT1")).toMatchObject({
      tenantId: TENANT,
      processed: true,
      error: null,
    });
  });

  it("es idempotente: el mismo wamid dos veces deja un solo mensaje", async () => {
    const { store, ingest } = setup();
    await ingest.execute(raw(textPayload()));
    await ingest.execute(raw(textPayload()));
    expect(store.messages.size).toBe(1);
    expect(store.contacts.size).toBe(1);
    expect(store.conversations.size).toBe(1);
  });

  it("reutiliza contacto y conversación para mensajes distintos del mismo contacto", async () => {
    const { store, ingest } = setup();
    await ingest.execute(raw(textPayload("wamid.A")));
    await ingest.execute(raw(audioPayload("wamid.B")));
    expect(store.messages.size).toBe(2);
    expect(store.conversations.size).toBe(1);
  });

  it("phone_number_id desconocido: guarda el evento con error y no lanza", async () => {
    const store = new InMemoryChannelStore({});
    const ingest = new IngestWhatsAppWebhook(store, store, store);
    await expect(ingest.execute(raw(textPayload()))).resolves.toEqual([]);
    expect(store.events.get("wamid.TEXT1")).toMatchObject({ tenantId: null, processed: false });
    expect(store.events.get("wamid.TEXT1")!.error).toMatch(/phone_number_id/);
    expect(store.messages.size).toBe(0);
    expect(store.contacts.size).toBe(0);
  });

  it("un fallo del repositorio queda en el evento y no lanza", async () => {
    const { store, ingest } = setup();
    store.upsertContact = async () => {
      throw new Error("db caída");
    };
    await expect(ingest.execute(raw(textPayload()))).resolves.toEqual([]);
    expect(store.events.get("wamid.TEXT1")).toMatchObject({
      tenantId: TENANT,
      processed: false,
      error: "db caída",
    });
  });

  it("un evento fallido se reprocesa en el reintento", async () => {
    const { store, ingest } = setup();
    const original = store.upsertContact.bind(store);
    store.upsertContact = async () => {
      throw new Error("db caída");
    };
    await ingest.execute(raw(textPayload()));
    store.upsertContact = original;
    await ingest.execute(raw(textPayload()));
    expect(store.messages.size).toBe(1);
    expect(store.events.get("wamid.TEXT1")).toMatchObject({ processed: true, error: null });
  });

  it("account_update se registra como procesado sin error ni mensajes", async () => {
    const { store, ingest } = setup();
    await ingest.execute(raw(accountUpdatePayload));
    expect(store.messages.size).toBe(0);
    expect(store.contacts.size).toBe(0);
    expect(store.events.size).toBe(1);
    expect([...store.events.values()][0]).toMatchObject({
      tenantId: null,
      processed: true,
      error: null,
    });
  });

  it("calls/connect delega en el módulo de llamadas con el tenant resuelto", async () => {
    const { store, calls, ingest } = setup();
    await ingest.execute(raw(callConnectPayload()));
    expect(store.messages.size).toBe(0);
    expect(calls).toEqual([
      {
        tenantId: TENANT,
        event: expect.objectContaining({ waCallId: "wacid.CALL1", event: "connect" }),
      },
    ]);
    expect(store.events.get("call:wacid.CALL1:connect")).toMatchObject({
      tenantId: TENANT,
      processed: true,
      error: null,
    });
  });

  it("calls/terminate se delega y se marca procesado", async () => {
    const { store, calls, ingest } = setup();
    await ingest.execute(raw(callTerminatePayload("wacid.CALL2")));
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ event: { waCallId: "wacid.CALL2", event: "terminate" } });
    expect(store.events.get("call:wacid.CALL2:terminate")?.processed).toBe(true);
  });

  it("calls/connect con phone_number_id desconocido no delega y registra el error", async () => {
    const store = new InMemoryChannelStore({});
    const calls: unknown[] = [];
    const ingest = new IngestWhatsAppWebhook(store, store, store, {
      handle: async (_tenantId, event) => {
        calls.push(event);
      },
    });
    await ingest.execute(raw(callConnectPayload()));
    expect(calls).toHaveLength(0);
    expect(store.events.get("call:wacid.CALL1:connect")).toMatchObject({ processed: false });
    expect(store.events.get("call:wacid.CALL1:connect")?.error).toMatch(/phone_number_id/);
  });

  it("devuelve solo los mensajes nuevos para disparar la respuesta del asistente", async () => {
    const { store, ingest } = setup();
    const created = await ingest.execute(raw(textPayload("wamid.NEW")));
    expect(created).toEqual([
      {
        tenantId: TENANT,
        conversationId: expect.any(String),
        messageId: "wamid.NEW",
        kind: "text",
      },
    ]);
    expect(await ingest.execute(raw(textPayload("wamid.NEW")))).toEqual([]);
    expect(store.messages.size).toBe(1);
  });

  it("statuses y cuerpos inválidos se guardan como evento sin crear mensajes ni lanzar", async () => {
    const { store, ingest } = setup();
    await ingest.execute(raw(statusPayload));
    await ingest.execute("no es json");
    expect(store.messages.size).toBe(0);
    expect(store.events.size).toBe(2);
    const invalid = [...store.events.values()].filter((e) => e.error);
    expect(invalid).toHaveLength(1);
  });
});
