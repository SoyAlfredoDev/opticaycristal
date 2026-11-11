"use client";
import { useState, type FormEvent } from "react";
import { DIGITAL_AGREEMENT_TERMS } from "@/lib/clients/digital-agreement-copy";
import styles from "./ClientSpace.module.css";

export function DigitalAgreementSigning({ saleId, signed, sent }: { saleId: string; signed: boolean; sent: boolean }) {
 const [status, setStatus] = useState({ signed, sent });
 const [requestId, setRequestId] = useState("");
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState("");
 const endpoint = `/api/clientes/compras/${encodeURIComponent(saleId)}/compromiso`;
 async function submit(action: string, data?: FormData) {
  setBusy(true);
  setError("");
  try {
   const response = await fetch(`${endpoint}/firma`, {
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ action, requestId, code:data?.get("code"), accepted:data?.has("accepted") }),
   });
   const result = await response.json();
   if (!response.ok) throw new Error(result.error || "Intenta nuevamente.");
   if (action === "request") setRequestId(result.requestId);
   else setStatus({ signed:result.signed, sent:result.sent });
  } catch (error) {
   setError(error instanceof Error ? error.message : "Intenta nuevamente.");
  } finally { setBusy(false); }
 }
 function confirm(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  void submit("sign", new FormData(event.currentTarget));
 }
 return <section className={`${styles.panel} ${styles.section}`} id="firma-compromiso" aria-label="Firma del compromiso">
  <h2>{status.signed ? "Compromiso firmado" : "Firma tu compromiso"}</h2>
  {status.signed ? <>
   <a className={styles.button} href={`${endpoint}/firmado`}>Descargar copia firmada</a>
   {status.sent ? <p role="status">Aviso enviado a tu correo.</p> :
    <p>Tu copia ya está disponible. <button className={styles.button} type="button" disabled={busy} onClick={() => void submit("copy")}>Reenviar aviso</button></p>}
  </> : <>
   <p>Revisa las condiciones y el calendario de cuotas antes de firmar.</p>
   <p className={styles.small}>{DIGITAL_AGREEMENT_TERMS}</p>
   <a className={styles.textLink} href={`${endpoint}/pdf`}>Descargar compromiso para revisión</a>
   {requestId && <form className={`${styles.form} ${styles.section}`} onSubmit={confirm}>
    <label className={styles.field}>Código de tu correo
     <input key={requestId} className={styles.input} name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required />
    </label>
    <label className={styles.check}><input type="checkbox" name="accepted" required /> Leí y acepto el compromiso y sus condiciones.</label>
    <button className={`${styles.button} ${styles.primary}`} disabled={busy}>Confirmar firma</button>
   </form>}
   <button className={`${styles.button} ${styles.section}`} type="button" disabled={busy} onClick={() => void submit("request")}>
    {requestId ? "Enviar otro código" : "Enviar código a mi correo"}
   </button>
  </>}
  {busy && <p role="status">Procesando…</p>}
  {error && <p role="alert">{error}</p>}
 </section>;
}
