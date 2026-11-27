import { expect, test, type Page } from "@playwright/test";

import { SEED, TENANT_ID, adminClient, login } from "./support/helpers";

const CALL_ID = "00000000-0000-4000-8000-0000000000e4";
const LONG_TOKEN = `https://ejemplo.mx/${"a".repeat(420)}`;

async function cleanup(): Promise<void> {
  const admin = adminClient();
  await admin.from("calls").delete().eq("id", CALL_ID);
}

async function expectNoOverflow(page: Page, label: string): Promise<void> {
  const metrics = await page.evaluate(() => {
    const root = document.documentElement;
    const offenders = [...document.querySelectorAll("*")]
      .filter((element) => {
        if ((element.getAttribute("class") ?? "").includes("sr-only")) {
          return false;
        }
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return (
          (element.scrollWidth > element.clientWidth + 1 &&
            element.clientWidth > 0 &&
            style.overflowX !== "visible") ||
          (rect.width > 0 && (rect.right > window.innerWidth + 1 || rect.left < -1))
        );
      })
      .slice(0, 8)
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        className: (element.getAttribute("class") ?? "").slice(0, 60),
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
      }));
    return { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth, offenders };
  });
  expect(metrics.scrollWidth, `${label}: scrollWidth de html`).toBeLessThanOrEqual(
    metrics.clientWidth,
  );
  expect(metrics.offenders, `${label}: elementos que desbordan`).toEqual([]);
}

test.describe.configure({ mode: "serial" });

test.describe("S16 · desbordamiento con texto real de llamada extenso", () => {
  test.beforeAll(async () => {
    await cleanup();
    const admin = adminClient();
    const { error } = await admin.from("calls").insert({
      id: CALL_ID,
      tenant_id: TENANT_ID,
      conversation_id: SEED.ana.conversation,
      wa_call_id: "e2e.long.summary.token",
      started_at: "2026-11-27T17:00:00Z",
      ended_at: "2026-11-27T17:01:00Z",
      duration_seconds: 60,
      outcome: "completed",
      summary: `Resumen con un enlace largo: ${LONG_TOKEN}`,
    });
    expect(error, "siembra de llamada con token extenso").toBeNull();
  });

  test.afterAll(cleanup);

  for (const width of [390, 1024, 1440]) {
    test(`el reporte y la ventana no desbordan a ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await login(page);
      await page.goto(`/inbox/${SEED.ana.conversation}`);
      const chat = page.locator('section[aria-label="Conversación"]:visible');
      await chat
        .getByRole("button", { name: /Ver reporte de la llamada/ })
        .last()
        .click();
      const report = page.getByRole("complementary", { name: "Reporte de la llamada" });
      await expect(report).toContainText(LONG_TOKEN);
      await expectNoOverflow(page, `reporte ${width}px`);

      await report.getByRole("button", { name: "Ver sesión" }).click();
      const dialog = page.locator("dialog[open]");
      await expect(dialog).toBeVisible();
      await dialog.getByRole("button", { name: "Volver al resumen" }).click();
      await expect(dialog).toContainText(LONG_TOKEN);
      await expectNoOverflow(page, `resumen de la ventana ${width}px`);
      await dialog.getByRole("button", { name: "Ver transcripción" }).click();
      await expectNoOverflow(page, `transcripción de la ventana ${width}px`);
    });
  }
});
