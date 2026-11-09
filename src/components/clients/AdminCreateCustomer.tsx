"use client";
import {useRef,useState,type FormEvent} from 'react';
import Link from 'next/link';
import styles from './ClientSpace.module.css';
type Saved={customerId:string;created:boolean;invitationSent:boolean};
export function AdminCreateCustomer({initialRut='',onCreated,onCancel}:{initialRut?:string;onCreated:(id:string,rut:string)=>void|Promise<void>;onCancel:()=>void}){
 const[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState<Saved|null>(null);
 const lock=useRef(false);
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(lock.current)return;lock.current=true;setBusy(true);setError('');
  const f=new FormData(e.currentTarget),body=Object.fromEntries(['firstName','lastName','rut','email','whatsapp'].map(k=>[k,String(f.get(k)||'')]));
  try{const r=await fetch('/api/admin/clientes/crear',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,privacyAccepted:f.get('privacyAccepted')==='on'}),signal:AbortSignal.timeout(20000)});const b=await r.json();if(!r.ok)throw Error(b.error||'No pudimos guardar el cliente.');setSaved(b);await onCreated(b.customerId,body.rut);}
  catch(e){setError((e as Error).message);}finally{lock.current=false;setBusy(false);}
 }
 async function invite(){
  if(lock.current||!saved)return;lock.current=true;setBusy(true);setError('');
  try{const r=await fetch(`/api/admin/clientes/${encodeURIComponent(saved.customerId)}/invitacion`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(15000)});const b=await r.json();if(!r.ok)throw Error(b.error);setSaved({...saved,invitationSent:true});}
  catch(e){setError((e as Error).message);}finally{lock.current=false;setBusy(false);}
 }
 return <section className={`${styles.panel} ${styles.section}`}><h2>Crear cliente</h2>
 {saved?<><p role="status">{saved.created?'Ficha guardada en categoría Start.':'El RUT ya estaba registrado. Se conservó su ficha.'}</p>
 {saved.created&&<p className={styles.small}>{saved.invitationSent?'Enlace de acceso enviado.':'La ficha está guardada. No se pudo confirmar el envío del enlace.'}</p>}
 {saved.created&&!saved.invitationSent&&<button className={styles.button} type="button" disabled={busy} onClick={()=>void invite()}>Reenviar enlace de acceso</button>}
 <Link className={styles.button} href={`/admin/clientes/${encodeURIComponent(saved.customerId)}`}>Ver ficha</Link></>:
 <form className={styles.form} onSubmit={submit} aria-label="Crear cliente">
 <p className={styles.small}>Los contactos pueden quedar pendientes. El cliente recibe un enlace para crear su contraseña.</p>
 {([['rut','RUT','text',20],['firstName','Nombre','text',80],['lastName','Apellido','text',80],['email','Correo electrónico','email',254],['whatsapp','WhatsApp','tel',24]] as const).map(([name,label,type,maxLength])=><label className={styles.field} key={name}>{label}<input className={styles.input} name={name} type={type} maxLength={maxLength} defaultValue={name==='rut'?initialRut:undefined} required disabled={busy}/></label>)}
 <label><input type="checkbox" name="privacyAccepted" required disabled={busy}/> El cliente autorizó el registro de sus datos.</label>
 <button className={`${styles.button} ${styles.primary}`} disabled={busy}>{busy?'Guardando…':'Guardar cliente'}</button></form>}
 {error&&<p role="alert" className={styles.error}>{error}</p>}<button type="button" className={styles.button} disabled={busy} onClick={onCancel}>Cerrar</button></section>;
}
