import { randomBytes } from "node:crypto";

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { adminClient } from "./support/helpers";

const PASSWORD = `Segura123!${randomBytes(6).toString("base64url")}`;

function uniqueAccount() {
  const suffix = randomBytes(6).toString("hex");
  return { email: `signup-${suffix}@example.test`, businessName: `Negocio ${suffix}` };
}

async function removeAccount(email: string): Promise<void> {
  const admin = adminClient();
  const users = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const user = users.data.users.find((candidate) => candidate.email === email);
  if (!user) {
    return;
  }
  const memberships = await admin.from("tenant_members").select("tenant_id").eq("user_id", user.id);
  for (const tenantId of memberships.data?.map((row) => row.tenant_id) ?? []) {
    await admin.from("tenants").delete().eq("id", tenantId);
  }
  await admin.auth.admin.deleteUser(user.id);
}

test.describe("registro de cuentas", () => {
  test("un correo nuevo crea la cuenta y llega a /home", async ({ page }) => {
    const account = uniqueAccount();
    try {
      await page.goto("/signup");
      await page.fill('input[name="businessName"]', account.businessName);
      await page.fill('input[name="email"]', account.email);
      await page.fill('input[name="password"]', PASSWORD);
      await page.click('button[type="submit"]');

      await expect(page).toHaveURL(/\/home\/?$/, { timeout: 20000 });
    } finally {
      await removeAccount(account.email);
    }
  });

  test("un correo repetido muestra el mensaje exacto en español", async ({ page }) => {
    const account = uniqueAccount();
    const admin = adminClient();
    const created = await admin.auth.admin.createUser({
      email: account.email,
      password: PASSWORD,
      email_confirm: true,
    });
    expect(created.error).toBeNull();

    try {
      await page.goto("/signup");
      await page.fill('input[name="businessName"]', account.businessName);
      await page.fill('input[name="email"]', account.email);
      await page.fill('input[name="password"]', PASSWORD);
      await page.click('button[type="submit"]');

      await expect(page.getByText("Ya existe una cuenta con ese correo.")).toBeVisible();
      await expect(page).toHaveURL(/\/signup\/?$/);
    } finally {
      await removeAccount(account.email);
    }
  });

  test("una contraseña débil se rechaza en español sin navegar", async ({ page }) => {
    await page.goto("/signup");
    await page.fill('input[name="businessName"]', "Café Aurora");
    await page.fill('input[name="email"]', "dueno@cafe.mx");
    await page.fill('input[name="password"]', "corta");
    await page.click('button[type="submit"]');

    await expect(page.getByText("La contraseña debe tener al menos 12 caracteres")).toBeVisible();
    await expect(page).toHaveURL(/\/signup\/?$/);
    await expect(page.locator('input[name="password"]')).toBeFocused();
  });

  test("mostrar y ocultar contraseña cambia el tipo y mantiene el objetivo táctil", async ({
    page,
  }) => {
    await page.goto("/signup");
    const password = page.locator('input[name="password"]');
    const toggle = page.getByRole("button", { name: "Mostrar contraseña" });

    await expect(password).toHaveAttribute("type", "password");
    expect((await toggle.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    await toggle.click();

    await expect(password).toHaveAttribute("type", "text");
    await expect(page.getByRole("button", { name: "Ocultar contraseña" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("los enlaces conectan registro y login en ambos sentidos", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Crear cuenta" }).click();
    await expect(page).toHaveURL(/\/signup\/?$/);

    await page.getByRole("link", { name: "Ya tengo cuenta" }).click();
    await expect(page).toHaveURL(/\/login\/?$/);
  });

  test("sin violaciones axe serious o critical", async ({ page }) => {
    await page.goto("/signup");

    const results = await new AxeBuilder({ page }).analyze();
    const severe = results.violations
      .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
      .map(
        (violation) =>
          `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(" | ")}`,
      );

    expect(severe).toEqual([]);
  });

  test("el titular del registro usa Bricolage Grotesque cargada", async ({ page }) => {
    await page.goto("/signup");

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
      await page.goto("/signup");

      const metrics = await page.evaluate(() => {
        const root = document.documentElement;
        return { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth };
      });

      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
    });
  }
});
