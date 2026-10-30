"use client";
import { useRef,useState,type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { durableAction,SalesRequestError } from "./sales-client";
import { clp } from "@/lib/clients/types";
import styles from "./ClientSpace.module.css";
export function RecordPayment({saleId,remaining}:{saleId:string;remaining:number}){
 const router=useRouter(),pending=useRef<Record<string,unknown>|null>(null),inFlight=useRef(false);
 const [busy,setBusy]=useState(false),[locked,setLocked]=useState(false),[error,setError]=useState(""),[done,setDone]=useState(false),[review,setReview]=useState(false);
 const [amount,setAmount]=useState(""),[date,setDate]=useState(""),[reference,setReference]=useState("");
 async function submit(e:FormEvent){e.preventDefault();if(inFlight.current)return;if(!review){setReview(true);return;}inFlight.current=true;pending.current??={action:"payment",saleId,amount:Number(amount),paidOn:date,reference,requestKey:crypto.randomUUID()};setBusy(true);setLocked(true);setError("");try{await durableAction(pending.current);setDone(true);router.refresh();}catch(e){setError((e as Error).message);if(e instanceof SalesRequestError&&e.status<500){pending.current=null;setLocked(false);setReview(false);}}finally{inFlight.current=false;setBusy(false);}}
 if(done)return <p role="status">Pago registrado.</p>;
 return <form className={`${styles.form} ${styles.section}`} onSubmit={submit}><h3>Registrar pago</h3>{error&&<p role="alert" className={styles.error}>{error}</p>}<label className={styles.field}>Monto recibido<input className={styles.input} type="number" min={1} max={remaining} required value={amount} disabled={locked||busy} onChange={e=>{setAmount(e.target.value);setReview(false);}}/></label><label className={styles.field}>Fecha del pago<input className={styles.input} type="date" required value={date} disabled={locked||busy} onChange={e=>{setDate(e.target.value);setReview(false);}}/></label><label className={styles.field}>Referencia o comprobante<input className={styles.input} required maxLength={160} value={reference} disabled={locked||busy} onChange={e=>{setReference(e.target.value);setReview(false);}}/><span className={styles.small}>Visible para el cliente.</span></label>{review&&<div className={styles.reviewBox}><strong>{clp(Number(amount))}</strong><p>{date.split("-").reverse().join("/")} · {reference}</p></div>}<button className={styles.button} disabled={busy}>{busy?"Guardando…":locked?"Reintentar el mismo pago":review?"Confirmar pago":"Revisar pago"}</button></form>;
}
