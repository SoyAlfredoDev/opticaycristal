import { Percent } from 'lucide-react';
import type { FinancingTier } from '@/lib/clients/financing';
import { financingExample } from '@/lib/clients/financing-copy';
import { clp } from '@/lib/clients/types';
import styles from './FinancingExplanation.module.css';
export function FinancingExplanation({tier,compact=false,publicStyle=false}:{tier:FinancingTier;compact?:boolean;publicStyle?:boolean}){
 const example=financingExample(tier);
 return <aside className={`${styles.explanation} ${publicStyle?styles.editorial:''}`} aria-label="Cómo se calcula tu financiamiento">
  <p className={styles.lead}><Percent size={19} aria-hidden="true"/><span>Financiamos <strong>hasta el {tier.maxPercent}% del precio</strong>, con un tope de <strong>{clp(tier.maxAmount)}</strong>.</span></p>
  <p className={styles.copy}>Pagas el resto como pie y devuelves el monto financiado en cuotas. El cupo es el límite del crédito, no un descuento sobre tus lentes.</p>
  <details open={!compact}><summary>Ejemplo con lentes de {clp(example.price)}</summary><dl className={styles.example}><div><dt>Precio de tus lentes</dt><dd>{clp(example.price)}</dd></div><div><dt>A crédito</dt><dd>{clp(example.credit)}</dd></div><div><dt>Tu pie</dt><dd>{clp(example.deposit)}</dd></div></dl><p className={styles.note}>Ejemplo referencial, sin deuda pendiente y con el crédito habilitado. Se aplica el menor valor entre el porcentaje de la compra y tu cupo disponible. Siempre con pie.</p></details>
 </aside>;
}
