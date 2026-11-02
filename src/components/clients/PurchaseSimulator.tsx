"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { Calculator, Sparkles } from "lucide-react";
import { clp } from "@/lib/clients/types";
import { parsePurchasePrice, simulatePurchase, type PurchaseSimulation, type SimulationConditions } from "@/lib/clients/purchase-simulation";
import styles from "./PurchaseSimulator.module.css";
const motionQuery="(prefers-reduced-motion: reduce)";
function subscribeMotion(change:()=>void){const media=window.matchMedia(motionQuery);media.addEventListener("change",change);return()=>media.removeEventListener("change",change);}
const reducedMotion=()=>window.matchMedia(motionQuery).matches;
function AnimatedAmount({value}:{value:number}){
 const [shown,setShown]=useState(0),reduce=useSyncExternalStore(subscribeMotion,reducedMotion,()=>true);
 useEffect(()=>{
  if(reduce)return;
  let frame=0;const started=performance.now();
  const tick=(now:number)=>{const progress=Math.min(1,Math.max(0,(now-started)/700));setShown(Math.round(value*(1-Math.pow(1-progress,3))));if(progress<1)frame=requestAnimationFrame(tick);};
  frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
 },[value,reduce]);
 return <><span aria-hidden="true">{clp(reduce?value:shown)}</span><span className={styles.srOnly}>{clp(value)}</span></>;
}
export function PurchaseSimulator({embedded=false,...conditions}:SimulationConditions&{embedded?:boolean}){
 const [price,setPrice]=useState(""),[count,setCount]=useState(conditions.tier.maxInstallments),[result,setResult]=useState<PurchaseSimulation|null>(null),[error,setError]=useState(""),[run,setRun]=useState(0);
 const resultRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(result)resultRef.current?.scrollIntoView({behavior:window.matchMedia(motionQuery).matches?"auto":"smooth",block:"nearest"});},[result,run]);
 function consult(event:FormEvent<HTMLFormElement>){event.preventDefault();setError("");try{setResult(simulatePurchase(parsePurchasePrice(price),count,conditions));setRun(value=>value+1);}catch(e){setResult(null);setError(e instanceof Error?e.message:"Revisa el precio ingresado.");}}
 const reason=!conditions.emailVerified?"email":conditions.outstanding>0?"active":null;
 return <section className={`${styles.simulator} ${embedded?styles.embedded:""}`} aria-labelledby={embedded?"purchase-simulator-modal-title":"purchase-simulator-title"}>
  {!embedded&&<div className={styles.heading}><span className={styles.icon}><Calculator size={22} aria-hidden="true"/></span><div><h2 id="purchase-simulator-title">Simula tu compra</h2><p>Ingresa el precio total de tus lentes, con IVA incluido.</p></div></div>}
  {reason&&<p className={styles.notice}>{reason==="email"?<>Para usar tu crédito, <Link href="/mi-cuenta/perfil">verifica tu correo</Link>. Mientras tanto, verás el pago al contado.</>:<>Tienes un crédito activo. Podrás usar uno nuevo al <Link href="/mi-cuenta/cuotas">pagar tu saldo pendiente</Link>.</>}</p>}
  <p className={styles.limits}>Crédito máximo de tu categoría: <strong>{clp(conditions.tier.maxAmount)}</strong> · hasta el {conditions.tier.maxPercent}% de la compra. Puedes pagar el resto como pie.</p>
  <form className={styles.form} onSubmit={consult}>
   <label>Precio total con IVA<div className={styles.priceField}><span aria-hidden="true">$</span><input name="purchaseTotal" aria-label="Precio total con IVA" inputMode="numeric" autoComplete="off" placeholder="Ej.: 100.000" value={price} maxLength={18} onChange={event=>{setPrice(event.target.value);setResult(null);setError("");}} required aria-invalid={Boolean(error)} aria-describedby={error?"purchase-simulator-error":undefined}/></div></label>
   <label>Cuotas mensuales<select value={count} onChange={event=>{setCount(Number(event.target.value));setResult(null);}}>{Array.from({length:conditions.tier.maxInstallments},(_,i)=><option key={i+1} value={i+1}>{i+1} {i?"cuotas":"cuota"}</option>)}</select></label>
   <button type="submit" className={styles.consult}>Consultar<Sparkles size={17} aria-hidden="true"/></button>
  </form>
  {error&&<p id="purchase-simulator-error" role="alert" className={styles.error}>{error}</p>}
  {result&&<div ref={resultRef} key={run} className={`${styles.result} ${result.credit>0?styles.celebrate:""}`} role="status" aria-live="polite" aria-atomic="true">
   <div className={styles.resultHeading}><h3>Tu simulación</h3><span>Total: {clp(result.total)}</span></div>
   <div className={styles.amounts}>
    <div className={styles.deposit}><span>{result.credit?"Pie estimado":"Pago al contado"}</span><strong><AnimatedAmount value={result.deposit}/></strong><small>Al comprar en la óptica</small></div>
    <div><span>Crédito estimado</span><strong><AnimatedAmount value={result.credit}/></strong><small>{result.credit?"Interés 0 % al día":"Sin crédito en esta simulación"}</small></div>
    {result.installments.length>0&&<div><span>{result.installments.length} {result.installments.length===1?"cuota mensual":"cuotas mensuales"}</span><strong><AnimatedAmount value={result.installments[0]}/></strong><small>{result.installments.at(-1)===result.installments[0]?"Cada cuota":`Última cuota: ${clp(result.installments.at(-1)!)}`}</small></div>}
   </div>
   <p className={styles.disclaimer}>Estimación según tu categoría. El pie final se confirma en la óptica según los lentes elegidos.</p>
  </div>}
 </section>;
}
