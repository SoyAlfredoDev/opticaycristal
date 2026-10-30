import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BadgeCheck, Clock3, ShoppingBag, Wallet } from "lucide-react";
import { currentCustomer } from "@/lib/clients/current";
import { getNextCustomerTier } from "@/lib/clients/store";
import { clp } from "@/lib/clients/types";
import styles from "@/components/clients/ClientSpace.module.css";

export default async function CustomerHome() {
  const c = await currentCustomer();
  const nextTier = await getNextCustomerTier(c.tier.code);

  return <>
    <div className={styles.pageIntro}>
      <h1>Hola, {c.firstName}</h1>
    </div>

    <div className={styles.dashboardGrid}>
      <section className={`${styles.panel} ${styles.finance}`} aria-labelledby="finance-title">
        <div className={styles.line}>
          <div className={styles.iconLabel}><span className={styles.iconTile}><Wallet size={20} aria-hidden="true" /></span><h2 id="finance-title">Tu financiamiento</h2></div>
          <span className={`${styles.pill} ${styles.tierBadge}`}>Nivel {c.tier.name}</span>
        </div>
        <p className={styles.balanceLabel}>Cupo disponible</p>
        <div className={styles.money}>{clp(c.credit.capacity)}</div>
        <span className={`${styles.statusLabel} ${c.credit.enabled ? styles.statusReady : styles.statusWaiting}`}>
          {c.credit.enabled ? <BadgeCheck size={16} aria-hidden="true" /> : <Clock3 size={16} aria-hidden="true" />}
          {c.credit.principalOutstanding > 0 ? "Financiamiento activo" : c.credit.enabled ? "Financiamiento habilitado" : "Verificaciones pendientes"}
        </span>
        <div className={styles.financeMetrics}>
          <div><span>{nextTier ? `Siguiente nivel · ${nextTier.name}` : `Nivel más alto · ${c.tier.name}`}</span><strong>{clp(nextTier?.maxAmount ?? c.tier.maxAmount)}</strong><span>Crédito máximo</span></div>
          <div><span>Saldo utilizado</span><strong>{clp(c.credit.principalOutstanding)}</strong></div>
        </div>
        <p className={styles.financeTerms}>Hasta el {c.tier.maxPercent}% de tu compra · {c.tier.maxInstallments} cuota{c.tier.maxInstallments > 1 ? "s" : ""} · Siempre con pie.</p>

      </section>

      <section className={`${styles.panel} ${styles.activity}`} aria-labelledby="activity-title">
        <h2 id="activity-title">Tu actividad</h2>
        <p className={`${styles.small} ${styles.muted}`}>{c.purchases.length ? `${c.purchases.length} compra(s) registrada(s)` : "Sin movimientos registrados"}</p>
        <div className={styles.activityGrid}>
          <Link className={styles.activityItem} href="/mi-cuenta/compras"><span className={styles.iconTile}><ShoppingBag size={21} aria-hidden="true" /></span><span><strong>Mis compras</strong><span>{c.purchases.length ? "Consulta tus compras registradas." : "Tu historial comenzará con tu primera compra."}</span></span><ArrowRight size={18} aria-hidden="true" /></Link>
          <Link className={styles.activityItem} href="/mi-cuenta/cuotas"><span className={styles.iconTile}><Wallet size={21} aria-hidden="true" /></span><span><strong>Mis cuotas</strong><span>{c.purchases.some(s=>s.credit>0) ? "Consulta tus cuotas y pagos." : "Aún no tienes financiamientos asociados."}</span></span><ArrowRight size={18} aria-hidden="true" /></Link>
        </div>
        <p className={styles.activityNote}>Compra a crédito sin intereses y sin consulta a DICOM. Siempre con pie y según las condiciones de tu nivel.</p>
      </section>
    </div>
    <picture className={styles.promotionCard}><source media="(max-width: 650px)" srcSet="/images/clientes/collections-banner-mobile.svg" /><Image src="/images/clientes/collections-banner.svg" width={1200} height={300} unoptimized alt="Óptica y Cristal: una nueva mirada, más tú. Descubre nuestras colecciones de lentes ópticos, sol y accesorios." /></picture>
  </>;
}
