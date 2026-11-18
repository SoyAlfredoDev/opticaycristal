"use client";
import { useRef,useState,type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { clp } from "@/lib/clients/types";
import type { CategorySettings } from "@/lib/clients/category-types";
import categoryStyles from "./AdminCustomerCategory.module.css";
import styles from "./ClientSpace.module.css";
export function AdminCustomerCategory({customerId,initial,canEdit,showAllTiers=false,onSaved,onSettingsChange,onBusy}:{
 customerId:string;initial:CategorySettings;canEdit:boolean;showAllTiers?:boolean;
 onSaved?:(settings:CategorySettings)=>void;onSettingsChange?:(settings:CategorySettings)=>void;onBusy?:(busy:boolean)=>void;
}){
 const router=useRouter(),[settings,setSettings]=useState(initial),[selected,setSelected]=useState(initial.currentCategory),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const key=useRef(""),sending=useRef(false),tier=settings.tiers.find(t=>t.code===selected);
 const endpoint=`/api/admin/clientes/${encodeURIComponent(customerId)}/categoria`;
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(sending.current||!canEdit)return;sending.current=true;setBusy(true);onBusy?.(true);setError("");setNotice("");key.current ||= crypto.randomUUID();
  try{
   const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({category:selected,expectedCategory:settings.currentCategory,requestKey:key.current})});
   const result=await response.json();
   if(!response.ok){
    if(response.status===409){const latest=await fetch(endpoint,{cache:"no-store"});const data=await latest.json();if(latest.ok){setSettings(data.settings);setSelected(data.settings.currentCategory);onSettingsChange?.(data.settings);key.current="";if(!onSettingsChange)router.refresh();}}
    throw new Error(result.error||"No pudimos guardar el nivel.");
   }
   setSettings(result.settings);setSelected(result.settings.currentCategory);key.current="";setNotice(result.replayed?"El cambio ya estaba registrado.":result.changed?"Nivel actualizado.":"El nivel ya está actualizado.");if(onSaved)onSaved(result.settings);else router.refresh();
  }catch(error){setError(error instanceof Error?error.message:"No pudimos conectar. Inténtalo nuevamente.");}finally{sending.current=false;setBusy(false);onBusy?.(false);}
 }
 return <section className={`${styles.panel} ${styles.section}`} aria-labelledby="customer-category-title"><h2 id="customer-category-title">Nivel del cliente</h2>
  {showAllTiers ? <form onSubmit={submit} aria-label="Cambiar nivel">
   <fieldset className={categoryStyles.tierChoices} disabled={busy || !canEdit}>
    <legend>Todos los niveles</legend>
    {settings.tiers.map(option=><label key={option.code} className={categoryStyles.tierChoice} data-selected={selected===option.code}>
     <input type="radio" name="category" value={option.code} checked={selected===option.code}
      onChange={()=>{setSelected(option.code);key.current="";setError("");setNotice("");}}/>
     <span><strong>{option.name}{option.code===settings.currentCategory&&<small>Actual</small>}</strong>
      <span>Hasta {clp(option.maxAmount)} de crédito</span>
      <span>{option.maxPercent}% del precio · Hasta {option.maxInstallments} {option.maxInstallments===1?"cuota":"cuotas"}</span>
     </span>
    </label>)}
   </fieldset>
   {canEdit&&<button type="submit" className={`${styles.button} ${styles.primary}`} disabled={busy||selected===settings.currentCategory}>
    {busy?"Guardando…":"Guardar nivel"}
   </button>}
  </form> : canEdit?<form onSubmit={submit} className={categoryStyles.form} aria-label="Cambiar nivel"><label className={styles.field}><span>Nivel</span><select className={styles.input} value={selected} disabled={busy} onChange={event=>{setSelected(event.target.value);key.current="";setError("");setNotice("");}}>{settings.tiers.map(t=><option key={t.code} value={t.code}>{t.name}</option>)}</select></label><button className={`${styles.button} ${styles.primary}`} disabled={busy||selected===settings.currentCategory}>{busy?"Guardando…":"Guardar nivel"}</button></form>:<p className={styles.small}>Los cambios de nivel están a cargo del responsable autorizado.</p>}
  {!showAllTiers&&tier&&<p className={`${styles.small} ${styles.section}`}>Hasta el {tier.maxPercent}% del precio · Tope a crédito {clp(tier.maxAmount)} · {tier.maxInstallments} cuota{tier.maxInstallments>1?"s":""} mensual{tier.maxInstallments>1?"es":""}.</p>}
  {!showAllTiers&&settings.mailDeliveryEnabled===false&&<p className={`${styles.small} ${styles.muted}`}>Los correos de felicitación se preparan en desarrollo. El envío real está desactivado.</p>}
  <p className={`${styles.small} ${styles.muted}`}>El cambio aplica a próximas compras. Las compras actuales conservan sus condiciones.</p>
  {error&&<p className={styles.error} role="alert">{error}</p>}{notice&&<p className={styles.success} role="status">{notice}</p>}
  {settings.history.length>0&&<details className={styles.section}><summary>Últimos cambios</summary><ul className={`${styles.small} ${categoryStyles.history}`}>{settings.history.map(item=><li key={item.id}><strong>{item.from} → {item.to}</strong> · {item.actor} · {item.source==="automatic"?"Automático":"Manual"}{item.mailState&&<><br/><span>{({pending:"Felicitación en cola",processing:"Preparando felicitación",accepted:"Correo aceptado por el proveedor",failed:"Correo pendiente de revisión",unverified:"Felicitación pendiente de envío",cancelled:"Correo cancelado por cambio de datos",review:"Correo requiere revisión manual"})[item.mailState]}</span></>}<br/><time dateTime={item.createdAt}>{new Intl.DateTimeFormat("es-CL",{timeZone:"America/Santiago",dateStyle:"short",timeStyle:"short"}).format(new Date(item.createdAt)).replace(/\s+/g," ")}</time></li>)}</ul></details>}
 </section>;
}
