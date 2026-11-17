import Link from "next/link";
import { Banknote, ChartNoAxesCombined, CircleAlert, CreditCard, ShoppingBag, Sparkles, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import { customerAdminSession } from "@/lib/clients/admin";
import { indicatorPeriod, readAdvisorIndicators, readIndicators } from "@/lib/clients/indicators";
import { todayChile } from "@/lib/clients/sales";
import { clp } from "@/lib/clients/types";
import styles from "./Indicators.module.css";

export const dynamic = "force-dynamic";

const number = new Intl.NumberFormat("es-CL");
const percent = new Intl.NumberFormat("es-CL", { style: "percent", maximumFractionDigits: 1 });
const dateFormat = new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeZone: "UTC" });
const formatDate = (value: string) => dateFormat.format(new Date(value));

function Metric({ title, value, icon, children, tone }: {
  title: string;
  value: string;
  icon: ReactNode;
  children: ReactNode;
  tone?: "warning" | "primary";
}) {
  return <article className={styles.metric} data-tone={tone}>
    <div className={styles.metricHead}><h3>{title}</h3><span aria-hidden="true">{icon}</span></div>
    <strong>{value}</strong>
    {children}
  </article>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

export default async function IndicatorsPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!await customerAdminSession()) return <AdminAccessDenied />;
  const today = todayChile();
  const period = indicatorPeriod(await searchParams, today);
  const [{ totals, tiers }, advisor] = await Promise.all([
    readIndicators(period.from, period.to, today),
    readAdvisorIndicators(period.from, period.to),
  ]);
  const salesCount = totals.sales_count;
  const receipts = totals.cash_total + totals.deposits + totals.principal_collected + totals.interest_collected;
  const creditShare = salesCount ? percent.format(totals.credit_count / salesCount) : "—";
  const riskShare = totals.outstanding ? percent.format(totals.at_risk / totals.outstanding) : "—";

  return <main className={styles.page} id="contenido-principal">
    <header className={styles.intro}><h1>Indicadores</h1><p>Ventas, cobros, Crédito Directo y uso del Asesor Inteligente.</p></header>

    <form className={styles.filters} action="/admin/indicadores" method="get" aria-label="Filtrar por mes">
      <label>Mes<input type="month" name="mes" defaultValue={period.month} max={today.slice(0, 7)} required key={period.month} /></label>
      <button type="submit">Aplicar</button>
      <Link href="/admin/indicadores">Último mes completo</Link>
    </form>
    {period.error && <p role="alert" className={styles.notice}>{period.error}</p>}

    <section aria-labelledby="periodo">
      <div className={styles.sectionHead}><h2 id="periodo">Resultados del período</h2><p>{formatDate(period.from)} – {formatDate(period.to)}</p></div>
      <div className={styles.grid}>
        <Metric title="Ventas y ticket promedio" value={clp(totals.sales_total)} icon={<ShoppingBag size={20} />} tone="primary">
          <dl>
            <Detail label="Ventas registradas" value={number.format(salesCount)} />
            <Detail label="Ticket promedio" value={salesCount ? clp(Math.round(totals.sales_total / salesCount)) : "—"} />
            <Detail label={`Al contado · ${number.format(totals.cash_count)}`} value={clp(totals.cash_total)} />
            <Detail label={`A crédito · ${number.format(totals.credit_count)}`} value={clp(totals.credit_sales_total)} />
          </dl>
        </Metric>
        <Metric title="Cobros registrados" value={clp(receipts)} icon={<Banknote size={20} />}>
          <dl>
            <Detail label="Ventas al contado" value={clp(totals.cash_total)} />
            <Detail label="Pies de ventas a crédito" value={clp(totals.deposits)} />
            <Detail label="Capital de cuotas" value={clp(totals.principal_collected)} />
            <Detail label="Interés de mora cobrado" value={clp(totals.interest_collected)} />
          </dl>
        </Metric>
        <Metric title="Uso del crédito" value={creditShare} icon={<CreditCard size={20} />}>
          <p>De las ventas fueron a crédito.</p>
          <dl><Detail label="Capital otorgado" value={clp(totals.financed)} /></dl>
          {tiers.length > 0 && <details className={styles.details}>
            <summary>Capital por nivel al vender</summary>
            <dl>{tiers.map(tier => <Detail key={tier.code} label={`${tier.name} · ${number.format(tier.sales)}`} value={clp(tier.financed)} />)}</dl>
          </details>}
        </Metric>
        <Metric title="Asesor Inteligente" value={advisor ? number.format(advisor.sessions) : "—"} icon={<Sparkles size={20} />}>
          {advisor ? <>
            <p>Asesorías completadas</p>
            <dl><Detail label="Clientes únicos" value={number.format(advisor.customers)} /></dl>
          </> : <p>Datos del asesor no disponibles en esta base.</p>}
        </Metric>
      </div>
      {!salesCount && !receipts && <p className={styles.notice}>No hay ventas ni cobros registrados en este período.</p>}
      <p className={styles.note}>Los cobros incluyen los pagos de cuotas acreditados por Webpay y excluyen pagos revertidos. Alcance limitado a ventas y pagos del registro interno.</p>
    </section>

    <section aria-labelledby="cartera">
      <div className={styles.sectionHead}><h2 id="cartera">Cartera actual</h2><p>Al {formatDate(today)} · todos los créditos vigentes</p></div>
      <div className={styles.grid}>
        <Metric title="Capital pendiente" value={clp(totals.outstanding)} icon={<Wallet size={20} />}>
          <dl><Detail label="Vence de hoy a 7 días" value={clp(totals.due_soon)} /></dl>
        </Metric>
        <Metric title="Capital de cuotas vencidas" value={clp(totals.overdue)} icon={<CircleAlert size={20} />} tone="warning">
          <dl><Detail label="Créditos con cuotas vencidas" value={number.format(totals.overdue_credits)} /></dl>
        </Metric>
        <Metric title="Cartera en riesgo a 30 días" value={riskShare} icon={<ChartNoAxesCombined size={20} />}>
          <dl><Detail label="Saldo total de créditos en riesgo" value={clp(totals.at_risk)} /></dl>
          <p>Incluye el capital pendiente de cada crédito con alguna cuota impaga vencida hace más de 30 días.</p>
        </Metric>
      </div>
    </section>
  </main>;
}
