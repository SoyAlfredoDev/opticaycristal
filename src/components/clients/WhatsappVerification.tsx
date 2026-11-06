"use client";
import {useEffect,useRef,useState} from 'react';
import {CheckCircle2,LoaderCircle} from 'lucide-react';
import styles from './ClientSpace.module.css';
type Pending={requestId:string;expiresAt:string;resendAfterSeconds:number};
function readPending(data:Partial<Pending>):Pending{
 if(typeof data.requestId!=='string'||!/^[a-f0-9-]{36}$/i.test(data.requestId)||typeof data.expiresAt!=='string'||!Number.isFinite(Date.parse(data.expiresAt))||Date.parse(data.expiresAt)<=Date.now())throw Error('El código venció. Solicita uno nuevo.');
 return{requestId:data.requestId,expiresAt:data.expiresAt,resendAfterSeconds:Math.max(0,Math.min(86400,Number(data.resendAfterSeconds)||0))};
}
function retryDelay(response:Response){const n=Number(response.headers?.get('retry-after'));return Number.isFinite(n)&&n>0?Math.min(86400,Math.ceil(n)):60;}
export function WhatsappVerification({verified,available=false,onVerified}:{available?:boolean;verified:boolean;onVerified?:()=>void|Promise<void>}){
 const [pending,setPending]=useState<Pending|null>(null),[code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[confirmed,setConfirmed]=useState(false),[sendWait,setSendWait]=useState(0),[confirmWait,setConfirmWait]=useState(0),[restoring,setRestoring]=useState(available&&!verified);
 const locked=useRef(false),revision=useRef(0),callback=useRef(onVerified);
 useEffect(()=>{callback.current=onVerified;},[onVerified]);
 function complete(){setConfirmed(true);setPending(null);setCode('');void Promise.resolve(callback.current?.()).catch(()=>{});}
 useEffect(()=>{
  if(!available||verified)return;
  let stopped=false;const controller=new AbortController(),version=revision.current;
  void(async()=>{try{
   const response=await fetch('/api/clientes/whatsapp',{cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(10000)])});
   const data=await response.json();if(stopped||version!==revision.current)return;
   if(!response.ok){if(response.status===429)setSendWait(retryDelay(response));return;}
   if(data.verified===true){setConfirmed(true);return;}
   if(data.pending){const p=readPending(data.pending);setPending(p);setSendWait(p.resendAfterSeconds);}
  }catch{/* A failed status request never confirms the phone. */}
  finally{if(!stopped)setRestoring(false);}})();
  return()=>{stopped=true;controller.abort();};
 },[available,verified]);
 useEffect(()=>{if(sendWait<=0&&confirmWait<=0)return;const timer=setTimeout(()=>{setSendWait(n=>Math.max(0,n-1));setConfirmWait(n=>Math.max(0,n-1));},1000);return()=>clearTimeout(timer);},[sendWait,confirmWait]);
 useEffect(()=>{if(!pending)return;const timer=setTimeout(()=>{setPending(null);setCode('');setError('El código venció. Solicita uno nuevo.');},Math.max(0,Date.parse(pending.expiresAt)-Date.now()));return()=>clearTimeout(timer);},[pending]);
 async function start(){
  if(locked.current||sendWait>0)return;locked.current=true;revision.current++;setBusy(true);setError('');setCode('');setPending(null);
  try{
   const response=await fetch('/api/clientes/whatsapp',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(15000)});
   const data=await response.json();if(response.headers?.has('retry-after'))setSendWait(retryDelay(response));
   if(!response.ok)throw Error(data.error||'No pudimos enviar el código.');
   if(data.verified===true){complete();return;}
   const p=readPending(data);setPending(p);setSendWait(p.resendAfterSeconds);
  }catch(e){setError(e instanceof Error?e.message:'Revisa tu conexión.');}
  finally{locked.current=false;setBusy(false);}
 }
 async function confirm(event:React.FormEvent){
  event.preventDefault();if(locked.current||!pending||confirmWait>0)return;
  if(!/^[A-Za-z0-9]{4}$/.test(code.trim())){setError('Ingresa los cuatro caracteres del código.');return;}
  locked.current=true;revision.current++;setBusy(true);setError('');
  try{
   const response=await fetch('/api/clientes/whatsapp/confirmar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId:pending.requestId,code:code.trim()}),signal:AbortSignal.timeout(10000)});
   const data=await response.json();if(response.status===429)setConfirmWait(retryDelay(response));
   if(!response.ok||data.verified!==true)throw Error(data.error||'No pudimos validar el código.');
   complete();
  }catch(e){setError(e instanceof Error?e.message:'Revisa tu conexión.');}
  finally{locked.current=false;setBusy(false);}
 }
 if(verified)return null;
 if(confirmed)return <span className={`${styles.pill} ${styles.verified}`}><CheckCircle2 size={16} aria-hidden="true"/> WhatsApp verificado</span>;
 if(!available)return <p className={`${styles.small} ${styles.muted}`}>La verificación por WhatsApp no está disponible en este momento.</p>;
 return <div aria-busy={busy||restoring}>
  {restoring?<p className={styles.small} role="status"><LoaderCircle size={16} className="motion-safe:animate-spin" aria-hidden="true"/> Consultando verificación…</p>:<>
   {pending&&<form onSubmit={confirm} className={styles.form}>
    <p className={styles.small} role="status">Ingresa el código enviado a tu WhatsApp. Vence en 5 minutos.</p>
    <label className={styles.field}>Código de 4 caracteres
     <input className={styles.input} type="text" inputMode="text" autoComplete="one-time-code" autoCapitalize="characters" spellCheck={false} maxLength={4} pattern="[A-Za-z0-9]{4}" required value={code} onChange={e=>setCode(e.target.value)} placeholder="A7K2" aria-describedby="whatsapp-code-help"/>
    </label>
    <span id="whatsapp-code-help" className={`${styles.small} ${styles.muted}`}>Puedes usar mayúsculas o minúsculas.</span>
    <button className={`${styles.button} ${styles.primary}`} disabled={busy||confirmWait>0} type="submit">{busy?'Validando…':confirmWait>0?`Validar en ${confirmWait} s`:'Validar código'}</button>
   </form>}
   <button type="button" className={styles.button} disabled={busy||sendWait>0} onClick={()=>void start()}>{busy&&!pending?'Enviando…':sendWait>0?`Reenviar en ${sendWait} s`:pending?'Enviar otro código':'Enviar código por WhatsApp'}</button>
  </>}
  {error&&<p role="alert" className={styles.error}>{error}</p>}
 </div>;
}
