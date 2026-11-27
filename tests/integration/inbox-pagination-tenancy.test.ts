import { randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  InvalidCursorError,
  ListConversations,
  ListMessages,
  decodeCursor,
  encodeCursor,
} from "@/modules/conversations";
import { SupabaseConversationRepository } from "@/modules/conversations/infrastructure/SupabaseConversationRepository";
import { subscribeWithRetry } from "./realtime-subscribe";

const SUPABASE_URL = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
// Llaves demo públicas de la CLI de Supabase local (no son secretos reales).
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const DEMO_EMAIL = process.env.DEMO_USER_EMAIL || "demo@example.com";
const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD || "DemoPassword123!";

const TENANT_A = "00000000-0000-4000-8000-000000000001";
const TENANT_B = "00000000-0000-4000-8000-0000000e4b01";

// Ids propios (familia 0e4): se siembran con service role y se limpian al final.
const id = (family: number, n: number) =>
  `00000000-0000-4000-8000-00000e4${family}${String(n).padStart(4, "0")}`.slice(0, 36);

const CONV_COUNT = 25;
const MSG_COUNT = 40;
const A_CONTACTS = Array.from({ length: CONV_COUNT }, (_, i) => id(0, i + 1));
const A_CONVS = Array.from({ length: CONV_COUNT }, (_, i) => id(1, i + 1));
const A_MSG_CONV = A_CONVS[0];
const A_MSGS = Array.from({ length: MSG_COUNT }, (_, i) => id(2, i + 1));
const B_CONTACT = id(0, 500);
const B_CONV = id(1, 500);
const B_MSG = id(2, 500);
const TIE_AT = "2026-01-15T12:00:00.000Z";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const tenantBEmail = `tenant-b-${randomBytes(4).toString("hex")}@example.test`;
const tenantBPassword = randomBytes(18).toString("base64url");
let tenantBUserId = "";
let demoClient: SupabaseClient;
let tenantBClient: SupabaseClient;

async function signedClient(email: string, password: string): Promise<SupabaseClient> {
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  expect(error, `login de ${email}`).toBeNull();
  return client;
}

async function cleanup(): Promise<void> {
  await admin
    .from("messages")
    .delete()
    .in("id", [...A_MSGS, B_MSG]);
  await admin
    .from("messages")
    .delete()
    .in("conversation_id", [...A_CONVS, B_CONV]);
  await admin
    .from("conversations")
    .delete()
    .in("id", [...A_CONVS, B_CONV]);
  await admin
    .from("contacts")
    .delete()
    .in("id", [...A_CONTACTS, B_CONTACT]);
  await admin.from("tenant_members").delete().eq("tenant_id", TENANT_B);
  await admin.from("tenants").delete().eq("id", TENANT_B);
  if (tenantBUserId) {
    await admin.auth.admin.deleteUser(tenantBUserId);
  }
}

beforeAll(async () => {
  await cleanup();

  const must = async (label: string, op: PromiseLike<{ error: unknown }>) => {
    const { error } = await op;
    expect(error, `siembra: ${label}`).toBeNull();
  };

  await must(
    "tenant B",
    admin.from("tenants").insert({ id: TENANT_B, slug: "tenant-b-int", name: "Tenant B Int" }),
  );
  const created = await admin.auth.admin.createUser({
    email: tenantBEmail,
    password: tenantBPassword,
    email_confirm: true,
  });
  expect(created.error).toBeNull();
  tenantBUserId = created.data.user?.id ?? "";
  await must(
    "membresía B",
    admin.from("tenant_members").insert({ tenant_id: TENANT_B, user_id: tenantBUserId }),
  );

  await must(
    "contactos A",
    admin.from("contacts").insert(
      A_CONTACTS.map((contactId, i) => ({
        id: contactId,
        tenant_id: TENANT_A,
        wa_id: `52155200${String(i).padStart(5, "0")}`,
        phone_e164: `+52552000${String(i).padStart(4, "0")}`,
        name: `Paginación ${i + 1}`,
      })),
    ),
  );
  await must(
    "conversaciones A",
    admin.from("conversations").insert(
      A_CONVS.map((conversationId, i) => ({
        id: conversationId,
        tenant_id: TENANT_A,
        contact_id: A_CONTACTS[i],
        // 10 conversaciones empatan en last_activity_at para forzar el desempate por id.
        last_activity_at: i < 10 ? TIE_AT : new Date(Date.parse(TIE_AT) + i * 60_000).toISOString(),
      })),
    ),
  );
  await must(
    "mensajes A",
    admin.from("messages").insert(
      A_MSGS.map((messageId, i) => ({
        id: messageId,
        tenant_id: TENANT_A,
        conversation_id: A_MSG_CONV,
        direction: i % 2 === 0 ? "inbound" : "outbound",
        kind: "text",
        body: `Mensaje de paginación ${i + 1}`,
        wamid: `wamid.int.pagination.${i + 1}`,
        // 12 mensajes empatan en occurred_at.
        occurred_at: i < 12 ? TIE_AT : new Date(Date.parse(TIE_AT) + i * 60_000).toISOString(),
      })),
    ),
  );

  await must(
    "contacto B",
    admin.from("contacts").insert({
      id: B_CONTACT,
      tenant_id: TENANT_B,
      wa_id: "5215529900001",
      phone_e164: "+525529900001",
      name: "Contacto del tenant B",
    }),
  );
  await must(
    "conversación B",
    admin.from("conversations").insert({
      id: B_CONV,
      tenant_id: TENANT_B,
      contact_id: B_CONTACT,
      last_activity_at: "2026-01-16T00:00:00.000Z",
    }),
  );
  await must(
    "mensaje B",
    admin.from("messages").insert({
      id: B_MSG,
      tenant_id: TENANT_B,
      conversation_id: B_CONV,
      direction: "inbound",
      kind: "text",
      body: "Secreto del tenant B",
      wamid: "wamid.int.tenantb.1",
      occurred_at: "2026-01-16T00:00:00.000Z",
    }),
  );

  demoClient = await signedClient(DEMO_EMAIL, DEMO_PASSWORD);
  tenantBClient = await signedClient(tenantBEmail, tenantBPassword);
}, 60000);

afterAll(async () => {
  await demoClient?.auth.signOut();
  await tenantBClient?.auth.signOut();
  await cleanup();
}, 60000);

describe("Paginación por cursor contra Supabase local (cliente de sesión, con RLS)", () => {
  it("las conversaciones se recorren por páginas sin solapes, completas y en orden estable", async () => {
    const list = new ListConversations(new SupabaseConversationRepository(demoClient), TENANT_A);

    const seen: { id: string; at: string }[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const page: Awaited<ReturnType<ListConversations["execute"]>> = await list.execute({
        cursor,
        limit: 7,
      });
      expect(page.items.length).toBeLessThanOrEqual(7);
      for (const summary of page.items) {
        seen.push({ id: summary.conversation.id, at: summary.conversation.lastActivityAt });
      }
      cursor = page.nextCursor;
      pages += 1;
    } while (cursor && pages < 200);

    expect(cursor).toBeNull();
    expect(pages).toBeGreaterThan(1);
    // Sin solapes.
    expect(new Set(seen.map((row) => row.id)).size).toBe(seen.length);
    // Completo: aparecen todas las conversaciones sembradas.
    for (const conversationId of A_CONVS) {
      expect(seen.map((row) => row.id)).toContain(conversationId);
    }
    // Orden descendente estable por (last_activity_at, id), incluidos los empates.
    for (let i = 1; i < seen.length; i += 1) {
      const prev = seen[i - 1];
      const cur = seen[i];
      const prevAt = Date.parse(prev.at);
      const curAt = Date.parse(cur.at);
      expect(prevAt > curAt || (prevAt === curAt && prev.id > cur.id)).toBe(true);
    }
    // Nada del tenant B se cuela.
    expect(seen.map((row) => row.id)).not.toContain(B_CONV);
  });

  it("los mensajes se paginan hacia atrás sin solapes ni huecos, también con timestamps empatados", async () => {
    const list = new ListMessages(new SupabaseConversationRepository(demoClient), TENANT_A);

    const collected: string[][] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const page: Awaited<ReturnType<ListMessages["execute"]>> = await list.execute(A_MSG_CONV, {
        cursor,
        limit: 9,
      });
      collected.push(page.items.map((message) => message.id));
      cursor = page.nextCursor;
      pages += 1;
    } while (cursor && pages < 50);

    expect(cursor).toBeNull();
    expect(collected.length).toBe(Math.ceil(MSG_COUNT / 9));
    const flat = collected.flat();
    expect(flat).toHaveLength(MSG_COUNT);
    expect(new Set(flat).size).toBe(MSG_COUNT);
    expect(new Set(flat)).toEqual(new Set(A_MSGS));
  });

  it("un cursor inválido se rechaza con InvalidCursorError y no devuelve datos", async () => {
    const conversations = new ListConversations(
      new SupabaseConversationRepository(demoClient),
      TENANT_A,
    );
    const messages = new ListMessages(new SupabaseConversationRepository(demoClient), TENANT_A);

    const malformed = [
      "no-es-un-cursor",
      Buffer.from("{}", "utf8").toString("base64url"),
      Buffer.from(JSON.stringify({ at: "ayer", id: "x" }), "utf8").toString("base64url"),
      Buffer.from(JSON.stringify({ at: "", id: "" }), "utf8").toString("base64url"),
    ];
    for (const cursor of malformed) {
      await expect(conversations.execute({ cursor })).rejects.toBeInstanceOf(InvalidCursorError);
      await expect(messages.execute(A_MSG_CONV, { cursor })).rejects.toBeInstanceOf(
        InvalidCursorError,
      );
    }
  });

  it("codifica y decodifica el cursor sin pérdida", () => {
    const original = { at: TIE_AT, id: A_CONVS[0] };
    expect(decodeCursor(encodeCursor(original))).toEqual(original);
  });
});

describe("Aislamiento de tenant con RLS", () => {
  it("cada usuario resuelve únicamente su propio tenant", async () => {
    const demo = await demoClient.rpc("current_tenant");
    const other = await tenantBClient.rpc("current_tenant");
    expect(demo.data).toEqual([TENANT_A]);
    expect(other.data).toEqual([TENANT_B]);
  });

  it("el usuario del tenant B solo ve sus filas y ninguna del A", async () => {
    const conversations = await tenantBClient.from("conversations").select("id, tenant_id");
    expect(conversations.error).toBeNull();
    expect(conversations.data?.map((row) => row.id)).toEqual([B_CONV]);

    const contacts = await tenantBClient.from("contacts").select("id, tenant_id");
    expect(new Set(contacts.data?.map((row) => row.tenant_id))).toEqual(new Set([TENANT_B]));

    const aMessages = await tenantBClient
      .from("messages")
      .select("id")
      .eq("conversation_id", A_MSG_CONV);
    expect(aMessages.error).toBeNull();
    expect(aMessages.data).toEqual([]);

    const calls = await tenantBClient.from("calls").select("id");
    expect(calls.data).toEqual([]);
  });

  it("los casos de uso con el tenant A y la sesión de B no devuelven ni exponen filas del A", async () => {
    const repo = new SupabaseConversationRepository(tenantBClient);
    const page = await new ListConversations(repo, TENANT_A).execute();
    expect(page.items).toEqual([]);
    expect(page.nextCursor).toBeNull();

    const messages = await new ListMessages(repo, TENANT_A).execute(A_MSG_CONV);
    expect(messages.items).toEqual([]);
    expect(await repo.getConversation(TENANT_A, A_MSG_CONV)).toBeNull();
  });

  it("el usuario demo no ve el tenant B (y su propia lista no incluye datos de B)", async () => {
    const bRows = await demoClient.from("messages").select("id").eq("id", B_MSG);
    expect(bRows.error).toBeNull();
    expect(bRows.data).toEqual([]);

    const repo = new SupabaseConversationRepository(demoClient);
    expect(await repo.getConversation(TENANT_B, B_CONV)).toBeNull();
  });

  it("el usuario del tenant B no puede escribir en el tenant A", async () => {
    const insert = await tenantBClient.from("messages").insert({
      tenant_id: TENANT_A,
      conversation_id: A_MSG_CONV,
      direction: "inbound",
      kind: "text",
      body: "intrusión",
      wamid: "wamid.int.intrusion",
      occurred_at: TIE_AT,
    });
    expect(insert.error).not.toBeNull();

    const update = await tenantBClient
      .from("conversations")
      .update({ last_activity_at: "2030-01-01T00:00:00.000Z" })
      .eq("id", A_MSG_CONV)
      .select("id");
    expect(update.data ?? []).toEqual([]);

    const check = await admin.from("messages").select("id").eq("wamid", "wamid.int.intrusion");
    expect(check.data).toEqual([]);
  });

  it("RLS en Realtime: el tenant B no recibe eventos del A y el demo sí", async () => {
    const wamid = `wamid.int.realtime.${randomBytes(4).toString("hex")}`;
    const received: Record<"demo" | "tenantB", string[]> = { demo: [], tenantB: [] };

    async function subscribe(client: SupabaseClient, who: "demo" | "tenantB") {
      const { data } = await client.auth.getSession();
      await client.realtime.setAuth(data.session?.access_token ?? null);
      await subscribeWithRetry(client, () =>
        client
          .channel(`rls-${who}-${wamid}`)
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (p) =>
            received[who].push(String((p.new as { wamid?: string }).wamid)),
          ),
      );
    }

    await subscribe(demoClient, "demo");
    await subscribe(tenantBClient, "tenantB");
    // Margen para que la suscripción quede registrada del lado del servidor.
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const inserted = await admin.from("messages").insert({
      id: id(2, 600),
      tenant_id: TENANT_A,
      conversation_id: A_MSG_CONV,
      direction: "inbound",
      kind: "text",
      body: "evento realtime",
      wamid,
      occurred_at: new Date().toISOString(),
    });
    expect(inserted.error).toBeNull();

    try {
      await expect.poll(() => received.demo, { timeout: 10000, interval: 250 }).toContain(wamid);
      // Ventana de espera adicional: el tenant B no debe recibir nada del A.
      await new Promise((resolve) => setTimeout(resolve, 2000));
      expect(received.tenantB).not.toContain(wamid);
    } finally {
      await admin.from("messages").delete().eq("id", id(2, 600));
      await demoClient.removeAllChannels();
      await tenantBClient.removeAllChannels();
    }
  }, 40000);
});
