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
      !Number.isInteger(maxInstallments) || maxInstallments < 1 || maxInstallments > 4) {
    throw new Error("Las condiciones del nivel no son válidas.");
  }
  const capacity = Math.max(0, maxAmount - outstanding);
  // Round down so financing never exceeds any limit or consumes the entire price.
  const maximumCredit = Math.max(0, Math.min(
    Math.floor(total * maxPercent / 100), capacity, total - protectedCost, total - 1,
  ));
  return { total, maximumCredit, minimumDeposit: total - maximumCredit, capacity, maxInstallments };
}

function calendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Fecha de pago no válida.");
  const date = new Date(`${value}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error("Fecha de pago no válida.");
  }
  return date;
}

function monthFrom(anchor: Date, months: number) {
  const last = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + months + 1, 0, 12));
  const due = new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), Math.min(anchor.getUTCDate(), last.getUTCDate()), 12));
  return due.toISOString().slice(0, 10);
}

/** One calendar month after the purchase day in Chile; the executive can edit it. */
export function suggestedFirstDueDate(purchasedAt = new Date()) {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(purchasedAt);
  return monthFrom(calendarDate(day), 1);
}

/** Anchor every due date to the original day, including after a short February. */
export function monthlyInstallments(credit: number, count: number, firstDueDate: string) {
  pesos(credit, "Crédito", 1);
  if (!Number.isInteger(count) || count < 1 || count > 4 || count > credit) {
    throw new Error("Cantidad de cuotas no válida.");
  }
  const first = calendarDate(firstDueDate);
  const base = Math.floor(credit / count);
  return Array.from({ length: count }, (_, index) => {
    return { number: index + 1, dueDate: monthFrom(first, index), amount: index === count - 1 ? credit - base * index : base };
  });
}
