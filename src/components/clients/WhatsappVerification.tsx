"use client";
import {useEffect,useRef,useState} from "react";
import {CheckCircle2,LoaderCircle} from "lucide-react";
import styles from "./ClientSpace.module.css";
type Pending={url:string;expiresAt:number};
export function WhatsappVerification({verified,available=false,onVerified}:{available?:boolean;verified:boolean;onVerified?:()=>void|Promise<void>}){
 const [pending,setPending]=useState<Pending|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(""),[confirmed,setConfirmed]=useState(verified),[retrySeconds,setRetrySeconds]=useState(0);
 const callback=useRef(onVerified),starting=useRef(false);
 useEffect(()=>{callback.current=onVerified;},[onVerified]);
 useEffect(()=>{if(retrySeconds<=0)return;const timer=setTimeout(()=>setRetrySeconds(n=>Math.max(0,n-1)),1000);return()=>clearTimeout(timer);},[retrySeconds]);
 useEffect(()=>{
  if(!pending||!available||verified)return;
  let stopped=false,checking=false,attempts=0,nextAllowed=0,timer:ReturnType<typeof setTimeout>;
  const controller=new AbortController();
  const schedule=()=>{if(!stopped)timer=setTimeout(()=>void check(),attempts<2?5000:attempts<5?10000:20000);};
  const check=async()=>{
   clearTimeout(timer);
   if(stopped||checking)return;
   if(Date.now()>=pending.expiresAt){setPending(null);setError("El código venció. Puedes generar otro.");return;}
   if(document.visibilityState==="hidden"||Date.now()<nextAllowed){schedule();return;}
   checking=true;nextAllowed=Date.now()+5000;attempts++;
   try{
    const response=await fetch("/api/clientes/whatsapp",{cache:"no-store",signal:AbortSignal.any([controller.signal,AbortSignal.timeout(10000)])});
    if(stopped)return;
    if(response.status===429){nextAllowed=Date.now()+retryDelay(response)*1000;return;}
    if(response.status===401){setPending(null);setError("Inicia sesión nuevamente para continuar.");return;}
    if(!response.ok)return;
    const data=await response.json();
    if(stopped)return;
    if(data.verified===true){setConfirmed(true);setPending(null);void callback.current?.();return;}
    if(data.available===false){setPending(null);setError("No podemos verificar tu WhatsApp en este momento. Inténtalo más tarde.");}
   }catch{/* A connection failure never verifies the number. */}
   finally{checking=false;schedule();}
  };
  schedule();
  document.addEventListener("visibilitychange",check);window.addEventListener("focus",check);
  return()=>{stopped=true;clearTimeout(timer);controller.abort();document.removeEventListener("visibilitychange",check);window.removeEventListener("focus",check);};
 },[pending,available,verified]);
 async function start(){
  if(starting.current||retrySeconds>0)return;
  starting.current=true;setBusy(true);setError("");
  try{
   const response=await fetch("/api/clientes/whatsapp",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}",signal:AbortSignal.timeout(15000)});
   const data=await response.json();
   if(response.status===429)setRetrySeconds(retryDelay(response));
   if(!response.ok)throw Error(data.error||"No pudimos iniciar la verificación.");
   if(data.verified){setConfirmed(true);void callback.current?.();return;}
   if(typeof data.url!=="string"||!/^https:\/\/wa\.me\/56922452080\?text=OC-VERIFICAR%20[A-F0-9]{32}$/.test(data.url))throw Error("No pudimos preparar el enlace.");
   const expiration=Date.parse(data.expiresAt);
   if(!Number.isFinite(expiration)||expiration<=Date.now())throw Error("El código venció. Inténtalo nuevamente.");
   setPending({url:data.url,expiresAt:expiration});
  }catch(e){setError(e instanceof Error?e.message:"Revisa tu conexión.");}
  finally{starting.current=false;setBusy(false);}
 }
 if(verified)return null;
 if(confirmed)return <span className={`${styles.pill} ${styles.verified}`}><CheckCircle2 size={16} aria-hidden="true"/> WhatsApp verificado</span>;
 return <div>{!available?<p className={`${styles.small} ${styles.muted}`}>No podemos verificar tu WhatsApp en este momento. Inténtalo más tarde.</p>:pending?<><p className={styles.small}>Envía el mensaje preparado desde tu número registrado. Vence en 10 minutos; abrir WhatsApp no basta.</p><a className={`${styles.button} ${styles.primary}`} href={pending.url} target="_blank" rel="noopener noreferrer">Abrir WhatsApp y enviar</a><p className={styles.small} role="status"><LoaderCircle size={16} className="motion-safe:animate-spin" aria-hidden="true"/> Esperando tu mensaje…</p></>:<button type="button" className={styles.button} disabled={busy||retrySeconds>0} onClick={()=>void start()}>{busy?"Preparando…":retrySeconds>0?`Inténtalo en ${retrySeconds} s`:"Verificar por WhatsApp"}</button>}{error&&<p role="alert" className={styles.error}>{error}</p>}</div>;
}
function retryDelay(response:Response){const seconds=Number(response.headers?.get("retry-after"));return Number.isFinite(seconds)&&seconds>0?Math.min(86400,Math.ceil(seconds)):60;}
