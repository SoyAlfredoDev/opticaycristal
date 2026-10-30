"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Calculator, X } from "lucide-react";
import type { SimulationConditions } from "@/lib/clients/purchase-simulation";
import styles from "./PurchaseSimulatorModal.module.css";
const Simulator=dynamic(()=>import("./PurchaseSimulator").then(module=>module.PurchaseSimulator),{loading:()=> <p className={styles.loading} role="status">Preparando simulador…</p>});
export function PurchaseSimulatorModal(conditions:SimulationConditions){
 const [open,setOpen]=useState(false),dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const element=dialog.current;if(!open){if(element?.open)element.close();return;}const previous=document.body.style.overflow;document.body.style.overflow="hidden";if(!element?.open)element?.showModal();return()=>{document.body.style.overflow=previous;};},[open]);
 function close(){setOpen(false);}
 return <div className={styles.access}>
  <button type="button" className={styles.trigger} aria-haspopup="dialog" aria-expanded={open} aria-controls="purchase-simulator-modal" onClick={()=>setOpen(true)}><Calculator size={19} aria-hidden="true"/>Simular mi compra</button>
  <dialog ref={dialog} id="purchase-simulator-modal" className={styles.modal} aria-labelledby="purchase-simulator-modal-title" onCancel={event=>{event.preventDefault();close();}} onClose={close} onClick={event=>{if(event.target!==event.currentTarget)return;const bounds=event.currentTarget.getBoundingClientRect();if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)close();}}>
   {open&&<><header className={styles.header}><div><span>CRÉDITO DIRECTO</span><h2 id="purchase-simulator-modal-title">Simula tu compra</h2><p>Ingresa el precio total de tus lentes, con IVA incluido.</p></div><button type="button" className={styles.close} aria-label="Cerrar simulador" autoFocus onClick={close}><X size={22} aria-hidden="true"/></button></header><Simulator {...conditions} embedded/></>}
  </dialog>
 </div>;
}
