import { expect, test, type Page } from "@playwright/test";

async function fillCartContact(page: Page) {
  await page.getByLabel("Nombre completo", { exact: true }).fill("Ana Pérez");
  await page.getByLabel("Correo electrónico", { exact: true }).fill("ana@example.cl");
  await page.getByLabel("Teléfono", { exact: true }).fill("+56 9 1234 5678");
  await page.getByLabel("Comuna", { exact: true }).fill("Santiago");
  await page.getByLabel("Dirección para consultar despacho", { exact: true }).fill("Calle 123, Santiago");
  await page.getByRole("checkbox", { name: /Autorizo el uso de estos datos/ }).check();
}

test("el pie de página abre el acceso para ejecutivos", async ({ page }) => {
  await page.goto("/");
  await page.locator("footer").getByRole("link", { name: "Ingreso ejecutivos", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByRole("heading", { name: "Óptica y Cristal" })).toBeVisible();
});

test("agrega productos, cambia cantidades y registra la solicitud de compra", async ({ page }) => {
  let received: Record<string, unknown> | null = null;
  await page.route("**/api/pedidos", async (route) => {
    received = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({ status: 201, json: { ok: true, id: "pedido-prueba" } });
  });
  await page.goto("/optica");
  await page.getByRole("button", { name: "Agregar Montura cat eye al carro" }).click();
  await page.getByRole("button", { name: "Agregar Montura cat eye al carro" }).click();
  await page.getByRole("button", { name: "Carro (2)" }).click();
  const dialog = page.getByRole("dialog", { name: "Tu carro" });
  await expect(dialog.getByText("Montura cat eye", { exact: true })).toBeVisible();
  await fillCartContact(page);
  await dialog.getByRole("button", { name: "Enviar solicitud de compra" }).click();
  await expect(dialog.getByRole("heading", { name: "Solicitud recibida" })).toBeVisible();
  expect(received).toMatchObject({ items: [{ productId: "cat-eye", quantity: 2 }], customer: { email: "ana@example.cl", comuna: "Santiago", consent: true } });
});
