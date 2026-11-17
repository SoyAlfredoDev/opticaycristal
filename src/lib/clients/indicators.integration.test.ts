// @vitest-environment node
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { indicatorPeriod, readAdvisorIndicators, readIndicators } from "./indicators";

vi.mock("./db", () => ({
  clientPool: () => db,
  clientTable: (table: string) => table,
}));

const db = new PGlite();
const today = "2026-11-17";

beforeAll(async () => {
  for (const migration of ["001-customers", "002-sales", "003-audit", "010-payment-commitments", "025-frame-advisor"]) {
    await db.exec(await readFile(`sql/clients/${migration}.sql`, "utf8"));
  }
  await db.exec(`
    INSERT INTO oc_client_user (id, name, email, "firstName", "lastName", "rutCipher", "rutHash", "whatsappCipher")
    VALUES ('qa', 'QA', 'qa@example.test', 'QA', 'QA', 'qa', 'qa', 'qa');
    INSERT INTO oc_client_products (id, name, protected_cost, updated_by) VALUES ('qa', 'Lentes QA', 10000, 'qa');
    INSERT INTO oc_client_sales (id, user_id, request_key, request_data, product_id, product_name,
      quantity, protected_cost, total, net, vat, deposit, credit, remaining, tier_code,
      max_percent, max_amount, installment_count, identity_checked, commitment_version, created_by, created_at, status)
    SELECT id, 'qa', id, '{}', 'qa', 'Lentes QA', 1, 10000, total, total-10000, 10000,
      total-credit, credit, remaining, 'start', 30, 40000, installments, true, 'qa', 'qa', created_at::timestamptz, status
    FROM (VALUES
      ('old', 100000, 30000, 25000, 2, '2026-09-02T04:00:00Z', 'active'),
      ('cash', 50000, 0, 0, 0, '2026-11-01T03:00:00Z', 'active'),
      ('boundary', 20000, 0, 0, 0, '2026-11-01T02:59:59Z', 'active'),
      ('new', 100000, 30000, 0, 1, '2026-11-03T15:00:00Z', 'active'),
      ('void', 90000, 0, 0, 0, '2026-11-04T15:00:00Z', 'cancelled')
    ) AS v(id,total,credit,remaining,installments,created_at,status);
    INSERT INTO oc_client_installments (id, sale_id, number, due_date, amount, paid)
    VALUES ('old-first', 'old', 1, '2026-10-03', 15000, 5000),
      ('old-second', 'old', 2, '2026-11-17', 15000, 0),
      ('new-first', 'new', 1, '2026-11-15', 30000, 30000);
    INSERT INTO oc_client_payments (id, sale_id, request_key, amount, paid_on, reference, created_by, interest_amount, reversed_at)
    VALUES ('old-paid', 'old', 'paid', 5000, '2026-11-01', 'QA', 'webpay-plus', 200, NULL),
      ('new-paid', 'new', 'new-paid', 30000, '2026-11-17', 'QA', 'qa', 0, NULL),
      ('old-reversed', 'old', 'reversed', 8000, '2026-11-06', 'QA', 'qa', 0, '2026-11-06T17:00:00Z');
    INSERT INTO oc_client_frame_advice (user_id, request_id, created_at, result, failed_at)
    VALUES ('qa', gen_random_uuid(), '2026-10-01T03:00:00Z', '{}', NULL),
      ('qa', gen_random_uuid(), '2026-10-15T14:00:00Z', '{}', NULL),
      ('qa', gen_random_uuid(), '2026-10-15T15:00:00Z', NULL, '2026-10-15T15:01:00Z'),
      ('qa', gen_random_uuid(), '2026-11-01T03:00:00Z', '{}', NULL);
  `);
}, 30_000);

afterAll(() => db.close());

it("consolida ventas vigentes, cobros efectivos y cartera al día de consulta", async () => {
  await expect(readIndicators("2026-11-01", today, today)).resolves.toEqual({
    totals: {
      sales_count: 2, sales_total: 150000, cash_count: 1, cash_total: 50000,
      credit_count: 1, credit_sales_total: 100000, financed: 30000, deposits: 70000,
      principal_collected: 35000, interest_collected: 200,
      outstanding: 25000, due_soon: 15000, overdue: 10000, at_risk: 25000, overdue_credits: 1,
    },
    tiers: [{ code: "start", name: "Start", sales: 1, financed: 30000 }],
  });
});

it("conserva la cartera completa al consultar un período sin movimiento", async () => {
  const { totals, tiers } = await readIndicators("2026-08-01", "2026-08-31", today);
  expect(totals).toMatchObject({ sales_count: 0, sales_total: 0, principal_collected: 0, outstanding: 25000, overdue: 10000 });
  expect(tiers).toEqual([]);
});

it("considera PAR30 solo después de 30 días y las cuotas de hoy como vigentes", async () => {
  const { totals } = await readIndicators("2026-09-01", "2026-10-31", "2026-11-02");
  expect(totals).toMatchObject({ overdue: 10000, at_risk: 0, due_soon: 0 });
});

it("calcula cobros en una base de desarrollo anterior a la migración de intereses", async () => {
  await db.exec("BEGIN");
  try {
    await db.exec("ALTER TABLE oc_client_payments DROP COLUMN interest_amount CASCADE");
    const { totals } = await readIndicators("2026-11-01", today, today);
    expect(totals).toMatchObject({ principal_collected: 35000, interest_collected: 0 });
  } finally {
    await db.exec("ROLLBACK");
  }
});

it("acepta fechas reales inclusivas y rechaza rangos invertidos, futuros o repetidos", () => {
  expect(indicatorPeriod({ desde: today, hasta: today }, today)).toEqual({ from: today, to: today, month: undefined, error: null });
  expect(indicatorPeriod({}, today)).toEqual({ from: "2026-10-01", to: "2026-10-31", month: "2026-10", error: null });
  for (const search of [{ desde: "2026-02-30" }, { desde: today, hasta: "2026-11-16" }, { hasta: "2026-11-18" }, { desde: [today] }]) {
    expect(indicatorPeriod(search, today).error).toBeTruthy();
  }
});


it("usa el último mes completo, maneja el cambio de año y valida la selección mensual", () => {
  expect(indicatorPeriod({}, "2027-01-05")).toEqual({ from: "2026-12-01", to: "2026-12-31", month: "2026-12", error: null });
  expect(indicatorPeriod({ mes: "2024-02" }, today).to).toBe("2024-02-29");
  expect(indicatorPeriod({ mes: "2026-11" }, today).to).toBe(today);
  for (const month of ["2026-00", "2026-12", ["2026-10"]]) {
    expect(indicatorPeriod({ mes: month }, today).error).toBeTruthy();
  }
});

it("cuenta clientes distintos y usos completados en el mes de Santiago", async () => {
  await expect(readAdvisorIndicators("2026-10-01", "2026-10-31")).resolves.toEqual({ customers: 1, sessions: 2 });
  await expect(readAdvisorIndicators("2026-11-01", today)).resolves.toEqual({ customers: 1, sessions: 1 });
  await expect(readAdvisorIndicators("2026-09-01", "2026-09-30")).resolves.toEqual({ customers: 0, sessions: 0 });
});
