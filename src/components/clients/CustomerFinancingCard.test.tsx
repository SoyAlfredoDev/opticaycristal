import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { CustomerOverview } from "@/lib/clients/types";
import { CategoryModalProvider } from "./CategoryModal";
import { CustomerFinancingCard } from "./CustomerFinancingCard";

vi.mock("next/navigation", () => ({ usePathname: () => "/mi-cuenta", useSearchParams: () => new URLSearchParams(), useRouter: () => ({ replace: vi.fn() }) }));
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value() { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value() { this.removeAttribute("open"); } });
});
const customer: Pick<CustomerOverview, "tier" | "credit" | "emailVerified"> = {
  emailVerified: true,
  tier: { code: "start", name: "Start", maxAmount: 40000, maxPercent: 30, maxInstallments: 2 },
  credit: { capacity: 40000, available: 40000, enabled: true, principalOutstanding: 0, needsIdentity: false },
};
describe("Tarjeta de financiamiento del cliente", () => {
  it("distingue cupo de porcentaje y calcula crédito, pie y cuotas del mismo ejemplo", () => {
    render(<CustomerFinancingCard customer={customer} />);
    expect(screen.getByText("$40.000")).toBeVisible();
    expect(screen.getByText("30%", { selector: "dd" })).toBeVisible();
    const example = screen.getByRole("region", { name: "Así se paga una compra" });
    expect(example).toHaveTextContent("Ejemplo: lentes de $100.000");
    expect(within(example).getByText("$30.000")).toBeVisible();
    expect(within(example).getByText("$70.000")).toBeVisible();
    expect(within(example).getByText(/2 cuotas mensuales de/)).toHaveTextContent("2 cuotas mensuales de $15.000");
    expect(screen.getAllByRole("button", { name: "Simular mi compra" })).toHaveLength(1);
  });
  it("respeta el tope monetario y muestra el ajuste de la última cuota sin inventar pesos", () => {
    render(<CustomerFinancingCard customer={{ ...customer, tier: { ...customer.tier, maxAmount: 8000, maxPercent: 70, maxInstallments: 3 }, credit: { ...customer.credit, capacity: 8000, available: 8000 } }} />);
    const example = screen.getByRole("region", { name: "Así se paga una compra" });
    expect(within(example).getByText("$8.000")).toBeVisible();
    expect(within(example).getByText("$92.000")).toBeVisible();
    expect(within(example).getByText(/2 cuotas mensuales de/)).toHaveTextContent("2 cuotas mensuales de $2.666 y una última de $2.668");
  });
  it("mantiene el cupo por saldo sin ofrecer cuotas de un nuevo crédito cuando existe deuda", () => {
    render(<CustomerFinancingCard customer={{ ...customer, credit: { ...customer.credit, capacity: 30000, available: 0, enabled: false, principalOutstanding: 10000 } }} />);
    expect(screen.getByText("$30.000")).toBeVisible();
    expect(screen.getByText("Crédito activo")).toBeVisible();
    expect(screen.getByText("Al pagar tu crédito actual podrás financiar otra compra.")).toBeVisible();
    expect(screen.queryByRole("region", { name: "Así se paga una compra" })).not.toBeInTheDocument();
  });
  it("distingue el cupo asignado del financiamiento pendiente de verificación", () => {
    render(<CustomerFinancingCard customer={{ ...customer, emailVerified: false, credit: { ...customer.credit, available: 0, enabled: false } }} />);
    expect(screen.getByText("$40.000")).toBeVisible();
    expect(screen.getByText("Verificaciones pendientes")).toBeVisible();
    expect(screen.queryByRole("region", { name: "Así se paga una compra" })).not.toBeInTheDocument();
  });
  it("permite consultar los niveles desde la tarjeta sin cambiar el nivel actual", () => {
    render(<CategoryModalProvider tiers={[customer.tier]} currentCategory="start"><CustomerFinancingCard customer={customer} /></CategoryModalProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Ver niveles" }));
    expect(screen.getByRole("dialog", { name: "Encuentra tu siguiente nivel" })).toBeVisible();
  });
});
