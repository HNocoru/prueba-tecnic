import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { login } from "./support/helpers";

/** El seed local trae el número demo en estado connected. */
const connectedCard = 'section[aria-labelledby="whatsapp-card-title"]';

test.describe("Rediseño de /home (A · Mostrador)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("la tarjeta conectada oculta los pasos de configuración y no expone el token", async ({
    page,
  }) => {
    const card = page.locator(connectedCard);

    await expect(
      card.getByRole("heading", { name: "WhatsApp del negocio", level: 2 }),
    ).toBeVisible();
    await expect(card.getByRole("button", { name: "Guardar número" })).toHaveCount(0);
    await expect(card.getByText("Pega esto en Meta")).toHaveCount(0);
    await expect(card.getByText(/suscribe el campo/i)).toHaveCount(0);

    // Solo se indica si el secreto está configurado; nunca su valor.
    await expect(card.getByText(/Token de verificación/i)).toContainText(/configurado|pendiente/i);
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).not.toMatch(/WHATSAPP_VERIFY_TOKEN|verify[_-]?token/i);
  });

  test("copiar la URL cambia el texto del botón y anuncia el resultado", async ({ page }) => {
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);

    const card = page.locator(connectedCard);
    const webhookUrl = (await card.locator("code").first().innerText()).trim();
    expect(webhookUrl).toMatch(/^(\/|https?:\/\/)/);

    // El nombre accesible cambia a "URL copiada"; el localizador debe ser estable.
    const copyButton = card.locator('button[type="button"]');
    await expect(copyButton).toHaveText("Copiar URL del webhook");
    await copyButton.click();

    await expect(copyButton).toHaveText("URL copiada");
    await expect(card.getByRole("status")).toContainText(
      "URL del webhook copiada al portapapeles.",
    );

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBe(webhookUrl);
    expect(clipboardText).not.toMatch(/token/i);
  });

  test("sin violaciones axe serious o critical en /home", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);

    const results = await new AxeBuilder({ page }).analyze();
    const severe = results.violations
      .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
      .map(
        (violation) =>
          `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(" | ")}`,
      );

    expect(severe).toEqual([]);
  });

  test("el h1 usa la familia de display cargada", async ({ page }) => {
    const font = await page.evaluate(async () => {
      await document.fonts.ready;
      const heading = document.querySelector("h1");
      if (!heading) return null;

      const style = getComputedStyle(heading);
      const firstFamily = style.fontFamily
        .split(",")[0]
        .trim()
        .replace(/^["']|["']$/g, "");
      return {
        family: style.fontFamily,
        loaded: document.fonts.check(`${style.fontWeight} ${style.fontSize} "${firstFamily}"`),
      };
    });

    expect(font, "debe existir un h1").not.toBeNull();
    expect(font?.family).toContain("Bricolage");
    expect(font?.loaded).toBe(true);
  });

  test("sin desbordamiento horizontal en 390, 1024 y 1440", async ({ page }) => {
    for (const width of [390, 1024, 1440]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/home");

      const metrics = await page.evaluate(() => {
        const main = document.querySelector("main");
        return {
          htmlScroll: document.documentElement.scrollWidth,
          htmlClient: document.documentElement.clientWidth,
          mainScroll: main?.scrollWidth ?? 0,
          mainClient: main?.clientWidth ?? 0,
        };
      });

      expect(metrics.htmlScroll, `html a ${width}px`).toBeLessThanOrEqual(metrics.htmlClient);
      expect(metrics.mainScroll, `main a ${width}px`).toBeLessThanOrEqual(metrics.mainClient);
    }
  });
});
