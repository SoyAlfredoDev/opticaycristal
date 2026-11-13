import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
const m = vi.hoisted(() => ({ tiers: vi.fn(), connection: vi.fn() }));
vi.mock("@/lib/clients/store", () => ({ getCustomerTiers: m.tiers }));
vi.mock("next/server", () => ({ connection: m.connection }));
vi.mock("@/components/home/editorial-font", () => ({ editorialFont: { variable: "editorial" } }));
vi.mock("@/components/site/SiteShell", () => ({ SiteShell: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("@/components/site/VisitSection", () => ({ VisitSection: () => null }));
import Page from "./page";
beforeEach(() => vi.clearAllMocks());
it("shows the current Start benefits from the same database used by administration", async () => {
  m.tiers.mockResolvedValue([{ code: "start", name: "Start", maxAmount: 55000, maxPercent: 35, maxInstallments: 2 }]);
  render(await Page());
  expect(m.connection).toHaveBeenCalledOnce();
  expect(within(screen.getByRole("complementary",{name:"Tu punto de partida Start"})).getByText("$55.000")).toBeVisible();
  expect(screen.getByText("Hasta el 35% del precio")).toBeVisible();
  expect(within(screen.getByRole("complementary",{name:"Tu punto de partida Start"})).getByText("2 cuotas")).toBeVisible();
  expect(screen.queryByText("$40.000")).not.toBeInTheDocument();
});
it("does not advertise old default amounts when current benefits are unavailable", async () => {
  m.tiers.mockRejectedValue(new Error("Unavailable"));
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    render(await Page());
    expect(screen.getByText(/Consulta los beneficios vigentes/)).toBeVisible();
    expect(screen.queryByText("$40.000")).not.toBeInTheDocument();
  } finally { log.mockRestore(); }
});

it("calculates the deposit and each monthly payment with the selected tier's cap", async () => {
  m.tiers.mockResolvedValue([
    { code: "start", name: "Start", maxAmount: 40000, maxPercent: 30, maxInstallments: 1 },
    { code: "vip", name: "VIP", maxAmount: 60000, maxPercent: 40, maxInstallments: 2 },
  ]);
  render(await Page());
  const calculator = within(screen.getByRole("region", { name: "Simula tu crédito directo" }));
  fireEvent.change(calculator.getByLabelText("Precio de los lentes (CLP)"), { target: { value: "200.000" } });
  fireEvent.change(calculator.getByLabelText("Categoría de crédito"), { target: { value: "vip" } });
  fireEvent.change(calculator.getByLabelText("Cuotas mensuales"), { target: { value: "2" } });
  fireEvent.click(calculator.getByRole("button", { name: "Calcular mi compra" }));
  expect(calculator.getByText("$140.000")).toBeVisible();
  expect(calculator.getAllByText("$30.000")).toHaveLength(2);
  expect(calculator.getByRole("link", { name: "Crear mi cuenta" })).toHaveAttribute("href", "/mi-cuenta/registro");
  expect(calculator.getByRole("link", { name: "Iniciar sesión" })).toHaveAttribute("href", "/mi-cuenta/ingresar");
});
