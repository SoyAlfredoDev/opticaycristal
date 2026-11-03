import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SalesHistory } from "./SalesHistory";
import type { CreditSummary } from "./CreditInvitation";
import type { CustomerSale } from "@/lib/clients/sales-types";
const customer: CreditSummary = {
  tier: { code: "start", name: "Start", maxAmount: 40000, maxPercent: 30, maxInstallments: 1 },
  credit: { capacity: 40000, available: 40000, enabled: true, principalOutstanding: 0, needsIdentity: true },
};
const paid: CustomerSale = { id: "qa", productName: "Lentes de prueba", quantity: 1, total: 45000, net: 37815, vat: 7185, deposit: 31500, credit: 13500, remaining: 0, tierCode: "start", createdAt: "2026-10-29T12:00:00Z", status: "active", signedAt: null, commitmentVersion: "v1", installments: [{ id: "i", number: 1, amount: 13500, paid: 13500, dueDate: "2030-01-01" }], payments: [] };
describe("Cupo en Cuotas y Compras", () => {
  it("invita al cliente sin deuda con su cupo real", () => {
    render(<SalesHistory sales={[]} installmentsOnly customer={customer} />);
    expect(screen.getByRole("heading", { name: "¡Estás al día!" })).toBeVisible();
    expect(screen.getByText("$40.000",{selector:"div"})).toBeVisible();
    expect(screen.getByRole("link", { name: "Visítanos en la óptica" })).toHaveAttribute("href", "/credito-directo#visita");
  });
  it("promueve la primera compra y distingue cupo asignado de crédito habilitado", () => {
    render(<SalesHistory sales={[]} customer={{ ...customer, credit: { ...customer.credit, available: 0, enabled: false } }} />);
    expect(screen.getByText("$40.000",{selector:"div"})).toBeVisible();
    expect(screen.getByText("Tu cupo está asignado. Verifica tu correo para usarlo.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Verificar mi correo" })).toHaveAttribute("href", "/mi-cuenta/perfil");
    expect(screen.queryByText("Disfruta tu crédito en la óptica.")).not.toBeInTheDocument();
  });
  it("muestra el estado al día sin borrar la compra y cuota ya pagadas", () => {
    render(<SalesHistory sales={[paid]} installmentsOnly customer={customer} />);
    expect(screen.getByRole("heading", { name: "¡Estás al día!" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Lentes de prueba" })).toBeVisible();
    expect(screen.getByText("Pagada", { selector: "small" })).toBeVisible();
  });
  it("no afirma que está al día si hay capital o cuotas pendientes", () => {
    render(<SalesHistory sales={[{ ...paid, remaining: 13500, installments: [{ ...paid.installments[0], paid: 0 }] }]} installmentsOnly customer={{ ...customer, credit: { ...customer.credit, principalOutstanding: 13500, capacity: 26500 } }} />);
    expect(screen.queryByText("¡Estás al día!")).not.toBeInTheDocument();
    expect(screen.getByText("Próxima cuota")).toBeVisible();
  });
  it("mantiene administración sin mensajes publicitarios", () => {
    render(<SalesHistory sales={[]} admin customer={customer} />);
    expect(screen.getByText("Aún no hay compras.")).toBeVisible();
    expect(screen.queryByText("Cupo disponible")).not.toBeInTheDocument();
  });
});
