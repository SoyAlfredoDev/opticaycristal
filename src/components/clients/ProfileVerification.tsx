"use client";
import { useState } from "react";
import type { CustomerProfile } from "@/lib/clients/types";
import {WhatsappVerification} from "./WhatsappVerification";
import styles from "./ClientSpace.module.css";
export function ProfileVerification({ customer,onWhatsappVerified }: { onWhatsappVerified?:()=>void|Promise<void>;customer: Pick<CustomerProfile, "email" | "emailVerified" | "whatsapp" | "whatsappVerified" | "whatsappVerificationAvailable"> }) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState("");
  async function resend() {
    setBusy(true);setMessage("");setError("");
    try { const response = await fetch("/api/clientes/auth/send-verification-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: customer.email, callbackURL: "/mi-cuenta/perfil" }) });if (!response.ok) { setError(response.status === 429 ? "Espera antes de solicitar otro correo." : "No pudimos confirmar el envío. Inténtalo más tarde.");return; }setMessage("Solicitud procesada. Revisa tu correo y la carpeta de spam para verificarlo."); }
    catch { setError("Revisa tu conexión e inténtalo nuevamente."); }finally { setBusy(false); }
  }
  return <section className={`${styles.panel} ${styles.section}`}><h2>Verificaciones de tu cuenta</h2><p className={`${styles.small} ${styles.muted}`}>Tu cuenta ya está creada. Para usar tu crédito, el correo debe estar verificado; WhatsApp es opcional por ahora.</p><div className={styles.verification}><div><strong>Correo electrónico</strong><p>{customer.email}</p><span className={`${styles.pill} ${customer.emailVerified ? styles.verified : styles.pending}`}>{customer.emailVerified ? "Verificado" : "Pendiente de verificación"}</span></div>{!customer.emailVerified && <button className={`${styles.button} ${styles.primary}`} onClick={resend} disabled={busy || Boolean(message)}>{busy ? "Enviando…" : "Enviar correo de verificación"}</button>}</div><div className={styles.verification}><div><strong>WhatsApp</strong><p>{customer.whatsapp}</p><span className={`${styles.pill} ${customer.whatsappVerified ? styles.verified : styles.pending}`}>{customer.whatsappVerified ? "Verificado" : "Pendiente"}</span></div><WhatsappVerification key={customer.whatsapp} available={customer.whatsappVerificationAvailable===true} verified={customer.whatsappVerified} onVerified={onWhatsappVerified}/></div>{message && <p className={styles.success} role="status">{message}</p>}{error && <p className={styles.error} role="alert">{error}</p>}</section>;
}
