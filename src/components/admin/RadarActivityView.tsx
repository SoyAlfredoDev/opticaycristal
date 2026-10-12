"use client";
import {useEffect,useState} from "react";
import type {Activity} from "@/lib/radar/types";
import styles from "./RadarPanel.module.css";
export function RadarActivityView(){
 const [items,setItems]=useState<Array<Activity&{companyName:string}>>([]),[error,setError]=useState(""),[loading,setLoading]=useState(true);
 useEffect(()=>{const controller=new AbortController();fetch("/api/admin/radar/activities",{cache:"no-store",signal:controller.signal}).then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error||"No se pudo leer el historial.");setItems(data.activities)}).catch(error=>{if(!controller.signal.aborted)setError(error instanceof Error?error.message:"No se pudo leer el historial.")}).finally(()=>{if(!controller.signal.aborted)setLoading(false)});return()=>controller.abort()},[]);
 return <section aria-busy={loading}>{error&&<p className={styles.alert} role="alert">{error}</p>}{loading?<p role="status">Cargando actividades…</p>:<><p className={styles.muted}>Últimas 100 actividades registradas en el radar.</p><ul className={styles.activityList}>{items.map(item=><li key={item.id}><strong>{item.companyName}</strong><time>{new Date(item.createdAt).toLocaleString("es-CL")}</time><p><b>{item.kind}</b> · {item.note}</p></li>)}</ul>{!items.length&&!error&&<p>Aún no hay actividades registradas. Puedes registrar una desde la ficha de un prospecto.</p>}</>}</section>;
}
