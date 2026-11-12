"use client";
import Link from "next/link";
import { CustomerFinancingCard } from "@/components/clients/CustomerFinancingCard";
import { CategoryModalProvider } from "@/components/clients/CategoryModal";
import { CustomerPromotions } from "@/components/clients/CustomerPromotions";
import { ArrowRight, ShoppingBag, Sparkles, Wallet } from "lucide-react";
import { useCustomerData } from "@/components/clients/CustomerDataProvider";
import { CustomerDataState } from "@/components/clients/CustomerDataState";
import dashboard from "@/components/clients/CustomerDashboard.module.css";
import styles from "@/components/clients/ClientSpace.module.css";

export default function CustomerHome() {
  const { customer: c, tiers, viewer } = useCustomerData();
  const intro = <div className={styles.pageIntro}><h1>Hola, {c?.firstName ?? viewer.firstName}</h1></div>;
  const advisor = viewer.frameAdvisor && <section className={`${styles.panel} ${styles.section}`} aria-labelledby="frame-advisor-title">
    <h2 id="frame-advisor-title">Asesor de monturas</h2>
    <p className={styles.muted}>Prueba tres formas y colores según tu estilo.</p>
    <Link href="/mi-cuenta/asesor-de-monturas" className={`${styles.button} ${styles.primary}`}><Sparkles size={19} aria-hidden="true" /> Probar monturas</Link>
  </section>;
  if (!c) return <>{intro}{advisor}<CustomerDataState /></>;

  return <CategoryModalProvider tiers={tiers} currentCategory={c.tier.code}>
    {intro}
    {advisor}

    <div className={dashboard.cards} role="region" aria-label="Resumen de tu cuenta" tabIndex={0}>
      <CustomerFinancingCard customer={c} />

      <section className={`${styles.panel} ${styles.activity}`} aria-labelledby="activity-title">
        <h2 id="activity-title">Tu actividad</h2>
        <p className={`${styles.small} ${styles.muted}`}>{c.activity.purchaseCount ? `${c.activity.purchaseCount} compra(s) registrada(s)` : "Sin movimientos registrados"}</p>
        <div className={styles.activityGrid}>
          <Link className={styles.activityItem} href="/mi-cuenta/compras"><span className={styles.iconTile}><ShoppingBag size={21} aria-hidden="true" /></span><span><strong>Mis compras</strong><span>{c.activity.purchaseCount ? "Consulta tus compras registradas." : "Tu historial comenzará con tu primera compra."}</span></span><ArrowRight size={18} aria-hidden="true" /></Link>
          <Link className={styles.activityItem} href="/mi-cuenta/cuotas"><span className={styles.iconTile}><Wallet size={21} aria-hidden="true" /></span><span><strong>Mis cuotas</strong><span>{c.activity.creditCount > 0 ? "Consulta tus cuotas y pagos." : "No tienes créditos activos."}</span></span><ArrowRight size={18} aria-hidden="true" /></Link>
        </div>
        <p className={styles.activityNote}>Compra a crédito con interés 0 % pagando al día y sin consulta a DICOM. Siempre con pie y según las condiciones de tu nivel.</p>
      </section>
      <div className={dashboard.promotion}><CustomerPromotions advisorAvailable={viewer.frameAdvisor} /></div>
    </div>
  </CategoryModalProvider>;
}
