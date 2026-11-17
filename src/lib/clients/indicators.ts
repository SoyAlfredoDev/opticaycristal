import "server-only";
import { clientPool, clientTable } from "./db";

type Search = Record<string, string | string[] | undefined>;

function isDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function indicatorPeriod(search: Search, today: string) {
  const monthStart = today.slice(0, 8) + "01";
  const from = search.desde ?? monthStart;
  const to = search.hasta ?? today;
  if (!isDate(from) || !isDate(to) || from > to || to > today) {
    return { from: monthStart, to: today, error: "Elige un período válido que termine a más tardar hoy." };
  }
  return { from, to, error: null };
}

type Totals = {
  sales_count: number;
  sales_total: number;
  cash_count: number;
  cash_total: number;
  credit_count: number;
  credit_sales_total: number;
  financed: number;
  deposits: number;
  principal_collected: number;
  interest_collected: number;
  outstanding: number;
  due_soon: number;
  overdue: number;
  at_risk: number;
  overdue_credits: number;
};

type Tier = { code: string; name: string; sales: number; financed: number };
type IndicatorRow = { totals: Totals; tiers: Tier[] };

export async function readIndicators(from: string, to: string, today: string) {
  const result = await clientPool().query<IndicatorRow>(`
    WITH period_sales AS (
      SELECT total, credit, deposit, tier_code
      FROM ${clientTable("oc_client_sales")}
      WHERE status = 'active'
        AND created_at >= ($1::date::timestamp AT TIME ZONE 'America/Santiago')
        AND created_at < (($2::date + 1)::timestamp AT TIME ZONE 'America/Santiago')
    ), sales_totals AS (
      SELECT count(*) AS sales_count, coalesce(sum(total), 0) AS sales_total,
        count(*) FILTER (WHERE credit = 0) AS cash_count,
        coalesce(sum(total) FILTER (WHERE credit = 0), 0) AS cash_total,
        count(*) FILTER (WHERE credit > 0) AS credit_count,
        coalesce(sum(total) FILTER (WHERE credit > 0), 0) AS credit_sales_total,
        coalesce(sum(credit), 0) AS financed,
        coalesce(sum(deposit) FILTER (WHERE credit > 0), 0) AS deposits
      FROM period_sales
    ), collected AS (
      SELECT coalesce(sum(p.amount), 0) AS principal_collected,
        coalesce(sum((to_jsonb(p)->>'interest_amount')::integer), 0) AS interest_collected
      FROM ${clientTable("oc_client_payments")} p
      JOIN ${clientTable("oc_client_sales")} s ON s.id = p.sale_id
      WHERE s.status = 'active' AND p.reversed_at IS NULL
        AND p.paid_on BETWEEN $1::date AND $2::date
    ), portfolio AS (
      SELECT s.remaining,
        sum(i.amount - i.paid) FILTER (WHERE i.due_date < $3::date) AS overdue,
        sum(i.amount - i.paid) FILTER (WHERE i.due_date BETWEEN $3::date AND $3::date + 7) AS due_soon,
        bool_or(i.amount > i.paid AND i.due_date < $3::date - 30) AS at_risk
      FROM ${clientTable("oc_client_sales")} s
      LEFT JOIN ${clientTable("oc_client_installments")} i ON i.sale_id = s.id
      WHERE s.status = 'active' AND s.remaining > 0
      GROUP BY s.id, s.remaining
    ), portfolio_totals AS (
      SELECT coalesce(sum(remaining), 0) AS outstanding,
        coalesce(sum(due_soon), 0) AS due_soon,
        coalesce(sum(overdue), 0) AS overdue,
        coalesce(sum(remaining) FILTER (WHERE at_risk), 0) AS at_risk,
        count(*) FILTER (WHERE overdue > 0) AS overdue_credits
      FROM portfolio
    ), credit_tiers AS (
      SELECT s.tier_code AS code, coalesce(t.name, s.tier_code) AS name,
        count(*) AS sales, sum(s.credit) AS financed, t.position
      FROM period_sales s
      LEFT JOIN ${clientTable("oc_client_tiers")} t ON t.code = s.tier_code
      WHERE s.credit > 0
      GROUP BY s.tier_code, t.name, t.position
    )
    SELECT to_jsonb(sales_totals) || to_jsonb(collected) || to_jsonb(portfolio_totals) AS totals,
      (SELECT coalesce(jsonb_agg(to_jsonb(credit_tiers) - 'position' ORDER BY position, code), '[]')
        FROM credit_tiers) AS tiers
    FROM sales_totals CROSS JOIN collected CROSS JOIN portfolio_totals
  `, [from, to, today]);
  return result.rows[0];
}
