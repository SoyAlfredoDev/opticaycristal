"use client";

import { BadgeCheck, ChevronRight, Clock3, Wallet } from "lucide-react";
import { simulatePurchase } from "@/lib/clients/purchase-simulation";
import { clp, type CustomerOverview } from "@/lib/clients/types";
import { CategoryTrigger } from "./CategoryModal";
import { PurchaseSimulatorModal } from "./PurchaseSimulatorModal";
import shared from "./ClientSpace.module.css";
import styles from "./CustomerFinancingCard.module.css";

type Props = { customer: Pick<CustomerOverview, "tier" | "credit" | "emailVerified"> };
const EXAMPLE_PRICE = 100_000;
const percentLabel = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 });

function InstallmentSummary({ amounts }: { amounts: number[] }) {
  const count = amounts.length;
  if (!count) return null;
  const first = amounts[0], last = amounts[count - 1];
  if (count === 1) return <>1 cuota mensual de <strong>{clp(first)}</strong></>;
  if (first === last) return <>{count} cuotas mensuales de <strong>{clp(first)}</strong></>;
  return <>{count - 1} {count === 2 ? "cuota mensual" : "cuotas mensuales"} de <strong>{clp(first)}</strong> y una última de <strong>{clp(last)}</strong></>;
}

export function CustomerFinancingCard({ customer }: Props) {
  const { tier, credit, emailVerified } = customer;
  const conditions = { tier, outstanding: credit.principalOutstanding, emailVerified };
  const example = simulatePurchase(EXAMPLE_PRICE, tier.maxInstallments, conditions);
  const canShowExample = credit.enabled && example.credit > 0;
  const financedPercent = example.credit / example.total * 100;
  const capacity = clp(credit.capacity);

  return <section className={styles.card} aria-labelledby="financing-title">
    <div className={styles.header}>
      <div className={styles.heading}><span className={styles.icon}><Wallet size={21} aria-hidden="true" /></span><h2 id="financing-title">Tu financiamiento</h2></div>
      <CategoryTrigger className={`${shared.pill} ${styles.level}`} label={`Ver niveles de crédito: tu nivel es ${tier.name}`}>{tier.name}<ChevronRight size={15} aria-hidden="true" /></CategoryTrigger>
    </div>

    <dl className={styles.metrics}>
      <div><dt>Cupo disponible</dt><dd className={capacity.length > 8 ? styles.longAmount : undefined}>{capacity}</dd></div>
      <div><dt>Hasta este porcentaje<br /><span>del precio</span></dt><dd>{tier.maxPercent}%</dd></div>
    </dl>
    <p className={`${styles.status} ${credit.enabled ? styles.ready : styles.waiting}`}>
      {credit.enabled ? <BadgeCheck size={19} aria-hidden="true" /> : <Clock3 size={19} aria-hidden="true" />}
      {credit.principalOutstanding > 0 ? "Crédito activo" : credit.enabled ? "Crédito habilitado" : "Verificaciones pendientes"}
    </p>

    {canShowExample ? <section className={styles.example} aria-labelledby="financing-example-title">
      <h3 id="financing-example-title">Así se paga una compra</h3>
      <p className={styles.price}>Ejemplo: lentes de {clp(example.total)}</p>
      <div className={styles.bar} aria-hidden="true">
        <span className={styles.financed} style={{ width: `${financedPercent}%` }}>{financedPercent >= 12 ? `${percentLabel.format(financedPercent)}%` : null}</span>
        <span className={styles.deposit} style={{ width: `${100 - financedPercent}%` }}>{100 - financedPercent >= 12 ? `${percentLabel.format(100 - financedPercent)}%` : null}</span>
      </div>
      <dl className={styles.legend}>
        <div><dt><span className={styles.financedKey} aria-hidden="true" />A crédito</dt><dd>{clp(example.credit)}</dd></div>
        <div><dt><span className={styles.depositKey} aria-hidden="true" />Tu pie</dt><dd>{clp(example.deposit)}</dd></div>
      </dl>
      <p className={styles.installments}><InstallmentSummary amounts={example.installments} /></p>
      <p className={styles.note}>Cuotas del ejemplo. El monto final se confirma en la óptica.</p>
    </section> : <p className={styles.blocked}>{credit.principalOutstanding > 0 ? "Al pagar tu crédito actual podrás financiar otra compra." : !emailVerified ? "Verifica tu correo en Perfil para utilizar tu financiamiento." : "Tu financiamiento no está habilitado para una nueva compra."}</p>}

    <div className={styles.actions}>
      <PurchaseSimulatorModal key={`${tier.code}:${tier.maxAmount}:${tier.maxPercent}:${tier.maxInstallments}:${credit.principalOutstanding}:${emailVerified}`} {...conditions} card />
      <CategoryTrigger className={styles.levelsLink}>Ver niveles</CategoryTrigger>
    </div>
  </section>;
}
