import { expect, test } from "@playwright/test";

const DEMO_EMAIL = process.env.DEMO_USER_EMAIL || "demo@example.com";
const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD || "DemoPassword123!";

test.describe("E2E - Flujos Existentes y Regresión Visual / Funcional", () => {
  test("1. Login exitoso -> /home y navegación por cada ítem del Sidebar", async ({ page }) => {
    // 1. Acceder a /login
    await page.goto("/login");
    await expect(page).toHaveURL(/.*\/login/);

    // 2. Llenar credenciales del usuario demo sembrado
    await page.fill('input[name="email"]', DEMO_EMAIL);
    await page.fill('input[name="password"]', DEMO_PASSWORD);
    await page.click('button[type="submit"]');

    // 3. Debe redirigir a /home y mostrar título "Bienvenido"
    await page.waitForURL("**/home", { timeout: 15000 });
    await expect(page.getByRole("heading", { name: "Bienvenido", level: 1 })).toBeVisible();

    // 4. Probar cada ítem del Sidebar
    // Bandeja
    await page.click('nav[aria-label="Principal"] a:has-text("Bandeja")');
    await page.waitForURL("**/inbox**");
    await expect(page.getByRole("heading", { name: "Bandeja", level: 1 })).toBeVisible();

    // Contactos
    await page.click('nav[aria-label="Principal"] a:has-text("Contactos")');
    await page.waitForURL("**/contacts**");
    await expect(page.getByRole("heading", { name: "Contactos", level: 1 })).toBeVisible();

    // Negocio
    await page.click('nav[aria-label="Principal"] a:has-text("Negocio")');
    await page.waitForURL("**/business**");
    await expect(page.getByRole("heading", { name: "Negocio", level: 1 })).toBeVisible();

    // Asistente
    await page.click('nav[aria-label="Principal"] a:has-text("Asistente")');
    await page.waitForURL("**/assistant**");
    await expect(page.getByRole("heading", { name: "Asistente", level: 1 })).toBeVisible();

    // Cuenta
    await page.click('nav[aria-label="Principal"] a:has-text("Cuenta")');
    await page.waitForURL("**/account**");
    await expect(page.getByRole("heading", { name: "Cuenta", level: 1 })).toBeVisible();

    // Inicio
    await page.click('nav[aria-label="Principal"] a:has-text("Inicio")');
    await page.waitForURL("**/home**");
    await expect(page.getByRole("heading", { name: "Bienvenido", level: 1 })).toBeVisible();

    // 5. Botón de salir cierra sesión -> redirige a /login
    await page.click('button:has-text("Cerrar sesión")');
    await page.waitForURL("**/login**");
    await expect(page).toHaveURL(/.*\/login/);
  });

  test("2. Tarjeta WhatsApp del negocio en /home", async ({ page }) => {
    // Iniciar sesión
    await page.goto("/login");
    await page.fill('input[name="email"]', DEMO_EMAIL);
    await page.fill('input[name="password"]', DEMO_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/home**");

    // Si muestra el formulario o el estado conectado
    const cardTitle = page.locator('h2:has-text("WhatsApp del negocio")');
    await expect(cardTitle).toBeVisible();

    const saveButton = page.locator('button:has-text("Guardar número")');
    if (await saveButton.isVisible()) {
      // Probar validación cliente / servidor con input inválido
      await page.fill('input[name="displayPhone"]', "invalido");
      await page.fill('input[name="phoneNumberId"]', "123");
      await saveButton.click();

      // Debe mostrar mensaje de error en la tarjeta
      const alert = page.locator('p[role="alert"]');
      await expect(alert).toBeVisible();

      // Probar con número válido
      await page.fill('input[name="displayPhone"]', "+5215512345678");
      await page.fill('input[name="phoneNumberId"]', "109998887776665");
      await saveButton.click();
      await expect(page.locator('text="Número guardado."')).toBeVisible();
    } else {
      // Estado conectado: sin pasos de configuración y con acción para copiar la URL.
      await expect(page.locator('text="Pega esto en Meta"')).toHaveCount(0);
      await expect(page.getByText(/Después de verificar, suscribe el campo/)).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Copiar URL del webhook" })).toBeVisible();
    }
  });

  test("3. Bandeja de entrada: selección, búsqueda y filtros", async ({ page }) => {
    // Iniciar sesión y navegar a /inbox
    await page.goto("/login");
    await page.fill('input[name="email"]', DEMO_EMAIL);
    await page.fill('input[name="password"]', DEMO_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/home**");

    await page.goto("/inbox");
    await expect(page.locator("h1")).toContainText("Bandeja");

    // Búsqueda en la lista de conversaciones
    const searchInput = page.locator('input[id="conversation-search"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill("PruebaFiltroInexistenteXYZ123");
    await expect(
      page.locator('text="No hay conversaciones que coincidan con la búsqueda o el estado."'),
    ).toBeVisible();

    // Limpiar búsqueda
    await searchInput.fill("");

    // Seleccionar una conversación existente si hay ítems en la lista
    const firstConv = page.locator('section[aria-label="Conversaciones"] ul li a').first();
    if (await firstConv.isVisible()) {
      await firstConv.click();
      await page.waitForURL(/.*\/inbox\/.+/);

      // Filtros de línea de tiempo Todo / Mensajes / Llamadas
      const tabAll = page.locator(
        'nav[aria-label="Filtrar línea de tiempo"] button:has-text("Todo")',
      );
      const tabMessages = page.locator(
        'nav[aria-label="Filtrar línea de tiempo"] button:has-text("Mensajes")',
      );
      const tabCalls = page.locator(
        'nav[aria-label="Filtrar línea de tiempo"] button:has-text("Llamadas")',
      );

      await expect(tabAll).toBeVisible();
      await tabMessages.click();
      await expect(page).toHaveURL(/.*filter=messages.*/);

      await tabCalls.click();
      await expect(page).toHaveURL(/.*filter=calls.*/);

      await tabAll.click();
      await expect(page).toHaveURL(/.*filter=all.*/);
    }
  });
});

test.describe("Flujos Faltantes (Fases F3/F5) marcados como fixme/skip", () => {
  test.fixme("Métricas del dashboard: tarjetas con total de mensajes, llamadas, tiempo medio y conversión", async () => {});
  test.fixme("Gráficas del dashboard: volumen de actividad temporal y tasas de resolución", async () => {});
  test.fixme("Edición de perfil de usuario en /account: cambio de nombre, email y contraseña", async () => {});
  test.fixme("Configuración del negocio en /business: horarios de atención, catálogo y políticas", async () => {});
  test.fixme("Configuración del asistente en /assistant: selección de nombre, personalidad/tono y voz", async () => {});
});
