"use client";
import Link from "next/link";
import { PurchaseSimulatorModal } from "@/components/clients/PurchaseSimulatorModal";
import { CategoryModalProvider, CategoryTrigger } from "@/components/clients/CategoryModal";
import { CustomerPromotions } from "@/components/clients/CustomerPromotions";
import { ArrowRight, BadgeCheck, Clock3, ChevronRight, ShoppingBag, Wallet } from "lucide-react";
import { useCustomerData } from "@/components/clients/CustomerDataProvider";
import { CustomerDataState } from "@/components/clients/CustomerDataState";
import { clp } from "@/lib/clients/types";
import styles from "@/components/clients/ClientSpace.module.css";

export default function CustomerHome() {
  const { customer: c, tiers, viewer } = useCustomerData();
  if (!c) return <><div className={styles.pageIntro}><h1>Hola, {viewer.firstName}</h1></div><CustomerDataState /></>;
  const currentIndex = tiers.findIndex(tier => tier.code === c.tier.code);
  const nextTier = currentIndex >= 0 ? tiers[currentIndex + 1] : undefined;

  return <CategoryModalProvider tiers={tiers} currentCategory={c.tier.code}>
    <div className={styles.pageIntro}>
      <h1>Hola, {c.firstName}</h1>
    </div>

    <div className={styles.dashboardGrid}>
      <section className={`${styles.panel} ${styles.finance}`} aria-labelledby="finance-title">
        <div className={styles.line}>
          <div className={styles.iconLabel}><span className={styles.iconTile}><Wallet size={20} aria-hidden="true" /></span><h2 id="finance-title">Tu crédito</h2></div>
          <CategoryTrigger className={`${styles.pill} ${styles.tierBadge}`} label={`Ver categorías de crédito: tu categoría es ${c.tier.name}`}>{c.tier.name}<ChevronRight size={14} aria-hidden="true"/></CategoryTrigger>
        </div>
        <p className={styles.balanceLabel}>Cupo disponible</p>
        <div className={styles.money}>{clp(c.credit.capacity)}</div>
        <span className={`${styles.statusLabel} ${c.credit.enabled ? styles.statusReady : styles.statusWaiting}`}>
          {c.credit.enabled ? <BadgeCheck size={16} aria-hidden="true" /> : <Clock3 size={16} aria-hidden="true" />}
          {c.credit.principalOutstanding > 0 ? "Crédito activo" : c.credit.enabled ? "Crédito habilitado" : "Verificaciones pendientes"}
        </span>
        <div className={styles.financeMetrics}>
          <div><CategoryTrigger className={styles.textLink}>{nextTier ? `Siguiente nivel · ${nextTier.name}` : `Nivel más alto · ${c.tier.name}`}</CategoryTrigger><strong>{clp(nextTier?.maxAmount ?? c.tier.maxAmount)}</strong><span>Crédito máximo</span></div>
          <div><span>Saldo utilizado</span><strong>{clp(c.credit.principalOutstanding)}</strong></div>
        </div>
        <p className={styles.financeTerms}>Hasta el {c.tier.maxPercent}% de tu compra · {c.tier.maxInstallments} cuota{c.tier.maxInstallments > 1 ? "s" : ""} · Siempre con pie.</p>

      </section>

      <section className={`${styles.panel} ${styles.activity}`} aria-labelledby="activity-title">
        <h2 id="activity-title">Tu actividad</h2>
        <p className={`${styles.small} ${styles.muted}`}>{c.activity.purchaseCount ? `${c.activity.purchaseCount} compra(s) registrada(s)` : "Sin movimientos registrados"}</p>
        <div className={styles.activityGrid}>
          <Link className={styles.activityItem} href="/mi-cuenta/compras"><span className={styles.iconTile}><ShoppingBag size={21} aria-hidden="true" /></span><span><strong>Mis compras</strong><span>{c.activity.purchaseCount ? "Consulta tus compras registradas." : "Tu historial comenzará con tu primera compra."}</span></span><ArrowRight size={18} aria-hidden="true" /></Link>
          <Link className={styles.activityItem} href="/mi-cuenta/cuotas"><span className={styles.iconTile}><Wallet size={21} aria-hidden="true" /></span><span><strong>Mis cuotas</strong><span>{c.activity.creditCount > 0 ? "Consulta tus cuotas y pagos." : "No tienes créditos activos."}</span></span><ArrowRight size={18} aria-hidden="true" /></Link>
        </div>
        <p className={styles.activityNote}>Compra a crédito con interés 0 % pagando al día y sin consulta a DICOM. Siempre con pie y según las condiciones de tu nivel.</p>
      </section>
    </div>
    <PurchaseSimulatorModal key={`${c.tier.code}:${c.tier.maxAmount}:${c.tier.maxPercent}:${c.tier.maxInstallments}:${c.credit.principalOutstanding}:${c.emailVerified}`} tier={c.tier} outstanding={c.credit.principalOutstanding} emailVerified={c.emailVerified}/>
    <CustomerPromotions />
  </CategoryModalProvider>;
}
