"use client";
import { useState, type FormEvent } from "react";
import { DIGITAL_AGREEMENT_TERMS } from "@/lib/clients/digital-agreement-copy";
import styles from "./ClientSpace.module.css";

export function DigitalAgreementApproval({ saleId }: { saleId: string }) {
 const [busy, setBusy] = useState(false);
 const [message, setMessage] = useState("");
 async function authorize(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  setBusy(true);
  setMessage("");
  try {
   const response = await fetch(`/api/admin/clientes/ventas/${encodeURIComponent(saleId)}/firma-digital`, {
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({limit:Number(data.get("limit")),reference:data.get("reference"),accepted:data.has("accepted")}),
   });
   if (!response.ok) throw new Error((await response.json()).error);
   setMessage("Firma habilitada por hoy. El cliente puede abrir el compromiso desde Compras en Mi cuenta.");
  } catch (error) {
   setMessage(error instanceof Error ? error.message : "No se pudo habilitar la firma.");
  } finally { setBusy(false); }
 }
 return <details className={`${styles.panel} ${styles.section}`}>
  <summary>Habilitar firma digital</summary>
  <form className={styles.form} onSubmit={authorize}>
   <p>{DIGITAL_AGREEMENT_TERMS}</p>
   <a className={styles.textLink} href={`/api/admin/clientes/ventas/${encodeURIComponent(saleId)}/compromiso/pdf`}>Revisar PDF antes de aceptar</a>
   <label className={styles.field}>Máximo legal anual vigente (%)<input className={styles.input} name="limit" type="number" min="0.01" max="100" step="0.01" required /></label>
   <label className={styles.field}>Fuente y fecha de la verificación<input className={styles.input} name="reference" minLength={3} maxLength={500} required /></label>
   <label className={styles.check}><input type="checkbox" name="accepted" required /> Como representante, acepto este compromiso y confirmo que verifiqué el máximo legal.</label>
   <button className={styles.button} disabled={busy}>Aceptar y habilitar firma</button>
   {message && <p role="status">{message}</p>}
  </form>
 </details>;
}
