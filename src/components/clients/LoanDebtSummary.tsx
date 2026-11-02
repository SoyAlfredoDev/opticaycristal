"use client";
import { useState } from "react";
import { clp } from "@/lib/clients/types";
import styles from "./ClientSpace.module.css";
type Balance={principalDue:number;due:number;totalDue:number;asOf:string};
export function LoanDebtSummary({saleId}:{saleId:string}){
 const[data,setData]=useState<Balance|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function consult(){setBusy(true);setError("");try{const response=await fetch(`/api/clientes/compras/${encodeURIComponent(saleId)}/saldo`,{cache:"no-store"});if(!response.ok)throw new Error();setData(await response.json());}catch{setError("No pudimos consultar el saldo. Inténtalo nuevamente.");}finally{setBusy(false);}}
 return <div className={styles.section}><button type="button" className={styles.textLink} onClick={consult} disabled={busy}>{busy?"Consultando…":data?"Actualizar saldo total":"Consultar saldo total"}</button>{error&&<p role="alert">{error}</p>}{data&&<div className={styles.reviewBox}><div className={styles.line}><span>Capital pendiente</span><strong>{clp(data.principalDue)}</strong></div><div className={styles.line}><span>Mora al {data.asOf.split("-").reverse().join("/")}</span><strong>{clp(data.due)}</strong></div><div className={styles.line}><span>Total a esa fecha</span><strong>{clp(data.totalDue)}</strong></div></div>}</div>;
}
