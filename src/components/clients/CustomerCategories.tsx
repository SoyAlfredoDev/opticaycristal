import Link from "next/link";
import { ArrowLeft, Check, ShieldCheck, Sparkles } from "lucide-react";
import type { CustomerProfile } from "@/lib/clients/types";
import { clp } from "@/lib/clients/types";
import styles from "./CustomerCategories.module.css";
export function CustomerCategories({tiers,currentCategory,embedded=false}:{tiers:CustomerProfile["tier"][];currentCategory:string;embedded?:boolean}) {
 return <div className={styles.categories}>
  {!embedded&&<><Link className={styles.back} href="/mi-cuenta"><ArrowLeft size={16} aria-hidden="true"/>Volver a Inicio</Link>
  <h1>Conoce tus categorías</h1><p className={styles.intro}>Más categoría, más cuotas para tus lentes.</p></>}
  <div className={styles.grid}>{tiers.map(tier=><section key={tier.code} id={tier.code} className={styles.card} data-category={tier.code} aria-labelledby={`category-${tier.code}`}>
   <div className={styles.header}><h2 id={`category-${tier.code}`}><Sparkles size={20} aria-hidden="true"/>{tier.code==="elite"?"Élite":tier.name}</h2>{tier.code===currentCategory&&<span className={styles.current}><Check size={14} aria-hidden="true"/>Tu categoría</span>}</div>
   <p className={styles.count}>Hasta <strong>{tier.maxInstallments}</strong> {tier.maxInstallments===1?"cuota mensual":"cuotas mensuales"}</p>
   <dl><div><dt>Crédito máximo</dt><dd>{clp(tier.maxAmount)}</dd></div><div><dt>De tu compra</dt><dd>Hasta el {tier.maxPercent}%</dd></div></dl>
  </section>)}</div>
  <section className={styles.shared} aria-label="Beneficios de todas las categorías"><ShieldCheck size={24} aria-hidden="true"/><div><h2>En todas las categorías</h2><p>Sin intereses y sin consultar DICOM. Siempre con pie.</p><p className={styles.conditions}>El monto depende de tu compra y de tu cupo disponible. La óptica asigna tu categoría; los cambios se aplican a nuevas compras.</p></div></section>
 </div>;
}
