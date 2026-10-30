import { describe, expect, it } from "vitest";
import { calculateFinancing, monthlyInstallments } from "./financing";

const tier = { maxPercent: 70, maxAmount: 150000, maxInstallments: 2 };
describe("Límites de financiamiento", () => {
  it("protege el costo incluso cuando el nivel permitiría prestar más", () => {
    expect(calculateFinancing({ total: 75000, protectedCost: 35000, outstanding: 0, tier }))
      .toMatchObject({ maximumCredit: 40000, minimumDeposit: 35000 });
  });
  it("respeta el porcentaje, el tope y el capital ya pendiente", () => {
    const quote = (total: number, outstanding = 0) => calculateFinancing({ total, protectedCost: 10000, outstanding, tier });
    expect(quote(50000).maximumCredit).toBe(35000);
    expect(quote(400000).maximumCredit).toBe(150000);
    expect(quote(400000, 140000).maximumCredit).toBe(10000);
    expect(quote(50000, 160000).maximumCredit).toBe(0);
  });
  it("no presta si el costo supera el precio y siempre exige pie", () => {
    expect(calculateFinancing({ total: 10000, protectedCost: 11000, outstanding: 0, tier }).maximumCredit).toBe(0);
    expect(calculateFinancing({ total: 10000, protectedCost: 0, outstanding: 0, tier: { ...tier, maxPercent: 100 } }).minimumDeposit).toBe(1);
  });
  it("rechaza costos ausentes, negativos y cantidades fraccionarias", () => {
    for (const protectedCost of [undefined, NaN, -1, 10.5]) {
      expect(() => calculateFinancing({ total: 10000, protectedCost: protectedCost as number, outstanding: 0, tier })).toThrow();
    }
  });
});

describe("Cuotas mensuales", () => {
  it("reparte pesos completos y ajusta la última cuota", () => {
    expect(monthlyInstallments(40001, 2, "2026-11-15")).toEqual([
      { number: 1, dueDate: "2026-11-15", amount: 20000 },
      { number: 2, dueDate: "2026-12-15", amount: 20001 },
    ]);
  });
  it("respeta fin de mes, años bisiestos y cambio de año", () => {
    expect(monthlyInstallments(100, 2, "2027-01-31")[1].dueDate).toBe("2027-02-28");
    expect(monthlyInstallments(100, 2, "2028-01-31")[1].dueDate).toBe("2028-02-29");
    expect(monthlyInstallments(100, 2, "2026-12-31")[1].dueDate).toBe("2027-01-31");
  });
  it("rechaza fechas inexistentes y cuotas sin monto", () => {
    expect(() => monthlyInstallments(100, 2, "2026-02-30")).toThrow();
    expect(() => monthlyInstallments(1, 2, "2026-11-01")).toThrow();
  });
});
