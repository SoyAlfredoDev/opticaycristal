"use client";
import { useRef,useState,type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { clp } from "@/lib/clients/types";
import type { CategorySettings } from "@/lib/clients/category-types";
import categoryStyles from "./AdminCustomerCategory.module.css";
import styles from "./ClientSpace.module.css";
export function AdminCustomerCategory({customerId,initial,canEdit}:{customerId:string;initial:CategorySettings;canEdit:boolean}){
 const router=useRouter(),[settings,setSettings]=useState(initial),[selected,setSelected]=useState(initial.currentCategory),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const key=useRef(""),sending=useRef(false),tier=settings.tiers.find(t=>t.code===selected);
 const endpoint=`/api/admin/clientes/${encodeURIComponent(customerId)}/categoria`;
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(sending.current||!canEdit)return;sending.current=true;setBusy(true);setError("");setNotice("");key.current ||= crypto.randomUUID();
  try{
   const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({category:selected,expectedCategory:settings.currentCategory,requestKey:key.current})});
   const result=await response.json();
   if(!response.ok){
    if(response.status===409){const latest=await fetch(endpoint,{cache:"no-store"});const data=await latest.json();if(latest.ok){setSettings(data.settings);key.current="";router.refresh();}}
    throw new Error(result.error||"No pudimos guardar la categoría.");
   }
   setSettings(result.settings);setSelected(result.settings.currentCategory);key.current="";setNotice(result.replayed?"El cambio ya estaba registrado.":result.changed?"Categoría actualizada.":"La categoría ya está actualizada.");router.refresh();
  }catch(error){setError(error instanceof Error?error.message:"No pudimos conectar. Inténtalo nuevamente.");}finally{sending.current=false;setBusy(false);}
 }
 return <section className={`${styles.panel} ${styles.section}`} aria-labelledby="customer-category-title"><h2 id="customer-category-title">Categoría del cliente</h2>
  {canEdit?<form onSubmit={submit} className={categoryStyles.form} aria-label="Cambiar categoría"><label className={styles.field}><span>Categoría</span><select className={styles.input} value={selected} disabled={busy} onChange={event=>{setSelected(event.target.value);key.current="";setError("");setNotice("");}}>{settings.tiers.map(t=><option key={t.code} value={t.code}>{t.name}</option>)}</select></label><button className={`${styles.button} ${styles.primary}`} disabled={busy||selected===settings.currentCategory}>{busy?"Guardando…":"Guardar categoría"}</button></form>:<p className={styles.small}>Los cambios de categoría están a cargo del responsable autorizado.</p>}
  {tier&&<p className={`${styles.small} ${styles.section}`}>{clp(tier.maxAmount)} de cupo máximo · Hasta {tier.maxPercent}% · {tier.maxInstallments} cuota{tier.maxInstallments>1?"s":""} mensual{tier.maxInstallments>1?"es":""}.</p>}
  <p className={`${styles.small} ${styles.muted}`}>El cambio aplica a próximas compras. Las compras actuales conservan sus condiciones.</p>
  {error&&<p className={styles.error} role="alert">{error}</p>}{notice&&<p className={styles.success} role="status">{notice}</p>}
  {settings.history.length>0&&<details className={styles.section}><summary>Últimos cambios</summary><ul className={`${styles.small} ${categoryStyles.history}`}>{settings.history.map(item=><li key={item.id}><strong>{item.from} → {item.to}</strong> · {item.actor}<br/><time dateTime={item.createdAt}>{new Intl.DateTimeFormat("es-CL",{timeZone:"America/Santiago",dateStyle:"short",timeStyle:"short"}).format(new Date(item.createdAt)).replace(/\s+/g," ")}</time></li>)}</ul></details>}
 </section>;
}
