import Link from "next/link";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import type { CustomerProfile } from "@/lib/clients/types";
import { clp } from "@/lib/clients/types";
import styles from "./CustomerCategories.module.css";
export function CustomerCategories({tiers,currentCategory,embedded=false}:{tiers:CustomerProfile["tier"][];currentCategory:string;embedded?:boolean}) {
 return <div className={styles.categories}>
  {!embedded&&<><Link className={styles.back} href="/mi-cuenta"><ArrowLeft size={16} aria-hidden="true"/>Volver a Inicio</Link>
  <h1>Conoce tus categorías</h1><p className={styles.intro}>Más categoría, más cuotas para tus lentes.</p></>}
  <div className={styles.grid}>{tiers.map(tier=><section key={tier.code} id={tier.code} className={styles.card} data-category={tier.code} aria-labelledby={`category-${tier.code}`}>
   <div className={styles.header}><h2 id={`category-${tier.code}`}><Sparkles size={20} aria-hidden="true"/>{tier.code==="elite"?"Élite":tier.name}</h2>{tier.code===currentCategory&&<span className={styles.current}><Check size={14} aria-hidden="true"/>Tu categoría</span>}</div>
   <p className={styles.count}><span>Crédito máximo</span><strong>{clp(tier.maxAmount)}</strong></p>
   <dl><div><dt>Cuotas mensuales</dt><dd>Hasta {tier.maxInstallments}</dd></div><div><dt>De tu compra</dt><dd>Hasta el {tier.maxPercent}%</dd></div></dl>
  </section>)}</div>
 </div>;
}
