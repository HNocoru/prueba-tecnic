import { expect, test } from "@playwright/test";

import { TENANT_ID, adminClient, conversationItems, login } from "./support/helpers";

// Ids propios del test (familia 0e3): se siembran con service role y se limpian al final.
const id = (family: number, n: number) =>
  `00000000-0000-4000-8000-${`00000e3${family}`}${String(n).padStart(4, "0")}`.slice(0, 36);

const LOT = 33; // chats "Lote" más viejos que el seed
const LONG_MESSAGES = 75; // > 50 (tamaño de página de mensajes)
const LONG_CHAT = id(1, 900);

const contactIds = [...Array.from({ length: LOT }, (_, i) => id(0, i + 1)), id(0, 900)];
const conversationIds = [...Array.from({ length: LOT }, (_, i) => id(1, i + 1)), LONG_CHAT];
const messageIds = Array.from({ length: LONG_MESSAGES }, (_, i) => id(2, i + 1));

test.describe.configure({ mode: "serial" });

test.describe("Bandeja rediseñada (S06) — paginación", () => {
  test.beforeAll(async () => {
    const admin = adminClient();
    await cleanup();

    const contacts = contactIds.map((contactId, i) => ({
      id: contactId,
      tenant_id: TENANT_ID,
      wa_id: `52155190${String(i).padStart(5, "0")}`,
      phone_e164: `+52551900${String(i).padStart(4, "0")}`,
      name: i === LOT ? "Mensajera Larga" : `Lote ${String(i + 1).padStart(2, "0")}`,
    }));
    const base = Date.parse("2026-01-01T00:00:00Z");
    const conversations = conversationIds.map((conversationId, i) => ({
      id: conversationId,
      tenant_id: TENANT_ID,
      contact_id: contactIds[i],
      // Los "Lote" quedan antes que el seed; la conversación larga es la más vieja de todas.
      last_activity_at: new Date(i === LOT ? base - 86_400_000 : base + i * 60_000).toISOString(),
    }));
    const messages = messageIds.map((messageId, i) => ({
      id: messageId,
      tenant_id: TENANT_ID,
      conversation_id: LONG_CHAT,
      direction: i % 2 === 0 ? "inbound" : "outbound",
      kind: "text",
      body: `Mensaje largo ${String(i + 1).padStart(3, "0")}`,
      wamid: `wamid.e2e.pagination.${i + 1}`,
      occurred_at: new Date(base - 86_400_000 + i * 60_000).toISOString(),
    }));

    for (const [table, result] of [
      ["contacts", await admin.from("contacts").insert(contacts)],
      ["conversations", await admin.from("conversations").insert(conversations)],
      ["messages", await admin.from("messages").insert(messages)],
    ] as const) {
      expect(result.error, `siembra de ${table}`).toBeNull();
    }
  });

  test.afterAll(cleanup);

  test("'Cargar más' agrega la segunda página de chats sin duplicados", async ({ page }) => {
    await login(page);
    await page.goto("/inbox");
    await expect(conversationItems(page).first()).toBeVisible();

    // La primera página trae 30; el Supabase local puede tener más datos que el seed.
    await expect(conversationItems(page)).toHaveCount(30);
    const loadMore = page.getByRole("button", { name: "Cargar más" });
    await expect(loadMore).toBeVisible();
    await loadMore.click();

    await expect.poll(() => conversationItems(page).count()).toBeGreaterThan(30);
    const hrefs = await conversationItems(page)
      .locator("a")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href")?.split("?")[0]));
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(hrefs.length).toBeGreaterThan(30);
  });

  test("enlace directo a una conversación fuera de la primera página", async ({ page }) => {
    await login(page);
    await page.goto(`/inbox/${LONG_CHAT}`);
    const chat = page.locator('section[aria-label="Conversación"]');
    await expect(chat.getByRole("heading", { level: 2 })).toHaveText("Mensajera Larga");
    await expect(chat.getByText("Mensaje largo 075")).toBeVisible();
    await expect(page).toHaveURL(new RegExp(LONG_CHAT));
  });

  test("'Cargar anteriores' agrega mensajes antiguos sin duplicados", async ({ page }) => {
    await login(page);
    await page.goto(`/inbox/${LONG_CHAT}`);
    const chat = page.locator('section[aria-label="Conversación"]');
    const bubbles = chat.getByText(/^Mensaje largo \d{3}$/);

    await expect(bubbles).toHaveCount(50);
    await expect(chat.getByText("Mensaje largo 001")).toHaveCount(0);

    await chat.getByRole("button", { name: "Cargar anteriores" }).click();
    await expect(bubbles).toHaveCount(LONG_MESSAGES);
    await expect(chat.getByText("Mensaje largo 001")).toBeVisible();
    await expect(chat.getByRole("button", { name: "Cargar anteriores" })).toHaveCount(0);

    const texts = await bubbles.allTextContents();
    expect(new Set(texts).size).toBe(texts.length);
    expect([...texts].sort()).toEqual(texts); // orden cronológico ascendente
  });
});

async function cleanup(): Promise<void> {
  const admin = adminClient();
  await admin.from("messages").delete().in("id", messageIds);
  await admin.from("conversations").delete().in("id", conversationIds);
  await admin.from("contacts").delete().in("id", contactIds);
}
