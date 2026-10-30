"use client";
import { useState,type FormEvent } from "react";
import type { SaleProduct } from "@/lib/clients/sales-types";
import { clp } from "@/lib/clients/types";
import { salesAction } from "./sales-client";
import styles from "./ClientSpace.module.css";
export function ProductEditor({products,onSaved}:{products:SaleProduct[];onSaved:(products:SaleProduct[])=>void}){
 const [id,setId]=useState(""),[name,setName]=useState(""),[cost,setCost]=useState(""),[review,setReview]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
 const current=products.find(p=>p.id===id);
 function select(value:string){const p=products.find(x=>x.id===value);setId(value);setName(p?.name??"");setCost(p?String(p.protectedCost):"");setReview(false);setMessage("");}
 async function submit(e:FormEvent){e.preventDefault();if(!review){setReview(true);return;}setBusy(true);setError("");try{await salesAction({action:"product",id:id||undefined,name,protectedCost:Number(cost)});const r=await fetch("/api/admin/clientes/ventas",{cache:"no-store"});const result=await r.json();if(!r.ok)throw new Error(result.error);onSaved(result.products);select("");setMessage("Producto guardado.");}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <details className={`${styles.panel} ${styles.section}`}><summary>Productos y costos</summary><form className={`${styles.form} ${styles.section}`} onSubmit={submit}><label className={styles.field}>Producto a editar<select className={styles.input} value={id} onChange={e=>select(e.target.value)} disabled={busy}><option value="">Crear producto nuevo</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label className={styles.field}>Nombre del producto<input className={styles.input} value={name} onChange={e=>{setName(e.target.value);setReview(false);}} required minLength={2} maxLength={120} disabled={busy}/></label><label className={styles.field}>Costo protegido por unidad<input className={styles.input} type="number" min={1} max={1000000000} value={cost} onChange={e=>{setCost(e.target.value);setReview(false);}} required disabled={busy}/></label>{review&&<p>{current?`${current.name} · ${clp(current.protectedCost)} → `:"Nuevo producto: "}{name} · {clp(Number(cost))}</p>}{error&&<p role="alert" className={styles.error}>{error}</p>}{message&&<p role="status">{message}</p>}<button className={styles.button} disabled={busy}>{busy?"Guardando…":review?"Confirmar producto":"Revisar cambio"}</button></form></details>;
}
