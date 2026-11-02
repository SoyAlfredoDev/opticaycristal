"use client";
import { useState,type FormEvent } from "react";
import { Calculator,Download,Search } from "lucide-react";
import type { AdminSimulation,SimulationCustomer } from "@/lib/clients/admin-simulation";
import type { CustomerProfile } from "@/lib/clients/types";
import { clp } from "@/lib/clients/types";
import base from "./ClientSpace.module.css";
import styles from "./AdminCreditSimulator.module.css";
type Tier=CustomerProfile["tier"];
export function AdminCreditSimulator({tiers,products,firstDueDate}:{tiers:Tier[];products:{id:string;name:string;variableCost?:boolean}[];firstDueDate:string}){
 const[mode,setMode]=useState<"customer"|"tier">("customer"),[rut,setRut]=useState(""),[customer,setCustomer]=useState<SimulationCustomer|null>(null),[tierCode,setTierCode]=useState(tiers[0]?.code||""),[price,setPrice]=useState(""),[count,setCount]=useState(1),[productId,setProductId]=useState(""),[due,setDue]=useState(firstDueDate),[quote,setQuote]=useState<AdminSimulation|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const tier=mode==="customer"?customer?.tier:tiers.find(t=>t.code===tierCode);
 function clear(){setQuote(null);setError("");}
 async function call(body:Record<string,unknown>){return fetch("/api/admin/clientes/simulador",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});}
 async function lookup(){setBusy(true);setError("");setQuote(null);setCustomer(null);try{const response=await call({action:"lookup",rut}),data=await response.json();if(!response.ok)throw new Error(data.error);setCustomer(data.customer);setCount(data.customer.tier.maxInstallments);}catch(e){setError(e instanceof Error&&e.name!=="TimeoutError"?e.message:"No pudimos consultar el cliente. Inténtalo nuevamente.");}finally{setBusy(false);}}
 const input=()=>({mode,rut,tierCode,total:price,installmentCount:count,productId,firstDueDate:due,pricingPolicy:"category"});
 async function calculate(event:FormEvent<HTMLFormElement>){event.preventDefault();setError("");if(mode==="customer"&&!customer){setError("Consulta el RUT del cliente antes de calcular.");return;}setBusy(true);setQuote(null);try{const response=await call({action:"calculate",...input()}),data=await response.json();if(!response.ok)throw new Error(data.error);setQuote(data.quote);if(data.quote.customer)setCustomer(data.quote.customer);}catch(e){setError(e instanceof Error&&e.name!=="TimeoutError"?e.message:"No pudimos calcular. Inténtalo nuevamente.");}finally{setBusy(false);}}
 async function download(){if(!quote)return;setBusy(true);setError("");try{const response=await call({action:"pdf",...input(),expectedFingerprint:quote.fingerprint});if(!response.ok){const data=await response.json();if(response.status===409){setQuote(null);setCustomer(null);}throw new Error(data.error);}const blob=await response.blob();if(!blob.type.includes("application/pdf"))throw new Error("No pudimos preparar el PDF.");const url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=`propuesta-credito-${quote.fingerprint.slice(0,10)}.pdf`;document.body.append(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){setError(e instanceof Error&&e.name!=="TimeoutError"?e.message:"No pudimos descargar el PDF. Inténtalo nuevamente.");}finally{setBusy(false);}}
 return <div className={styles.layout}>
  <section className={base.panel}><h2><Calculator size={22} aria-hidden="true"/> Datos del cálculo</h2>
   <form onSubmit={calculate} className={base.form}><fieldset disabled={busy} className={styles.fields}>
    <label className={base.field}>Calcular para<select className={base.input} value={mode} onChange={e=>{setMode(e.target.value as "customer"|"tier");setCustomer(null);setCount(1);clear();}}><option value="customer">Cliente por RUT</option><option value="tier">Categoría de referencia</option></select></label>
    {mode==="customer"?<><div className={styles.lookup}><label className={base.field}>RUT del cliente<input className={base.input} value={rut} maxLength={20} placeholder="12.345.678-5" autoComplete="off" onChange={e=>{setRut(e.target.value);setCustomer(null);setCount(1);clear();}}/></label><button type="button" className={base.button} onClick={lookup} disabled={busy||!rut.trim()}><Search size={18} aria-hidden="true"/>Consultar RUT</button></div>{customer&&<div className={styles.customer}><strong>{customer.name}</strong><span>{customer.tier.name} · Disponible para usar {clp(customer.available)}</span></div>}</>:<label className={base.field}>Categoría<select className={base.input} value={tierCode} onChange={e=>{setTierCode(e.target.value);setCount(tiers.find(t=>t.code===e.target.value)?.maxInstallments||1);clear();}}>{tiers.map(t=><option key={t.code} value={t.code}>{t.name}</option>)}</select></label>}
    {tier&&<p className={styles.conditions}>Hasta {tier.maxPercent}% de la compra · Tope {clp(tier.maxAmount)} · Máximo {tier.maxInstallments} {tier.maxInstallments===1?"cuota mensual":"cuotas mensuales"}</p>}
    <label className={base.field}>Precio total con IVA<input className={base.input} value={price} inputMode="numeric" placeholder="Ej.: 100.000" maxLength={18} required onChange={e=>{setPrice(e.target.value);clear();}}/></label>
    <label className={base.field}>Producto opcional<select className={base.input} value={productId} onChange={e=>{setProductId(e.target.value);clear();}}><option value="">Sin producto: cálculo referencial</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <div className={styles.row}><label className={base.field}>Cuotas mensuales<select className={base.input} value={count} onChange={e=>{setCount(Number(e.target.value));clear();}}>{Array.from({length:tier?.maxInstallments||1},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select></label><label className={base.field}>Primera cuota estimada<input className={base.input} type="date" value={due} required onChange={e=>{setDue(e.target.value);clear();}}/></label></div>
    <button className={`${base.button} ${base.primary}`} disabled={busy||!tiers.length}>{busy?"Procesando…":"Calcular propuesta"}</button>
   </fieldset></form>
   {error&&<p role="alert" className={base.error}>{error}</p>}
  </section>
  <section className={`${base.panel} ${styles.result}`} aria-labelledby="proposal-result-title" aria-busy={busy}>
   <h2 id="proposal-result-title">Propuesta de crédito</h2>
   {quote?<><p>{quote.customer?quote.customer.name:"Escenario por categoría"} · {quote.tier.name}</p><dl className={styles.amounts}><div><dt>Precio total con IVA</dt><dd>{clp(quote.total)}</dd></div><div><dt>Pie mínimo</dt><dd>{clp(quote.deposit)}</dd></div><div className={styles.highlight}><dt>Monto a crédito</dt><dd>{clp(quote.credit)}</dd></div></dl>
    {quote.reason&&<p className={styles.notice}>{quote.reason}</p>}
    {quote.installments.length>0&&<div className={styles.schedule}><table><caption>Cuotas mensuales estimadas</caption><thead><tr><th>Cuota</th><th>Vencimiento</th><th>Monto</th></tr></thead><tbody>{quote.installments.map(i=><tr key={i.number}><td>{i.number}</td><td>{i.dueDate.split("-").reverse().join("/")}</td><td>{clp(i.amount)}</td></tr>)}</tbody></table></div>}
    <p className={base.small}>{quote.productName?`Producto: ${quote.productName}.`:"Sin producto seleccionado: el pie puede aumentar según el lente elegido."} Interés corriente: 0 %.</p>
    <button type="button" className={`${base.button} ${base.primary}`} onClick={download} disabled={busy}><Download size={18} aria-hidden="true"/>{busy?"Preparando…":"Descargar propuesta en PDF"}</button>
   </>:<p className={styles.empty}>Consulta un cliente o elige una categoría e ingresa el precio para ver el pie, el crédito y las cuotas.</p>}
   <p className={styles.footnote}>Cálculo referencial. No registra ventas, reserva cupo ni genera deuda.</p>
  </section>
 </div>;
}
