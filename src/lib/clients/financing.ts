/** Monetary values are whole Chilean pesos. The server supplies the customer's tier. */
export type FinancingTier = { maxPercent: number; maxAmount: number; maxInstallments: number };

function pesos(value: number, label: string, minimum = 0) {
  if (!Number.isSafeInteger(value) || value < minimum || value > 1_000_000_000) {
    throw new Error(`${label}: ingresa un monto entero válido en pesos.`);
  }
  return value;
}

export function calculateFinancing(input: {
  total: number; protectedCost: number; outstanding: number; tier: FinancingTier;
}) {
  const total = pesos(input.total, "Total", 1);
  const protectedCost = pesos(input.protectedCost, "Costo protegido");
  const outstanding = pesos(input.outstanding, "Capital pendiente");
  const { maxPercent, maxAmount, maxInstallments } = input.tier;
  pesos(maxAmount, "Tope del nivel", 1);
  if (!Number.isInteger(maxPercent) || maxPercent < 1 || maxPercent > 100 ||
      !Number.isInteger(maxInstallments) || maxInstallments < 1 || maxInstallments > 2) {
    throw new Error("Las condiciones del nivel no son válidas.");
  }
  const capacity = Math.max(0, maxAmount - outstanding);
  // Round down so financing never exceeds any limit or consumes the entire price.
  const maximumCredit = Math.max(0, Math.min(
    Math.floor(total * maxPercent / 100), capacity, total - protectedCost, total - 1,
  ));
  return { total, maximumCredit, minimumDeposit: total - maximumCredit, capacity, maxInstallments };
}

/** Anchor every due date to the original day, including after a short February. */
export function monthlyInstallments(credit: number, count: number, firstDueDate: string) {
  pesos(credit, "Crédito", 1);
  if (!Number.isInteger(count) || count < 1 || count > 2 || count > credit) {
    throw new Error("Cantidad de cuotas no válida.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(firstDueDate)) throw new Error("Fecha de pago no válida.");
  const first = new Date(`${firstDueDate}T12:00:00Z`);
  if (!Number.isFinite(first.getTime()) || first.toISOString().slice(0, 10) !== firstDueDate) {
    throw new Error("Fecha de pago no válida.");
  }
  const base = Math.floor(credit / count);
  return Array.from({ length: count }, (_, index) => {
    const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + index + 1, 0, 12));
    const due = new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), Math.min(first.getUTCDate(), last.getUTCDate()), 12));
    return { number: index + 1, dueDate: due.toISOString().slice(0, 10), amount: index === count - 1 ? credit - base * index : base };
  });
}
