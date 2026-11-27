import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { login } from "./support/helpers";

const routes = ["/home", "/inbox", "/contacts", "/business", "/assistant", "/account"];
const widths = [360, 390, 768, 1024, 1280, 1440, 1920, 2560];

test.describe("shell del dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  for (const route of routes) {
    test(`${route} no desborda horizontalmente ni hace scroll el body`, async ({ page }) => {
      for (const width of widths) {
        await page.setViewportSize({ width, height: 800 });
        await page.goto(route);

        const metrics = await page.evaluate(() => {
          const html = document.documentElement;
          return {
            scrollWidth: html.scrollWidth,
            clientWidth: html.clientWidth,
            scrollHeight: html.scrollHeight,
            clientHeight: html.clientHeight,
            bodyScrollHeight: document.body.scrollHeight,
            bodyClientHeight: document.body.clientHeight,
          };
        });

        expect(
          metrics.scrollWidth,
          `${route} a ${width}px: scrollWidth de html`,
        ).toBeLessThanOrEqual(metrics.clientWidth);
        expect(
          metrics.scrollHeight,
          `${route} a ${width}px: scrollHeight de html (scroll de página)`,
        ).toBeLessThanOrEqual(metrics.clientHeight);
        expect(
          metrics.bodyScrollHeight,
          `${route} a ${width}px: scrollHeight de body`,
        ).toBeLessThanOrEqual(metrics.bodyClientHeight);
      }
    });
  }

  test("las utilidades de Tailwind ganan a la capa mui", async ({ page }) => {
    await page.goto("/home");

    const backgroundColor = await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.className = "bg-canvas";
      document.body.appendChild(probe);

      const competing = document.createElement("style");
      competing.textContent = "@layer mui { .bg-canvas { background-color: rgb(1, 2, 3); } }";
      document.head.appendChild(competing);

      const computed = getComputedStyle(probe).backgroundColor;
      competing.remove();
      probe.remove();
      return computed;
    });

    expect(backgroundColor, "bg-canvas debe imponerse a la capa mui").toBe("rgb(255, 255, 255)");
  });

  for (const route of ["/home", "/inbox"]) {
    test(`${route} sin violaciones axe serious o critical`, async ({ page }) => {
      await page.goto(route);
      // Los esqueletos de carga usan aria-label en un div sin rol; axe los
      // marca como aria-prohibited-attr. Se analiza la página ya asentada.
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
  }
});
