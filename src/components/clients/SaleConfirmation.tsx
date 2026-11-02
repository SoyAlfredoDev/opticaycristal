"use client";
import Link from "next/link";
import {useEffect,useRef} from "react";
import {BadgeCheck,FileSignature,IdCard,TriangleAlert} from "lucide-react";
import {clp} from "@/lib/clients/types";
import styles from "./ClientSpace.module.css";
import wizard from "./AdminSales.module.css";
export function SaleConfirmation({open,busy,error,credit,payment,emailVerified,contractReady,onCancel,onConfirm}:{open:boolean;busy:boolean;error:string;credit:number;payment:number;emailVerified:boolean;contractReady:boolean;onCancel:()=>void;onConfirm:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const d=dialog.current;if(open&&!d?.open)d?.showModal();else if(!open&&d?.open)d.close();},[open]);
 return <dialog ref={dialog} className={wizard.confirmation} aria-labelledby="sale-confirmation-title" onCancel={e=>{e.preventDefault();if(!busy)onCancel();}} onClose={()=>{if(open&&!busy)onCancel();}}>{open&&<><h2 id="sale-confirmation-title">Antes de registrar</h2><ul className={wizard.reminders}><li><IdCard aria-hidden="true"/><span>Revisa la cédula del cliente, sin guardar copia.</span></li><li>{emailVerified?<BadgeCheck className={wizard.verified} aria-hidden="true"/>:<TriangleAlert className={wizard.warning} aria-hidden="true"/>}<span>{emailVerified?"Correo del cliente verificado.":"Correo pendiente: debes verificarlo para otorgar crédito."}</span></li>{credit>0&&<li><FileSignature aria-hidden="true"/><span>Descarga el compromiso después de registrar y solicita la firma presencial del cliente.</span></li>}</ul>{credit>0&&!contractReady&&<p className={styles.error}>Falta configurar la firma del representante. <Link href="/admin/clientes/compromisos">Configurar compromiso</Link>.</p>}<p className={wizard.paymentNotice}>Al confirmar, declaras que revisaste la identidad y las condiciones de la venta y recibiste <strong>{clp(payment)}</strong> {credit>0?"de pie":"al contado"}.</p>{error&&<p className={styles.error} role="alert">{error}</p>}<div className={wizard.actions}><button type="button" className={styles.button} autoFocus disabled={busy} onClick={onCancel}>Cancelar</button><button type="button" className={`${styles.button} ${styles.primary}`} disabled={busy||(credit>0&&(!emailVerified||!contractReady))} onClick={onConfirm}>{busy?"Registrando…":"Confirmar venta"}</button></div></>}</dialog>;
}
