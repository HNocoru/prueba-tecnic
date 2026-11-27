import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { DEMO_EMAIL, DEMO_PASSWORD, login } from "./support/helpers";

test.describe("rediseño de /login", () => {
  test("un correo mal formado muestra el mensaje en español y no navega", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "sin-arroba");
    await page.fill('input[name="password"]', "cualquiera");
    await page.click('button[type="submit"]');

    await expect(page.getByText("Formato de email inválido")).toBeVisible();
    await expect(page).toHaveURL(/\/login\/?$/);
    await expect(page.locator('input[name="email"]')).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator('input[name="email"]')).toBeFocused();
  });

  test("credenciales incorrectas muestran el mensaje genérico exacto", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', DEMO_EMAIL);
    await page.fill('input[name="password"]', `${DEMO_PASSWORD}-incorrecta`);
    await page.click('button[type="submit"]');

    await expect(page.getByText("Email o contraseña incorrectos.")).toBeVisible();
    await expect(page).toHaveURL(/\/login\/?$/);
  });

  test("credenciales correctas llegan a /home", async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\/home\/?$/);
  });

  test("sin violaciones axe serious o critical", async ({ page }) => {
    await page.goto("/login");

    const results = await new AxeBuilder({ page }).analyze();
    const severe = results.violations
      .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
      .map(
        (violation) =>
          `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(" | ")}`,
      );

    expect(severe).toEqual([]);
  });

  test("el titular del hero usa Bricolage Grotesque cargada", async ({ page }) => {
    await page.goto("/login");

    const font = await page.evaluate(async () => {
      await document.fonts.ready;
      const heading = document.querySelector("main h1");
      if (!heading) {
        return { family: "", loaded: false };
      }
      const family = getComputedStyle(heading).fontFamily;
      const firstFamily = family
        .split(",")[0]
        .trim()
        .replace(/^["']|["']$/g, "");
      return { family, loaded: document.fonts.check(`700 48px "${firstFamily}"`) };
    });

    expect(font.family).toContain("Bricolage");
    expect(font.loaded).toBe(true);
  });

  for (const width of [390, 1024, 1440]) {
    test(`sin desbordamiento horizontal a ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/login");

      const metrics = await page.evaluate(() => {
        const root = document.documentElement;
        return { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth };
      });

      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
    });
  }
});
