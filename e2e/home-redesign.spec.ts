import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { login } from "./support/helpers";

/** El seed local trae el número demo en estado connected. */
const connectedCard = 'section[aria-labelledby="whatsapp-card-title"]';

test.describe("Rediseño de /home (A · Mostrador)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("la tarjeta conectada muestra el número y el estado, sin datos de plataforma", async ({
    page,
  }) => {
    const card = page.locator(connectedCard);

    await expect(card.getByRole("heading", { name: "Tu WhatsApp", level: 2 })).toBeVisible();
    await expect(card.getByRole("button", { name: "Guardar número" })).toHaveCount(0);
    await expect(card.getByRole("button", { name: "Conectar número" })).toHaveCount(0);
    await expect(card.getByText("Pega esto en Meta")).toHaveCount(0);
    await expect(card.getByText(/suscribe el campo/i)).toHaveCount(0);
    await expect(card.getByText(/Listo: esperando tu primer mensaje|Conectado/)).toBeVisible();

    const bodyText = await page.locator("body").innerText();
    expect(bodyText).not.toMatch(/webhook|verify|token|phone_number_id|\bAPI\b|Meta/i);
  });

  test("cambiar número abre el mismo formulario y no ofrece copiar nada", async ({ page }) => {
    const card = page.locator(connectedCard);
    const changeButton = card.getByRole("button", { name: "Cambiar número" });
    await expect(changeButton).toBeVisible();
    await changeButton.click();

    await expect(card.getByRole("heading", { name: "Conecta tu WhatsApp" })).toBeVisible();
    const input = card.getByLabel("Número de WhatsApp Business");
    await expect(input).toBeVisible();
    await expect(input).toBeFocused();
    await expect(
      card.getByText(
        "Escríbelo con código de país, por ejemplo +52 55 1234 5678. Debe ser un número registrado en WhatsApp Business.",
      ),
    ).toBeVisible();
    await expect(card.getByRole("button", { name: "Conectar número" })).toBeVisible();

    await expect(card.locator("code")).toHaveCount(0);
    await expect(card.getByRole("button", { name: /copiar/i })).toHaveCount(0);
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
