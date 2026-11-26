import { describe, expect, it } from "vitest";

import { audioPayload, statusPayload, textPayload } from "../testing/fixtures";
import { InMemoryChannelStore } from "../testing/InMemory";
import { IngestWhatsAppWebhook } from "./IngestWhatsAppWebhook";

const TENANT = "tenant-1";
const setup = () => {
  const store = new InMemoryChannelStore({ "1370925136115469": TENANT });
  return { store, ingest: new IngestWhatsAppWebhook(store, store, store) };
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
    await expect(ingest.execute(raw(textPayload()))).resolves.toBeUndefined();
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
    await expect(ingest.execute(raw(textPayload()))).resolves.toBeUndefined();
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
