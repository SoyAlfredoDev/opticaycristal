"use client";
import { customerDocumentText } from "@/lib/clients/customer-document";
import {useEffect,useState,useRef} from 'react';
import {Check, MessageCircle} from "lucide-react";
import type {CustomerProfile} from '@/lib/clients/types';
import {CustomerEmailVerification} from './CustomerEmailVerification';
import styles from './ClientSpace.module.css';
import wizard from './AdminSales.module.css';

export function StaffWhatsappVerification({customerId,phone,available,verified,onVerified,retryUntil=0,onCooldown}:{customerId:string;phone?:string;available?:boolean;verified:boolean;onVerified:()=>void;retryUntil?:number;onCooldown?:(until:number)=>void}){
 const[requestId,setRequestId]=useState(''),[code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const lock=useRef(false);
 const [localRetry,setLocalRetry]=useState(0);
 const [now,setNow]=useState(()=>Date.now());
 const retry=Math.max(0,Math.ceil((Math.max(retryUntil,localRetry)-now)/1000));
 useEffect(()=>{
  if(!retry)return;
  const timer=setInterval(()=>setNow(Date.now()),1000);
  return()=>clearInterval(timer);
 },[retry]);
 function wait(seconds:number){
  if(!Number.isFinite(seconds)||seconds<=0)return;
  const time=Date.now();
  const until=time+seconds*1000;
  setNow(time);setLocalRetry(until);onCooldown?.(until);
 }
 async function run(action:'send'|'confirm'){
  if(lock.current||(action==='send'&&retry))return;lock.current=true;setBusy(true);setError('');
  try{
   const r=await fetch(`/api/admin/clientes/${encodeURIComponent(customerId)}/verificar-whatsapp`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(action==='send'?{action}:{action,requestId,code}),signal:AbortSignal.timeout(15000)});
   const b=await r.json();
   if(action==='send')wait(Number(r.headers.get('Retry-After')??b.resendAfterSeconds));
   if(!r.ok)throw Error(b.error||'No pudimos verificar el WhatsApp.');
   if(b.verified)onVerified();else{setRequestId(b.requestId);setCode('');}
  }catch(e){setError((e as Error).message);}finally{lock.current=false;setBusy(false);}
 }
 return <div>
   <div className={wizard.contactRow}>
     {phone && <MessageCircle size={18} aria-hidden="true" />}
     {phone && <div className={wizard.contactDetails}><strong>WhatsApp</strong><span>{phone.replace(/^(\+56)(9)(\d{4})(\d{4})$/, "$1 $2 $3 $4")}</span></div>}
     <span className={verified ? wizard.verified : wizard.warning}>
       {verified && <Check size={15} aria-hidden="true" />}
       {verified ? (phone ? "Verificado" : "WhatsApp verificado") : (phone ? "Pendiente · Opcional" : "WhatsApp pendiente · Verificación opcional")}
     </span>
     {!verified && available && <button className={wizard.secondary} type="button" disabled={busy || retry > 0}
       onClick={() => void run("send")}>
       {retry > 0 ? `Reenviar en ${retry} s` : requestId ? "Reenviar código por WhatsApp" : "Enviar código por WhatsApp"}
     </button>}
   </div>
   {!verified && !available && <p className={styles.small}>Verificación no disponible por ahora.</p>}
   {!verified && requestId && <form className={wizard.codeForm} onSubmit={event => { event.preventDefault(); void run("confirm"); }}>
     <label className={styles.field}>Código de WhatsApp
       <input className={styles.input} value={code} onChange={event => setCode(event.target.value)}
         autoComplete="one-time-code" maxLength={4} pattern="[A-Za-z0-9]{4}" required disabled={busy} />
     </label>
     <span className={styles.small}>Cuatro caracteres. Vence en cinco minutos.</span>
     <button className={wizard.secondary} disabled={busy || code.length !== 4}>Validar WhatsApp</button>
   </form>}
   {error && <p className={styles.error} role="alert">{error}</p>}
 </div>;
}

export function AdminCustomerContacts({customer}:{customer:Pick<CustomerProfile,'id'|'rut'|'document'|'email'|'emailVerified'|'whatsapp'|'whatsappVerified'|'whatsappVerificationAvailable'>}){
 const[email,setEmail]=useState(customer.emailVerified),[whatsapp,setWhatsapp]=useState(customer.whatsappVerified),[busy,setBusy]=useState(false);
 return <section className={styles.panel}><h2>Ficha y contactos</h2><p>{customerDocumentText(customer)}</p>
 <CustomerEmailVerification customerId={customer.id} email={customer.email} verified={email} disabled={busy} onBusy={setBusy} onVerified={()=>setEmail(true)}/>
 <p>{customer.whatsapp}</p><StaffWhatsappVerification customerId={customer.id} available={customer.whatsappVerificationAvailable} verified={whatsapp} onVerified={()=>setWhatsapp(true)}/>
 </section>;
}
