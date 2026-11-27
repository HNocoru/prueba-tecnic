import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import {
  SEED,
  adminClient,
  conversationItems,
  conversationList,
  login,
  waitForLive,
} from "./support/helpers";

/** Abre una conversación del seed con enlace directo. */
async function openChat(page: Page, id: string, extra = ""): Promise<void> {
  await page.goto(`/inbox/${id}${extra}`);
  await expect(page.getByRole("heading", { name: "Bandeja", level: 1 })).toBeVisible();
}

// Next 16 puede conservar oculta la pantalla anterior tras una navegación del cliente;
// por eso se toma solo la copia visible.
const CHAT = (page: Page) => page.locator('section[aria-label="Conversación"]:visible');

/** El Local Supabase puede traer datos extra (carga de rendimiento): se valida por contenido. */
async function itemTexts(page: Page): Promise<string[]> {
  return conversationItems(page).allInnerTexts();
}

test.describe("Bandeja rediseñada (S06) — lista, filtros y búsqueda", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto("/inbox");
    await expect(conversationItems(page).first()).toBeVisible();
  });

  test("cada chat del seed muestra su estado como texto accesible", async ({ page }) => {
    for (const chat of Object.values(SEED)) {
      const item = conversationItems(page).filter({ hasText: chat.name });
      await expect(item).toHaveCount(1);
      // El texto del estado está en el árbol de accesibilidad, no solo en el color.
      await expect(item.getByText(chat.status, { exact: true })).toBeVisible();
      await expect(item).toContainText(chat.status);
    }
  });

  test("los chips de estado filtran sin recargar, sin peticiones nuevas y se reflejan en la URL", async ({
    page,
  }) => {
    await waitForLive(page);
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));

    const group = page.getByRole("group", { name: "Filtrar por estado" });
    await expect(group.getByRole("button", { name: "Todos" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    const before = await conversationItems(page).count();
    await group.getByRole("button", { name: "Pendiente" }).click();
    await expect(conversationItems(page).filter({ hasText: SEED.ana.name })).toHaveCount(1);
    await expect(conversationItems(page).filter({ hasText: SEED.bruno.name })).toHaveCount(0);
    for (const text of await itemTexts(page)) expect(text).toContain("Pendiente");
    await expect(group.getByRole("button", { name: "Pendiente" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page).toHaveURL(/[?&]status=pending/);

    await group.getByRole("button", { name: "Cancelado" }).click();
    await expect(conversationItems(page).filter({ hasText: SEED.diego.name })).toHaveCount(1);
    await expect(conversationItems(page).filter({ hasText: SEED.ana.name })).toHaveCount(0);
    for (const text of await itemTexts(page)) expect(text).toContain("Cancelado");
    await expect(page).toHaveURL(/[?&]status=cancelled/);

    await group.getByRole("button", { name: "Todos" }).click();
    await expect(conversationItems(page)).toHaveCount(before);
    await expect(page).not.toHaveURL(/status=/);

    expect(requests, `peticiones inesperadas: ${requests.join(", ")}`).toHaveLength(0);
  });

  test("la búsqueda filtra por nombre y teléfono, y se combina con el chip de estado", async ({
    page,
  }) => {
    await waitForLive(page);
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));

    const search = page.locator("#conversation-search");
    await search.fill("bruno");
    await expect(conversationItems(page)).toHaveCount(1);
    await expect(conversationItems(page).first()).toContainText(SEED.bruno.name);
    await expect(page).toHaveURL(/[?&]q=bruno/);

    await search.fill("5510000003");
    await expect(conversationItems(page)).toHaveCount(1);
    await expect(conversationItems(page).first()).toContainText(SEED.carla.name);

    // Combinación: Carla está Completada; Bruno no.
    const group = page.getByRole("group", { name: "Filtrar por estado" });
    await group.getByRole("button", { name: "Completado" }).click();
    await expect(conversationItems(page)).toHaveCount(1);
    await expect(conversationItems(page).first()).toContainText(SEED.carla.name);
    await search.fill("bruno");
    await expect(conversationItems(page)).toHaveCount(0);
    await expect(
      page.getByText("No hay conversaciones que coincidan con la búsqueda o el estado."),
    ).toBeVisible();

    await page.getByRole("button", { name: "Limpiar filtros" }).click();
    await expect(conversationItems(page).first()).toBeVisible();
    expect(await conversationItems(page).count()).toBeGreaterThanOrEqual(5);
    await expect(search).toHaveValue("");
    await expect(page).not.toHaveURL(/status=|q=/);

    expect(requests, `peticiones inesperadas: ${requests.join(", ")}`).toHaveLength(0);
  });

  test("los filtros de la URL se aplican al cargar el enlace", async ({ page }) => {
    await page.goto("/inbox?status=in_progress&q=bruno");
    await expect(conversationItems(page)).toHaveCount(1);
    await expect(conversationItems(page).first()).toContainText(SEED.bruno.name);
    await expect(
      page.getByRole("group", { name: "Filtrar por estado" }).getByRole("button", {
        name: "En proceso",
      }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("teclado: se llega a un chat con Tab y Enter abre la conversación", async ({ page }) => {
    const firstName = (
      await conversationList(page).locator("ul a span.truncate").first().innerText()
    ).trim();
    await page.locator("#conversation-search").focus();
    let reached = false;
    for (let i = 0; i < 12 && !reached; i += 1) {
      await page.keyboard.press("Tab");
      reached = await conversationList(page)
        .locator("ul a")
        .first()
        .evaluate((el) => el === document.activeElement);
    }
    expect(reached, "el primer chat debe ser alcanzable con Tab").toBe(true);
    await page.keyboard.press("Enter");
    await page.waitForURL(/\/inbox\/[0-9a-f-]{36}/);
    await expect(CHAT(page).getByRole("heading", { level: 2 })).toContainText(firstName);
  });
});

test.describe("Bandeja rediseñada (S06) — conversación, llamada y sesión", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("burbujas entrante/saliente, filtros Todo/Mensajes/Llamadas y sin audio ni imágenes", async ({
    page,
  }) => {
    await openChat(page, SEED.ana.conversation);
    const chat = CHAT(page);

    await expect(chat.getByText("Hola, ¿sigue disponible el paquete premium?")).toBeVisible();
    await expect(chat.getByText("Mensaje recibido:").first()).toBeAttached();
    await expect(chat.getByText("Mensaje enviado:").first()).toBeAttached();
    // Entrante a la izquierda, saliente a la derecha.
    const inbound = chat.locator("li", { hasText: "Hola, ¿sigue disponible" }).last();
    const outbound = chat.locator("li", { hasText: "Te aparto uno" }).last();
    await expect(inbound).toHaveClass(/justify-start/);
    await expect(outbound).toHaveClass(/justify-end/);

    await expect(chat.locator("audio, video, img")).toHaveCount(0);

    const tabs = page.getByRole("navigation", { name: "Filtrar línea de tiempo" });
    await tabs.getByRole("button", { name: "Llamadas" }).click();
    await expect(chat.getByRole("button", { name: /Ver reporte de la llamada/ })).toBeVisible();
    await expect(chat.getByText("Hola, ¿sigue disponible")).toHaveCount(0);

    await tabs.getByRole("button", { name: "Mensajes" }).click();
    await expect(chat.getByText("Hola, ¿sigue disponible")).toBeVisible();
    await expect(chat.getByRole("button", { name: /Ver reporte de la llamada/ })).toHaveCount(0);

    await tabs.getByRole("button", { name: "Todo" }).click();
    await expect(chat.getByRole("button", { name: /Ver reporte de la llamada/ })).toBeVisible();
    await expect(chat.getByText("Hola, ¿sigue disponible")).toBeVisible();
  });

  test("la tarjeta de llamada muestra el reporte (duración, resultado, resumen) en el panel derecho", async ({
    page,
  }) => {
    await openChat(page, SEED.ana.conversation);
    await expect(page.getByRole("complementary", { name: "Datos del contacto" })).toBeVisible();

    const card = CHAT(page).getByRole("button", { name: /Ver reporte de la llamada/ });
    await expect(card).toContainText("Llamada · Completada");
    await expect(card).toContainText("2:15");
    await card.click();

    const report = page.getByRole("complementary", { name: "Reporte de la llamada" });
    await expect(report).toBeVisible();
    await expect(report.getByText("Duración")).toBeVisible();
    await expect(report.locator("dd", { hasText: "2:15" })).toBeVisible();
    await expect(report.locator("dd", { hasText: "Completada" })).toBeVisible();
    await expect(
      report.getByText("Ana preguntó por el paquete premium y confirmó que quiere apartarlo."),
    ).toBeVisible();
    await expect(card).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("complementary", { name: "Datos del contacto" })).toHaveCount(0);

    // "Volver al contacto" restaura el panel del contacto.
    await report.getByRole("button", { name: "Volver al contacto" }).click();
    await expect(page.getByRole("complementary", { name: "Datos del contacto" })).toBeVisible();
    await expect(report).toHaveCount(0);
  });

  test("Ver sesión muestra los turnos en orden y se puede volver a la conversación", async ({
    page,
  }) => {
    await openChat(page, SEED.ana.conversation);
    await CHAT(page)
      .getByRole("button", { name: /Ver reporte de la llamada/ })
      .click();
    await page
      .getByRole("complementary", { name: "Reporte de la llamada" })
      .getByRole("button", { name: "Ver sesión" })
      .click();

    const dialog = page.locator("dialog[open]");
    const session = dialog.locator('section[aria-label="Transcripción de la llamada"]');
    await expect(dialog).toBeVisible();
    await expect(session).toBeVisible();
    const turns = session.locator("ol > li");
    await expect(turns).toHaveCount(5);
    const roles = await turns.evaluateAll((nodes) =>
      nodes.map((node) => (node.textContent ?? "").slice(0, 10)),
    );
    expect(roles.map((text) => text.split(":")[0])).toEqual([
      "Asistente",
      "Cliente",
      "Asistente",
      "Cliente",
      "Asistente",
    ]);
    await expect(turns.nth(0)).toContainText("Hola, soy el asistente de Negocio Demo");
    await expect(turns.nth(1)).toContainText("todavía tienen el paquete premium");
    await expect(turns.nth(4)).toContainText("enlace de pago por WhatsApp");
    // Asistente a la derecha, cliente a la izquierda.
    await expect(turns.nth(0)).toHaveClass(/justify-end/);
    await expect(turns.nth(1)).toHaveClass(/justify-start/);
    const report = page.getByRole("complementary", { name: "Reporte de la llamada" });
    await expect(report.getByRole("button", { name: "Viendo sesión" })).toBeVisible();
    await expect(report).toBeVisible();

    await session.getByRole("button", { name: "Volver a la conversación" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(CHAT(page).getByText("Hola, ¿sigue disponible el paquete premium?")).toBeVisible();
  });

  test("la llamada sin turnos del seed (Diego) muestra reporte de 'El contacto colgó'", async ({
    page,
  }) => {
    await openChat(page, SEED.diego.conversation);
    await CHAT(page)
      .getByRole("button", { name: /Ver reporte de la llamada/ })
      .click();
    const report = page.getByRole("complementary", { name: "Reporte de la llamada" });
    await expect(report.locator("dd", { hasText: "0:40" })).toBeVisible();
    await expect(report.locator("dd", { hasText: "El contacto colgó" })).toBeVisible();
    await report.getByRole("button", { name: "Ver sesión" }).click();
    await expect(page.getByText("Esta llamada no tiene transcripción.")).toBeVisible();
  });

  test("rendimiento: navegar entre chats no genera más de 1 verificación de sesión en red", async ({
    page,
  }) => {
    await page.goto("/inbox");
    await expect(conversationItems(page).first()).toBeVisible();
    await waitForLive(page);

    const authCalls: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/auth/v1/user")) authCalls.push(request.url());
    });

    const started = Date.now();
    await conversationItems(page).filter({ hasText: SEED.bruno.name }).locator("a").click();
    await page.waitForURL(new RegExp(`/inbox/${SEED.bruno.conversation}`));
    await expect(CHAT(page).getByText("¿Pueden instalarlo el sábado?")).toBeVisible();
    const elapsed = Date.now() - started;
    test.info().annotations.push({ type: "navegación-ms", description: String(elapsed) });

    expect(authCalls.length).toBeLessThanOrEqual(1);
  });
});

test.describe("Bandeja rediseñada (S06) — Realtime", () => {
  const messageId = "00000000-0000-4000-8000-0000000e2e01";

  // El mismo id se reutiliza: se limpia tras cada prueba para evitar choques.
  test.afterEach(async () => {
    await adminClient().from("messages").delete().eq("id", messageId);
  });

  test("un mensaje insertado con service role aparece sin recargar y se muestra 'En vivo'", async ({
    page,
  }) => {
    await login(page);
    await openChat(page, SEED.ana.conversation);
    await waitForLive(page);

    // Marca de navegación: si la página recargara, esta propiedad desaparecería.
    await page.evaluate(() => {
      (window as unknown as { __noReload: boolean }).__noReload = true;
    });

    const body = `Mensaje en vivo e2e ${Date.now()}`;
    const { error } = await adminClient()
      .from("messages")
      .insert({
        id: messageId,
        tenant_id: "00000000-0000-4000-8000-000000000001",
        conversation_id: SEED.ana.conversation,
        direction: "inbound",
        kind: "text",
        body,
        wamid: `wamid.e2e.live.${Date.now()}`,
        occurred_at: new Date().toISOString(),
      });
    expect(error).toBeNull();

    await expect(CHAT(page).getByText(body)).toBeVisible({ timeout: 15000 });
    expect(
      await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload),
    ).toBe(true);
  });

  for (const [label, delayMs] of [
    ["inmediatamente tras 'En vivo' (ventana de carrera)", 0],
    ["1300 ms después de 'En vivo'", 1300],
  ] as const) {
    test(`un mensaje insertado ${label} aparece sin recargar`, async ({ page }) => {
      await login(page);
      await openChat(page, SEED.ana.conversation);
      await waitForLive(page);
      if (delayMs > 0) {
        await page.waitForTimeout(delayMs);
      }
      await page.evaluate(() => {
        (window as unknown as { __noReload: boolean }).__noReload = true;
      });

      const body = `Mensaje en vivo e2e ${delayMs}ms ${Date.now()}`;
      const { error } = await adminClient()
        .from("messages")
        .insert({
          id: messageId,
          tenant_id: "00000000-0000-4000-8000-000000000001",
          conversation_id: SEED.ana.conversation,
          direction: "inbound",
          kind: "text",
          body,
          wamid: `wamid.e2e.live.${delayMs}.${Date.now()}`,
          occurred_at: new Date().toISOString(),
        });
      expect(error).toBeNull();

      await expect(CHAT(page).getByText(body)).toBeVisible({ timeout: 15000 });
      expect(
        await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload),
      ).toBe(true);
    });
  }
});

test.describe("Bandeja rediseñada (S06) — móvil", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("un panel a la vez, con navegación atrás", async ({ page }) => {
    await login(page);
    await page.goto("/inbox");
    const list = conversationList(page);
    await expect(list).toBeVisible();
    await expect(page.getByText("Selecciona una conversación para ver sus mensajes")).toBeHidden();

    await conversationItems(page).filter({ hasText: SEED.ana.name }).locator("a").click();
    await page.waitForURL(new RegExp(`/inbox/${SEED.ana.conversation}`));

    // Solo el chat: la lista y los detalles quedan ocultos.
    await expect(CHAT(page)).toBeVisible();
    await expect(list).toBeHidden();
    await expect(page.getByRole("complementary", { name: "Datos del contacto" })).toBeHidden();

    // Detalles → panel del contacto, sin chat ni lista.
    await page.getByRole("button", { name: "Detalles" }).click();
    await expect(page.getByRole("complementary", { name: "Datos del contacto" })).toBeVisible();
    await expect(CHAT(page)).toBeHidden();
    await page
      .getByRole("complementary", { name: "Datos del contacto" })
      .getByRole("button")
      .first()
      .click();
    await expect(CHAT(page)).toBeVisible();

    // Tarjeta de llamada → reporte; Ver sesión → transcripción flotante; atrás hasta la lista.
    await CHAT(page)
      .getByRole("button", { name: /Ver reporte de la llamada/ })
      .click();
    const report = page.getByRole("complementary", { name: "Reporte de la llamada" });
    await expect(report).toBeVisible();
    await expect(CHAT(page)).toBeHidden();
    await report.getByRole("button", { name: "Ver sesión" }).click();
    const dialog = page.locator("dialog[open]");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: "Transcripción de la llamada" }),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Volver a la conversación" }).click();
    await expect(dialog).toHaveCount(0);
    await report.getByRole("button", { name: "Volver", exact: true }).click();
    await expect(CHAT(page)).toBeVisible();
    await page.getByRole("button", { name: "Volver a chats" }).click();
    await expect(list).toBeVisible();
    await expect(CHAT(page)).toBeHidden();
  });

  test("foco: al abrir un chat el foco pasa al panel de la conversación", async ({ page }) => {
    await login(page);
    await page.goto("/inbox");
    await conversationItems(page).filter({ hasText: SEED.ana.name }).locator("a").click();
    await page.waitForURL(new RegExp(`/inbox/${SEED.ana.conversation}`));
    await expect(CHAT(page)).toBeFocused({ timeout: 3000 });
  });
});

test.describe("S16 · Bandeja Parte 4: tres anchos y ventana flotante de llamada", () => {
  const widths = [390, 1024, 1440] as const;

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  async function expectNoHorizontalOverflow(page: Page, label: string): Promise<void> {
    const metrics = await page.evaluate(() => {
      const root = document.documentElement;
      const offenders = [...document.querySelectorAll("*")]
        .filter((element) => {
          const className = element.getAttribute("class") ?? "";
          if (className.includes("sr-only")) {
            return false;
          }
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return (
            (element.scrollWidth > element.clientWidth + 1 &&
              element.clientWidth > 0 &&
              style.overflowX !== "visible") ||
            (rect.width > 0 && (rect.right > window.innerWidth + 1 || rect.left < -1))
          );
        })
        .slice(0, 12)
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            tag: element.tagName.toLowerCase(),
            className: (element.getAttribute("class") ?? "").slice(0, 80),
            scrollWidth: element.scrollWidth,
            clientWidth: element.clientWidth,
            right: Math.round(rect.right),
            left: Math.round(rect.left),
          };
        });
      return {
        scrollWidth: root.scrollWidth,
        clientWidth: root.clientWidth,
        offenders,
      };
    });

    expect(metrics.scrollWidth, `${label}: scrollWidth de html`).toBeLessThanOrEqual(
      metrics.clientWidth,
    );
    expect(metrics.offenders, `${label}: elementos que desbordan`).toEqual([]);
  }

  for (const width of widths) {
    test(`la bandeja a ${width}px muestra el pie y no añade composer`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await openChat(page, SEED.ana.conversation);
      await waitForLive(page);

      await expect(page.getByText("La IA responde automáticamente")).toBeVisible();
      await expect(page.locator("textarea")).toHaveCount(0);
      await expect(page.getByRole("textbox")).toHaveCount(0);
      await expect(page.getByRole("status").filter({ hasText: "En vivo" })).toBeVisible();
    });

    test(`la bandeja y la llamada no desbordan horizontalmente a ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await openChat(page, SEED.ana.conversation);
      await expectNoHorizontalOverflow(page, `bandeja ${width}px`);

      await CHAT(page)
        .getByRole("button", { name: /Ver reporte de la llamada/ })
        .click();
      await page.getByRole("button", { name: "Ver sesión" }).click();
      const dialog = page.locator("dialog[open]");
      await expect(dialog).toBeVisible();
      await expectNoHorizontalOverflow(page, `llamada ${width}px`);
    });

    test(`axe sin violaciones serious/critical en la llamada a ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await openChat(page, SEED.ana.conversation);
      await CHAT(page)
        .getByRole("button", { name: /Ver reporte de la llamada/ })
        .click();
      await page.getByRole("button", { name: "Ver sesión" }).click();
      await expect(page.locator("dialog[open]")).toBeVisible();

      const results = await new AxeBuilder({ page }).analyze();
      const severe = results.violations
        .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
        .map(
          (violation) =>
            `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(" | ")}`,
        );
      expect(severe).toEqual([]);
    });
  }

  test("la ventana de llamada se abre con teclado, atrapa foco, Escape cierra y conserva el hilo", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 500 });
    await openChat(page, SEED.ana.conversation);
    const thread = page.getByRole("region", { name: "Historial de la conversación" });
    await thread.evaluate((element) => {
      const spacer = document.createElement("div");
      spacer.setAttribute("aria-hidden", "true");
      spacer.style.height = "1200px";
      element.appendChild(spacer);
      element.scrollTop = 120;
    });

    await CHAT(page)
      .getByRole("button", { name: /Ver reporte de la llamada/ })
      .click();
    const openButton = page.getByRole("button", { name: "Ver sesión" });
    await openButton.focus();
    const scrollBefore = await thread.evaluate((element) => element.scrollTop);
    expect(scrollBefore).toBeGreaterThan(0);
    await page.keyboard.press("Enter");

    const dialog = page.locator("dialog[open]");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { level: 2 })).toBeFocused();
    for (let index = 0; index < 8; index += 1) {
      await page.keyboard.press("Tab");
      const focusInside = await page.evaluate(() => {
        const openDialog = document.querySelector("dialog[open]");
        return openDialog !== null && openDialog.contains(document.activeElement);
      });
      expect(focusInside, `Tab ${index + 1} salió de la ventana de llamada`).toBe(true);
    }

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(openButton).toBeFocused();
    expect(await thread.evaluate((element) => element.scrollTop)).toBe(scrollBefore);
  });
});
