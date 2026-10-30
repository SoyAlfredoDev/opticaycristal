"use client";
import { useState,type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { CustomerSale } from "@/lib/clients/sales-types";
import { salesAction } from "./sales-client";
import styles from "./ClientSpace.module.css";
export function SaleControls({sale}:{sale:CustomerSale}){
 const router=useRouter();const [busy,setBusy]=useState(false),[error,setError]=useState(""),[mode,setMode]=useState(""),[target,setTarget]=useState("");
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError("");const reason=new FormData(e.currentTarget).get("reason");try{await salesAction({action:mode,saleId:sale.id,paymentId:target,reason});setMode("");router.refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 if(sale.status==="cancelled")return null;
 return <details className={`${styles.panel} ${styles.section}`}><summary>Firma y correcciones</summary>{error&&<p role="alert" className={styles.error}>{error}</p>}<div className={`${styles.actions} ${styles.section}`}>{sale.credit>0&&!sale.signedAt&&<button className={styles.button} onClick={()=>setMode("sign")}>Confirmar firma presencial</button>}<button className={styles.button} onClick={()=>setMode("cancel")}>Anular venta</button>{sale.payments.filter(p=>!p.reversed).map(p=><button key={p.id} className={styles.button} onClick={()=>{setMode("reverse");setTarget(p.id);}}>Revertir pago del {p.paidOn.split("-").reverse().join("/")}</button>)}</div>{mode&&<form className={`${styles.form} ${styles.section}`} onSubmit={submit}>{mode==="sign"?<label className={styles.check}><input type="checkbox" required/>Confirmo que el cliente firmó presencialmente.</label>:<label className={styles.field}>Motivo<input className={styles.input} name="reason" required maxLength={240}/></label>}{mode==="cancel"&&<p className={styles.small}>Se conserva la venta. La devolución del pie se coordina por separado.</p>}<div className={styles.actions}><button className={styles.button} disabled={busy}>{busy?"Guardando…":"Confirmar"}</button><button className={styles.button} type="button" disabled={busy} onClick={()=>setMode("")}>Volver</button></div></form>}</details>;
}
