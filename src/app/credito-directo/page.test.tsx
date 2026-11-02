import { beforeEach, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
  expect(screen.getByText("$55.000")).toBeVisible();
  expect(screen.getByText("Hasta el 35% de tu compra")).toBeVisible();
  expect(screen.getByText("2 cuotas")).toBeVisible();
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
