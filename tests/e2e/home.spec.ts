import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => { await page.goto("/"); });

test("Inicio tiene contenido, identidad y enlaces reales sin desbordamiento", async ({ page }, testInfo) => {
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tu mirada,nuestra prioridad.");
  await expect(page).toHaveTitle("Óptica & Cristal | Tu mirada, nuestra prioridad");
  await expect(page.getByText("Para empresas con más de 10 trabajadores.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Coordinar una jornada" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  for (const image of await page.locator("img").all()) await image.scrollIntoViewIfNeeded();
  await expect.poll(() => page.locator("img").evaluateAll((images) => images.flatMap((image) => image instanceof HTMLImageElement && (!image.complete || image.naturalWidth === 0) ? [image.src] : []))).toEqual([]);
  await expect(page.locator('[data-reveal="pending"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Ampliar imagen de lentes ópticos" }).scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.getByRole("heading", { level: 1 })).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath("home-full.png"), fullPage: true, animations: "disabled" });
  await page.screenshot({ path: testInfo.outputPath("home-viewport.png"), animations: "disabled" });
});

test("la galería navega con botones y teclado, atrapa y restaura el foco", async ({ page }) => {
  const trigger = page.getByRole("button", { name: "Ampliar imagen de lentes ópticos" });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Cerrar galería" })).toBeFocused();
  await dialog.getByRole("button", { name: "Imagen siguiente" }).click();
  await expect(dialog.getByRole("heading")).toHaveText("Lentes de sol");
  await page.keyboard.press("ArrowLeft");
  await expect(dialog.getByRole("heading")).toHaveText("Lentes ópticos");
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
});

test("las secciones se alcanzan desde navegación y menú móvil", async ({ page }, testInfo) => {
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Abrir menú" }).click();
    await page.getByRole("navigation", { name: "Navegación móvil" }).getByRole("link", { name: "Óptica" }).click();
    await expect(page.getByRole("button", { name: "Abrir menú" })).toHaveAttribute("aria-expanded", "false");
  } else {
    await page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link", { name: "Óptica" }).click();
  }
  await expect(page).toHaveURL(/\/optica$/);
  await expect(page.getByRole("heading", { name: "Encuentra tus nuevos lentes" })).toBeInViewport();
});

test("no hay infracciones automáticas de accesibilidad en Inicio y galería", async ({ page }) => {
  for (const heading of await page.getByRole("heading", { level: 2 }).all()) await heading.scrollIntoViewIfNeeded();
  await expect(page.locator('[data-reveal="pending"]')).toHaveCount(0);
  for (const section of await page.locator("[data-reveal]").all()) await expect(section).toHaveCSS("opacity", "1");
  await page.getByRole("button", { name: "Ampliar imagen de lentes ópticos" }).scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: "Ampliar imagen de lentes ópticos" })).toBeVisible();
  expect((await new AxeBuilder({ page }).exclude("nextjs-portal").analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: "Ampliar imagen de lentes ópticos" }).click();
  await expect(page.getByRole("dialog")).toHaveCSS("opacity", "1");
  expect((await new AxeBuilder({ page }).exclude("nextjs-portal").analyze()).violations).toEqual([]);
});

test("movimiento reducido mantiene contenido y controles utilizables", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  const trigger = page.getByRole("button", { name: "Ampliar imagen de accesorios" });
  await trigger.scrollIntoViewIfNeeded();
  await expect(trigger).toBeVisible();
  expect(await trigger.evaluate((element) => getComputedStyle(element).transform)).toBe("none");
  await trigger.click();
  await expect(page.getByRole("dialog", { name: "Accesorios" })).toBeVisible();
});

test("el enlace de jornadas conserva la ruta existente", async ({ page }) => {
  await page.getByRole("button", { name: "Coordinar una jornada" }).click();
  await expect(page.getByRole("dialog", { name: "Solicitar jornada" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.goto("/#contratar");
  await expect(page).toHaveURL(/\/#contratar$/);
  await expect(page.getByRole("dialog", { name: "Solicitar jornada" })).toBeVisible();
});

test("la composición no desborda en móvil pequeño, tablet y escritorio", async ({ page }) => {
  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});
