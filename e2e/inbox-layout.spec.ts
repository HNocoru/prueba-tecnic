import { expect, test, type Page } from "@playwright/test";

import { login } from "./support/helpers";

/** Abre la primera conversación; en móvil la lista es el único panel visible. */
async function openFirstConversation(page: Page): Promise<void> {
  await page.locator("a[href^='/inbox/']").first().click();
  await page.waitForURL(/\/inbox\/[0-9a-f-]+/);
  await expect(page.getByRole("region", { name: "Conversación", exact: true })).toBeVisible();
}

test.describe("S27: la bandeja no se descuadra", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  for (const width of [390]) {
    test(`a ${width}px no hay desbordamiento y solo hay un panel`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/inbox");
      const list = page.getByRole("region", { name: "Conversaciones", exact: true });
      await expect(list).toBeVisible();
      await expect(page.getByRole("region", { name: "Conversación", exact: true })).toBeHidden();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width,
      );
      const box = await list.boundingBox();
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);

      await openFirstConversation(page);
      await expect(list).toBeHidden();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width,
      );
    });
  }

  for (const width of [1024, 1440, 1620]) {
    test(`a ${width}px ningún panel ni fila se sale de su caja`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/inbox");
      await openFirstConversation(page);

      const list = page.getByRole("region", { name: "Conversaciones", exact: true });
      const result = await page.evaluate(() => {
        const sections = Array.from(
          document.querySelectorAll<HTMLElement>("main section, main aside"),
        );
        return sections.map((el) => ({
          label: el.getAttribute("aria-label"),
          overflow: el.scrollWidth - el.clientWidth,
        }));
      });
      for (const panel of result) {
        expect(panel.overflow, `panel ${panel.label}`).toBeLessThanOrEqual(0);
      }

      const listBox = await list.boundingBox();
      const selected = list.locator("a[aria-current='page']");
      const selectedBox = await selected.boundingBox();
      expect(selectedBox!.x).toBeGreaterThanOrEqual(listBox!.x);
      expect(selectedBox!.x + selectedBox!.width).toBeLessThanOrEqual(listBox!.x + listBox!.width);

      const thread = await page
        .getByRole("region", { name: "Conversación", exact: true })
        .boundingBox();
      expect(thread!.x).toBeGreaterThanOrEqual(listBox!.x + listBox!.width);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width,
      );
    });
  }
});
