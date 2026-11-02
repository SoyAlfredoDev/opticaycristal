"use client";
import { useEffect,useState } from "react";
import { useRouter } from "next/navigation";
import { durableAction,operationSlot,salesAction } from "./sales-client";
import { clp } from "@/lib/clients/types";
import styles from "./ClientSpace.module.css";
type Operation={kind:"create"|"payment";payload:Record<string,unknown>;resultId:string|null};
export function OperationRecovery({kind}:{kind:"create"|"payment"}){
 const router=useRouter();const [op,setOp]=useState<Operation|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false),[key,setKey]=useState("");
 useEffect(()=>{const saved=sessionStorage.getItem(operationSlot(kind));if(!saved)return;let active=true;
 salesAction({action:"recover",requestKey:saved}).then(r=>{if(!active)return;if(!r.operation){sessionStorage.removeItem(operationSlot(kind));setKey("");}else {setKey(saved);setOp(r.operation);}}).catch(()=>{if(active){setKey(saved);setError("No pudimos comprobar el registro. Reintenta.");}});return()=>{active=false;};},[kind]);
 async function resume(){setBusy(true);setError("");try{let current=op;if(!current){current=(await salesAction({action:"recover",requestKey:key})).operation;if(!current){sessionStorage.removeItem(operationSlot(kind));setKey("");return;}setOp(current);}
 const result=current.resultId?{id:current.resultId}:await durableAction(current.payload);sessionStorage.removeItem(operationSlot(kind));setKey("");setOp(null);if(current.kind==="create")router.push(`/admin/clientes/${current.payload.customerId}?venta=${result.id}`);router.refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 if(!key)return null;
 return <section className={`${styles.panel} ${styles.section}`} role="status"><strong>{op?.resultId?"El registro ya está guardado":"Hay un registro pendiente"}</strong>{op&&<p>{clp(Number(op.payload.total??op.payload.amount))} · {op.kind==="create"?"Venta":"Pago"}</p>}{op?.kind==="create"&&op.payload.unitProtectedCost!==undefined&&<p>Costo protegido por unidad: {clp(Number(op.payload.unitProtectedCost))}</p>}{error&&<p role="alert">{error}</p>}<button className={styles.button} onClick={resume} disabled={busy}>{busy?"Comprobando…":op?.resultId?"Ver registro":"Retomar registro"}</button></section>;
}
