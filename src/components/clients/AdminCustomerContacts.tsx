"use client";
import {useState,useRef} from 'react';
import type {CustomerProfile} from '@/lib/clients/types';
import {CustomerEmailVerification} from './CustomerEmailVerification';
import styles from './ClientSpace.module.css';

export function StaffWhatsappVerification({customerId,available,verified,onVerified}:{customerId:string;available?:boolean;verified:boolean;onVerified:()=>void}){
 const[requestId,setRequestId]=useState(''),[code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const lock=useRef(false);
 async function run(action:'send'|'confirm'){
  if(lock.current)return;lock.current=true;setBusy(true);setError('');
  try{
   const r=await fetch(`/api/admin/clientes/${encodeURIComponent(customerId)}/verificar-whatsapp`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(action==='send'?{action}:{action,requestId,code}),signal:AbortSignal.timeout(15000)});
   const b=await r.json();if(!r.ok)throw Error(b.error||'No pudimos verificar el WhatsApp.');
   if(b.verified)onVerified();else{setRequestId(b.requestId);setCode('');}
  }catch(e){setError((e as Error).message);}finally{lock.current=false;setBusy(false);}
 }
 if(verified)return <p className={`${styles.pill} ${styles.verified}`}>WhatsApp verificado</p>;
 return <div><p className={styles.small}>WhatsApp pendiente · Verificación opcional</p>
 {!available?<p className={styles.small}>Verificación no disponible por ahora.</p>:<>
 <button className={styles.button} type="button" disabled={busy} onClick={()=>void run('send')}>{requestId?'Reenviar código por WhatsApp':'Enviar código por WhatsApp'}</button>
 {requestId&&<form className={styles.form} onSubmit={e=>{e.preventDefault();void run('confirm');}}><label className={styles.field}>Código de WhatsApp<input className={styles.input} value={code} onChange={e=>setCode(e.target.value)} autoComplete="one-time-code" maxLength={4} pattern="[A-Za-z0-9]{4}" required disabled={busy}/></label><span className={styles.small}>Cuatro caracteres. Vence en cinco minutos.</span><button className={styles.button} disabled={busy||code.length!==4}>Validar WhatsApp</button></form>}</>}
 {error&&<p className={styles.error} role="alert">{error}</p>}</div>;
}

export function AdminCustomerContacts({customer}:{customer:Pick<CustomerProfile,'id'|'rut'|'email'|'emailVerified'|'whatsapp'|'whatsappVerified'|'whatsappVerificationAvailable'>}){
 const[email,setEmail]=useState(customer.emailVerified),[whatsapp,setWhatsapp]=useState(customer.whatsappVerified),[busy,setBusy]=useState(false);
 return <section className={styles.panel}><h2>Ficha y contactos</h2><p>RUT {customer.rut}</p>
 <CustomerEmailVerification customerId={customer.id} email={customer.email} verified={email} disabled={busy} onBusy={setBusy} onVerified={()=>setEmail(true)}/>
 <p>{customer.whatsapp}</p><StaffWhatsappVerification customerId={customer.id} available={customer.whatsappVerificationAvailable} verified={whatsapp} onVerified={()=>setWhatsapp(true)}/>
 </section>;
}
