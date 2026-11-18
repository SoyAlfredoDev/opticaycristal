import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { CategorySettings } from "@/lib/clients/category-types";

const refresh = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
import { SaleCustomerLevel } from "./SaleCustomerLevel";

export const saleTiers: CategorySettings["tiers"] = [
  { code: "start", name: "Start", maxAmount: 40000, maxPercent: 30, maxInstallments: 2 },
  { code: "star_plus", name: "Star Plus", maxAmount: 50000, maxPercent: 30, maxInstallments: 3 },
  { code: "vip", name: "VIP", maxAmount: 60000, maxPercent: 40, maxInstallments: 2 },
  { code: "premium", name: "Premium", maxAmount: 80000, maxPercent: 60, maxInstallments: 3 },
  { code: "elite", name: "Elite", maxAmount: 150000, maxPercent: 70, maxInstallments: 4 },
];
const settings: CategorySettings = { currentCategory: "start", tiers: saleTiers, history: [] };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value() { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value() { this.removeAttribute("open"); } });
});
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe("Niveles desde el resumen de venta", () => {
  it("consulta todos los niveles y guarda con el nivel actual y una clave de reintento", async () => {
    const updated = { ...settings, currentCategory: "star_plus" };
    const fetcher = vi.fn().mockResolvedValueOnce(reply({ settings, canEdit: true }))
      .mockResolvedValueOnce(reply({ settings: updated, changed: true }));
    vi.stubGlobal("fetch", fetcher);
    const onUpdated = vi.fn();
    render(<SaleCustomerLevel customerId="qa" currentTier="start" tiers={saleTiers} canEdit disabled={false} onUpdated={onUpdated} />);
    fireEvent.click(screen.getByRole("button", { name: "Subir de nivel" }));
    await screen.findByRole("radio", { name: /Star Plus/ });
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    expect(screen.getByRole("radio", { name: /^Start / })).toBeChecked();
    expect(screen.getByRole("button", { name: "Guardar nivel" })).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: /Star Plus/ }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar nivel" }));
    await waitFor(() => expect(onUpdated).toHaveBeenCalledWith(updated));
    expect(JSON.parse(fetcher.mock.calls[1][1].body)).toMatchObject({ category: "star_plus", expectedCategory: "start", requestKey: expect.any(String) });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
    expect(document.body.style.overflow).toBe("");
  });

  it("permite consultar los cinco niveles sin ofrecer edición a un vendedor", async () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    render(<SaleCustomerLevel customerId="qa" currentTier="vip" tiers={saleTiers} canEdit={false} disabled={false} onUpdated={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Ver niveles" }));
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    for (const radio of screen.getAllByRole("radio")) expect(radio).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Guardar nivel" })).not.toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar niveles" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("respeta el permiso devuelto por el servidor y permite reintentar la consulta", async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error("Sin conexión"))
      .mockResolvedValueOnce(reply({ settings, canEdit: false }));
    vi.stubGlobal("fetch", fetcher);
    render(<SaleCustomerLevel customerId="qa" currentTier="start" tiers={saleTiers} canEdit disabled={false} onUpdated={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Subir de nivel" }));
    await screen.findByText("Sin conexión");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await screen.findByRole("radio", { name: /Elite/ });
    expect(screen.queryByRole("button", { name: "Guardar nivel" })).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Elite/ })).toBeDisabled();
  });

  it("actualiza el resumen si otro administrador cambió el nivel y exige elegir otra vez", async () => {
    const latest = { ...settings, currentCategory: "premium" };
    const fetcher = vi.fn().mockResolvedValueOnce(reply({ settings, canEdit: true }))
      .mockResolvedValueOnce(reply({ error: "El nivel cambió mientras editabas." }, 409))
      .mockResolvedValueOnce(reply({ settings: latest }));
    vi.stubGlobal("fetch", fetcher);
    const onUpdated = vi.fn();
    render(<SaleCustomerLevel customerId="qa" currentTier="start" tiers={saleTiers} canEdit disabled={false} onUpdated={onUpdated} />);
    fireEvent.click(screen.getByRole("button", { name: "Subir de nivel" }));
    fireEvent.click(await screen.findByRole("radio", { name: /Star Plus/ }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar nivel" }));
    await screen.findByText("El nivel cambió mientras editabas.");
    expect(screen.getByRole("radio", { name: /Premium/ })).toBeChecked();
    expect(screen.getByRole("button", { name: "Guardar nivel" })).toBeDisabled();
    expect(onUpdated).toHaveBeenCalledWith(latest);
  });
});
