import Link from "next/link";
import { FinancingExplanation } from "./FinancingExplanation";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import type { CustomerProfile } from "@/lib/clients/types";
import { clp } from "@/lib/clients/types";
import styles from "./CustomerCategories.module.css";
export function CustomerCategories({tiers,currentCategory,embedded=false}:{tiers:CustomerProfile["tier"][];currentCategory:string;embedded?:boolean}) {
 return <div className={styles.categories}>
  {!embedded&&<><Link className={styles.back} href="/mi-cuenta"><ArrowLeft size={16} aria-hidden="true"/>Volver a Inicio</Link>
  <h1>Conoce tus niveles</h1><p className={styles.intro}>Conoce los beneficios de cada nivel.</p></>}
  <div className={styles.grid}>{tiers.map(tier=><section key={tier.code} id={tier.code} className={styles.card} data-category={tier.code} aria-labelledby={`category-${tier.code}`}>
   <div className={styles.header}><h2 id={`category-${tier.code}`}><Sparkles size={20} aria-hidden="true"/>{tier.code==="elite"?"Élite":tier.name}</h2>{tier.code===currentCategory&&<span className={styles.current}><Check size={14} aria-hidden="true"/>Tu nivel</span>}</div>
   <p className={styles.count}><span>Parte del precio que financiamos</span><strong>Hasta el {tier.maxPercent}%</strong></p>
   <dl><div><dt>Cuotas mensuales</dt><dd>Hasta {tier.maxInstallments}</dd></div><div><dt>Tope del monto a crédito</dt><dd>{clp(tier.maxAmount)}</dd></div></dl>
  <p className={styles.conditions}>El resto se paga como pie. El crédito se devuelve en cuotas.</p></section>)}</div>
  {tiers.find(tier=>tier.code===currentCategory)&&<FinancingExplanation tier={tiers.find(tier=>tier.code===currentCategory)!} compact/>}
 </div>;
}
