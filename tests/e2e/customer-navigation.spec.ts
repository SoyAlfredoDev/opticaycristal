import { test, expect } from "@playwright/test";

// Use an operator-provided local session; never put credentials or session files in Git.
const sessionFile = process.env.CUSTOMER_E2E_STORAGE_STATE;
test.use({ storageState: sessionFile });
test.skip(!sessionFile, "Requiere CUSTOMER_E2E_STORAGE_STATE con una sesión de cliente local.");

test("cada enlace cambia la URL y el contenido; soporta historial y recarga", async ({ page }, testInfo) => {
  await page.goto("/mi-cuenta");
  await expect(page.getByRole("heading", { name: /^Hola,/ })).toBeVisible();
  const nav = page.getByRole("navigation", { name: testInfo.project.name === "mobile" ? "Navegación móvil" : "Mi espacio", exact: true });
  const screens = [
    { name: "Cuotas", path: "/mi-cuenta/cuotas", title: "Mis cuotas" },
    { name: "Compras", path: "/mi-cuenta/compras", title: "Mis compras" },
    { name: "La óptica", path: "/mi-cuenta/la-optica", title: "La óptica" },
    { name: "Perfil", path: "/mi-cuenta/perfil", title: "Mi perfil" },
  ];
  for (const screen of screens) {
    await nav.getByRole("link", { name: screen.name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${screen.path}$`));
    await expect(page.getByRole("heading", { name: screen.title, exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: screen.name, exact: true })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { name: /^Hola,/ })).toHaveCount(0);
  }
  await page.goBack();
  await expect(page.getByRole("heading", { name: "La óptica", exact: true })).toBeVisible();
  await page.goForward();
  await expect(page.getByRole("heading", { name: "Mi perfil", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Mi perfil", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Mis tickets de ayuda" }).click();
  await expect(page).toHaveURL(/\/mi-cuenta\/soporte$/);
  await expect(page.getByRole("heading", { name: "Soporte", exact: true })).toBeVisible();
  await nav.getByRole("link", { name: "Inicio", exact: true }).click();
  await expect(page.getByRole("heading", { name: /^Hola,/ })).toBeVisible();
});
