import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CatalogExperience } from "./CatalogExperience";

beforeEach(() => { localStorage.clear(); Element.prototype.scrollIntoView = vi.fn(); });
afterEach(() => { vi.unstubAllGlobals(); });

async function ready() {
  const view = render(<CatalogExperience />);
  await waitFor(() => expect(screen.getByRole("button", { name: "Carro (0)" })).toBeEnabled());
  return view;
}

describe("Catálogo editorial: accesos y flujo de compra", () => {
  it("conecta el hero con categorías, conserva filtros combinados, búsqueda, orden y limpieza", async () => {
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "Explorar lentes ópticos" }));
    expect(screen.getByRole("button", { name: "Lentes ópticos" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("status")).toHaveTextContent("3 propuestas");
    expect(document.activeElement).toBe(document.getElementById("coleccion"));
    fireEvent.click(screen.getByLabelText("Metal", { exact: true }));
    fireEvent.click(screen.getByLabelText("Dorado", { exact: true }));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "redonda" } });
    expect(screen.getByRole("status")).toHaveTextContent("1 propuesta");
    expect(screen.getAllByRole("article")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Explorar lentes de sol" }));
    expect(screen.getByRole("heading", { name: "No encontramos coincidencias" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    expect(screen.getByRole("status")).toHaveTextContent("6 propuestas");
    fireEvent.change(screen.getByRole("combobox", { name: "Ordenar productos" }), { target: { value: "za" } });
    expect(within(screen.getAllByRole("article")[0]).getByRole("heading")).toHaveTextContent("Montura redonda");
    fireEvent.change(screen.getByRole("combobox", { name: "Ordenar productos" }), { target: { value: "az" } });
    expect(within(screen.getAllByRole("article")[0]).getByRole("heading")).toHaveTextContent("Estuche y accesorios");
    fireEvent.click(screen.getByRole("button", { name: "Explorar accesorios" }));
    expect(screen.getByRole("status")).toHaveTextContent("2 propuestas");
  });

  it("abre el detalle y conserva cantidades, eliminación y persistencia del carro", async () => {
    const view = await ready();
    fireEvent.click(screen.getByRole("button", { name: "Ver producto: Montura redonda" }));
    expect(screen.getByRole("dialog", { name: "Montura redonda" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar producto" }));
    fireEvent.click(screen.getByRole("button", { name: "Agregar Montura redonda al carro" }));
    fireEvent.click(screen.getByRole("button", { name: "Carro (1)" }));
    fireEvent.click(screen.getByRole("button", { name: "Agregar una unidad de Montura redonda" }));
    expect(screen.getByRole("button", { name: "Carro (2)" })).toBeInTheDocument();
    view.unmount();
    render(<CatalogExperience />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Carro (2)" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Carro (2)" }));
    fireEvent.click(screen.getByRole("button", { name: "Quitar una unidad de Montura redonda" }));
    expect(screen.getByRole("button", { name: "Carro (1)" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar Montura redonda" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Tu carro está vacío");
    await waitFor(() => expect(JSON.parse(localStorage.getItem("oc_cart_v1")!)).toEqual([]));
  });

  it("envía una solicitud simulada, conserva el carro ante un error y lo limpia solo al confirmar", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: false, json: async () => ({ error: "No pudimos procesar la solicitud" }) }).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "Agregar Montura cat eye al carro" }));
    fireEvent.click(screen.getByRole("button", { name: "Carro (1)" }));
    const fields = { "Nombre completo": "Prueba Local", "Correo electrónico": "prueba@example.com", "Teléfono": "+56912345678", "Comuna": "Santiago", "Dirección para consultar despacho": "Calle de prueba 123" };
    for (const [label, value] of Object.entries(fields)) fireEvent.change(screen.getByLabelText(label), { target: { value } });
    fireEvent.click(screen.getByRole("checkbox", { name: /Autorizo el uso/ }));
    const form = screen.getByRole("button", { name: "Enviar solicitud de compra" }).closest("form")!;
    fireEvent.submit(form);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("No pudimos procesar"));
    expect(screen.getByRole("button", { name: "Carro (1)" })).toBeInTheDocument();
    fireEvent.submit(form);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Solicitud recibida" })).toBeInTheDocument());
    expect(fetchMock).toHaveBeenLastCalledWith("/api/pedidos", expect.objectContaining({ method: "POST" }));
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({ items: [{ productId: "cat-eye", quantity: 1 }], customer: { consent: true } });
    await waitFor(() => expect(JSON.parse(localStorage.getItem("oc_cart_v1")!)).toEqual([]));
  });
});
