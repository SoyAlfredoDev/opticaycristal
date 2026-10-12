import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
async function fillContact(page: Page) {
  await page.getByLabel("Nombre de la empresa", { exact: true }).fill("Empresa de prueba");
  await page.getByLabel("Nombre de contacto", { exact: true }).fill("Persona de prueba");
  await page.getByLabel("Cargo", { exact: true }).fill("RRHH");
  await page.getByLabel("Correo electrónico", { exact: true }).fill("prueba@example.com");
  await page.getByLabel("Teléfono", { exact: true }).fill("+56 9 1234 5678");
  await page.getByLabel("Comuna", { exact: true }).fill("Santiago");
  await page.getByLabel("Región", { exact: true }).selectOption("Metropolitana de Santiago");
  await page.getByRole("checkbox", { name: /Autorizo el tratamiento/ }).check();
}
test("catálogo filtra, busca, vacía y restaura propuestas; producto conserva foco", async ({ page }) => {
  await page.goto("/optica");
  await expect(page.getByRole("status")).toHaveText("6 propuestas para explorar");
  await page.getByRole("button", { name: "Accesorios", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("2 propuestas para explorar");
  await page.getByLabel("Buscar lentes y accesorios").fill("nada coincide");
  await expect(page.getByRole("heading", { name: "No encontramos coincidencias" })).toBeVisible();
  await page.getByRole("button", { name: "Ver todas las propuestas" }).click();
  if (!await page.getByRole("checkbox", { name: "Metal", exact: true }).isVisible()) await page.getByText("Filtrar productos", { exact: true }).click();
  await page.getByRole("checkbox", { name: "Metal", exact: true }).check();
  await expect(page.getByRole("status")).toHaveText("1 propuesta para explorar");
  const trigger = page.getByRole("button", { name: "Ver producto: Montura redonda" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Montura redonda" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Cerrar producto" })).toBeFocused();
  const link = dialog.getByRole("link", { name: "Consultar este producto" });
  await expect(link).toHaveAttribute("href", /wa.me\/56922452080/);
  expect(new URL((await link.getAttribute("href"))!).searchParams.get("text")).toContain("montura redonda");
  await page.keyboard.press("Shift+Tab"); await expect(link).toBeFocused();
  await page.keyboard.press("Tab"); await expect(dialog.getByRole("button", { name: "Cerrar producto" })).toBeFocused();
  await page.keyboard.press("Escape"); await expect(dialog).not.toBeVisible(); await expect(trigger).toBeFocused();
});
test("convenio valida mínimo, muestra error de envío y permite reintentar sin perder datos", async ({ page }) => {
  await page.goto("/convenios");
  await page.getByRole("link", { name: "Registrar mi empresa", exact: true }).first().click();
  await page.getByLabel("Nombre de contacto", { exact: true }).fill("Persona de prueba");
  await page.getByLabel("Cargo", { exact: true }).fill("RRHH");
  await page.getByLabel("Correo electrónico", { exact: true }).fill("prueba@example.com");
  await page.getByLabel("Teléfono", { exact: true }).fill("+56 9 1234 5678");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Nombre de la empresa", { exact: true }).fill("Empresa de prueba");
  await page.getByLabel("Comuna", { exact: true }).fill("Santiago");
  await page.getByLabel("Región", { exact: true }).selectOption("Metropolitana de Santiago");
  await page.getByLabel("Número de trabajadores", { exact: true }).fill("10");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByText("Los convenios son para empresas con más de 10 trabajadores.", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Número de trabajadores", { exact: true })).toBeFocused();
  await page.getByLabel("Número de trabajadores", { exact: true }).fill("11");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("checkbox", { name: /Autorizo el tratamiento/ }).check();
  let attempts = 0;
  await page.route("**/api/solicitudes", async (route) => {
    attempts++;
    const payload = route.request().postDataJSON();
    expect(payload.origen).toBe("convenio"); expect(payload.detalles.trabajadores).toBe(11);
    await route.fulfill({ status: attempts === 1 ? 503 : 200, json: attempts === 1 ? { error: "Error de prueba. Reintenta." } : { ok: true } });
  });
  await page.getByRole("button", { name: "Solicitar registro de mi empresa" }).click();
  await expect(page.getByRole("form").getByRole("alert")).toHaveText("Error de prueba. Reintenta.");
  await expect(page.getByText("Empresa de prueba", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Solicitar registro de mi empresa" }).click();
  await expect(page.getByRole("heading", { name: "Recibimos tu solicitud" })).toBeVisible(); expect(attempts).toBe(2);
  await page.getByRole("button", { name: "Enviar otra solicitud" }).click();
  await expect(page.getByRole("heading", { name: "Quién lleva el convenio" })).toBeVisible();
  await expect(page.getByLabel("Nombre de contacto", { exact: true })).toHaveValue("");
});
test("jornadas exige consentimiento y envía datos de coordinación al endpoint", async ({ page }) => {
  await page.goto("/jornadas");
  await page.getByRole("link", { name: "Coordinar una jornada", exact: true }).click();
  await fillContact(page);
  await page.getByLabel("Mes estimado", { exact: true }).selectOption({ index: 1 });
  await page.getByLabel("Participantes estimados (opcional)", { exact: true }).fill("25");
  await page.getByLabel("Dirección de la jornada (opcional)", { exact: true }).fill("Dirección de prueba");
  await page.getByLabel("Comentarios o necesidades (opcional)", { exact: true }).fill("Coordinar espacio disponible");
  const consent = page.getByRole("checkbox", { name: /Autorizo el tratamiento/ }); await consent.uncheck();
  await page.getByRole("button", { name: "Enviar solicitud de jornada" }).click();
  await expect(consent).toHaveAttribute("aria-invalid", "true");
  await consent.check();
  await page.route("**/api/solicitudes", async (route) => {
    const payload = route.request().postDataJSON(); expect(payload.origen).toBe("jornada"); expect(payload.detalles).toMatchObject({ trabajadores: 25, comuna: "Santiago", direccion: "Dirección de prueba", comentarios: "Coordinar espacio disponible" });
    await route.fulfill({ status: 200, json: { ok: true } });
  });
  await page.getByRole("button", { name: "Enviar solicitud de jornada" }).click();
  await expect(page.getByRole("heading", { name: "Recibimos tu solicitud" })).toBeVisible();
});
test("las tres vistas tienen identidad, imágenes, accesibilidad y composición responsive", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  for (const route of ["optica", "convenios", "jornadas"]) {
    await page.goto(`/${route}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    for (const image of await page.locator("img").all()) await image.scrollIntoViewIfNeeded();
    for (const heading of await page.getByRole("heading", { level: 2 }).all()) await heading.scrollIntoViewIfNeeded();
    await expect.poll(() => page.locator("img").evaluateAll((images) => images.every((img) => img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0))).toBe(true);
    for (const reveal of await page.locator("[data-reveal]").all()) await expect(reveal).toHaveCSS("opacity", "1");
    expect((await new AxeBuilder({ page }).exclude("nextjs-portal").analyze()).violations).toEqual([]);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await page.screenshot({ path: testInfo.outputPath(`${route}-full.png`), fullPage: true, animations: "disabled" });
    await page.screenshot({ path: testInfo.outputPath(`${route}-viewport.png`), animations: "disabled" });
    for (const width of [320, 768, 1070, 1440]) { await page.setViewportSize({ width, height: 1470 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); if (width === 1070 && testInfo.project.name === "desktop") await page.screenshot({ path: testInfo.outputPath(`${route}-native.png`), animations: "disabled" }); }
    await page.setViewportSize(testInfo.project.name === "mobile" ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
  }
});
test("la navegación enlaza las cuatro vistas y marca la página activa", async ({ page }, testInfo) => {
  await page.goto("/");
  for (const item of [{ name: "Óptica", route: "optica" }, { name: "Convenios", route: "convenios" }, { name: "Jornadas", route: "jornadas" }]) {
    if (testInfo.project.name === "mobile") await page.getByRole("button", { name: "Abrir menú" }).click();
    const nav = page.getByRole("navigation", { name: testInfo.project.name === "mobile" ? "Navegación móvil" : "Navegación principal" });
    await nav.getByRole("link", { name: item.name, exact: true }).click(); await expect(page).toHaveURL(new RegExp(`/${item.route}$`));
    if (testInfo.project.name === "mobile") await page.getByRole("button", { name: "Abrir menú" }).click();
    await expect(nav.getByRole("link", { name: item.name, exact: true })).toHaveAttribute("aria-current", "page");
    if (testInfo.project.name === "mobile") await page.getByRole("button", { name: "Cerrar menú" }).click();
  }
});
test("el producto permanece accesible con movimiento reducido", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" }); await page.goto("/optica");
  const trigger = page.getByRole("button", { name: "Ver producto: Montura cat eye", exact: true }); await trigger.scrollIntoViewIfNeeded();
  expect(await trigger.evaluate((element) => getComputedStyle(element).transform)).toBe("none");
  await trigger.click(); await expect(page.getByRole("dialog", { name: "Montura cat eye" })).toBeVisible();
  expect((await new AxeBuilder({ page }).exclude("nextjs-portal").analyze()).violations).toEqual([]);
});
