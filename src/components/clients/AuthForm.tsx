"use client";
import { BRAND_SLOGAN, BRAND_SLOGAN_LINES } from "@/lib/brand";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { requestedSupportTicket } from "@/lib/clients/support-types";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowRight, ShieldCheck } from "lucide-react";
import styles from "./ClientSpace.module.css";
import { AuthBenefits } from "./AuthBenefits";
import { RegistrationWelcome } from "./RegistrationWelcome";
import type { RegistrationWelcome as WelcomeDetails } from "@/lib/clients/types";
export type AuthMode = "register" | "login" | "forgot" | "reset";
export function AuthForm({ mode, token, supportTicketId, openAdvisor }: { mode: AuthMode; token?: string; supportTicketId?:string; openAdvisor?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false), [showPassword, setShowPassword] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState("");
  const registration = mode === "register";
  const [welcome,setWelcome]=useState<WelcomeDetails|null>(null),[welcomeName,setWelcomeName]=useState("");
  const titles = { register: "Crea tu espacio", login: BRAND_SLOGAN, forgot: "Recupera tu acceso", reset: "Tu nueva contraseña" };
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();setError("");setMessage("");setBusy(true);
    const f = new FormData(e.currentTarget), password = String(f.get("password") || "");
    if ((registration || mode === "reset") && password !== f.get("confirmation")) { setError("Las contraseñas no coinciden.");setBusy(false);return; }
    const email = String(f.get("email") || "").trim().toLowerCase();
    const endpoint = registration ? "/api/clientes/registro" : `/api/clientes/auth/${mode === "login" ? "sign-in/email" : mode === "forgot" ? "request-password-reset" : "reset-password"}`;
    const body = registration ? { firstName: f.get("firstName"), lastName: f.get("lastName"), rut: f.get("rut"), whatsapp: f.get("whatsapp"), email, password, privacyAccepted: f.get("privacyAccepted") === "on" } : mode === "login" ? { email, password } : mode === "forgot" ? { email, redirectTo: `${window.location.origin}/mi-cuenta/restablecer` } : { newPassword: password, token };
    try {
      const response = await fetch(endpoint, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json().catch(() => null);
      if (!response.ok) { setError(response.status === 429 ? "Demasiados intentos. Espera antes de volver a intentar." : mode === "login" ? (response.status === 401 ? "Correo o contraseña incorrectos. Si lo necesitas, recupera tu acceso." : "No pudimos iniciar sesión en este momento. Recarga la página e inténtalo nuevamente.") : registration ? data?.error || "No pudimos completar el registro." : mode === "reset" ? "Este enlace no es válido o ya venció. Solicita otro." : "No pudimos procesar la solicitud. Inténtalo más tarde."); return; }
      if (mode === "login") { router.replace(openAdvisor ? "/mi-cuenta/asesor-de-monturas" : requestedSupportTicket(supportTicketId)?`/mi-cuenta/soporte?ticket=${requestedSupportTicket(supportTicketId)}`:"/mi-cuenta");router.refresh(); }
      else if (registration && openAdvisor) {
        const login = await fetch("/api/clientes/auth/sign-in/email", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }).catch(() => null);
        router.replace(login?.ok ? "/mi-cuenta/asesor-de-monturas" : "/mi-cuenta/ingresar?destino=asesor");
        router.refresh();
      }
      else if (registration) { setWelcomeName(String(f.get("firstName")||"").trim());setWelcome(data.welcome || null);setMessage(data.message); }
      else if (mode === "forgot") setMessage("Si existe una cuenta con ese correo, recibirás un enlace para recuperar tu contraseña. Revisa también spam.");
      else { window.history.replaceState(null, "", "/mi-cuenta/restablecer");setMessage("Tu contraseña se actualizó. Inicia sesión con la nueva contraseña."); }
    } catch { setError("No pudimos conectar. Revisa tu conexión e inténtalo nuevamente."); }
    finally { setBusy(false); }
  }
  const done = Boolean(message) && mode !== "forgot";
  return <div className={styles.auth}>{registration||mode==="login"?<AuthBenefits/>:<section className={styles.welcome} aria-label="Mi espacio de Óptica y Cristal"><span className={styles.pill}>Óptica &amp; Cristal</span><h2>{BRAND_SLOGAN}</h2><p>Tus datos, tus compras y tu financiamiento, en un mismo lugar.</p><p className={styles.small}>Sin depender de tu empleador.<br />Compra y contratación en la óptica.</p></section>}<section className={styles.authForm}>{registration && done ? <RegistrationWelcome welcome={welcome} firstName={welcomeName}/> : <><span className={styles.pill}>{registration ? "Comienza en Start" : "Mi espacio"}</span><div className={styles.authAssurance}><ShieldCheck size={15} aria-hidden="true" /><span>Tu cuenta personal en Óptica &amp; Cristal</span></div>{mode === "login" ? <h1 className={styles.loginTitle}><span>{BRAND_SLOGAN_LINES[0]}</span>{" "}<em>{BRAND_SLOGAN_LINES[1]}</em></h1> : <h1 style={{ marginTop: 16 }}>{titles[mode]}</h1>}{mode !== "login" && <p className={styles.muted}>{registration ? "Regístrate y verifica tus datos para acceder al programa de clientes." : mode === "forgot" ? "Te enviaremos un enlace a tu correo electrónico." : "Elige una contraseña exclusiva para tu cuenta."}</p>}{error && <p role="alert" className={styles.error}>{error}</p>}{message && <p role="status" className={styles.success}>{message}</p>}{mode === "reset" && !token && !message ? <p className={styles.error}>Falta el enlace de recuperación. <Link href="/mi-cuenta/recuperar" className={styles.textLink}>Solicita uno nuevo.</Link></p> : !done && <form className={styles.form} onSubmit={submit}>{registration && <><div className={styles.twoFields}><label className={styles.field}>Nombre<input className={styles.input} autoComplete="given-name" name="firstName" required minLength={2} maxLength={80} /></label><label className={styles.field}>Apellido<input className={styles.input} autoComplete="family-name" name="lastName" required minLength={2} maxLength={80} /></label></div><label className={styles.field}>RUT<input className={styles.input} name="rut" autoComplete="off" placeholder="12.345.678-5" required maxLength={14} spellCheck={false} /></label><label className={styles.field}>WhatsApp<input className={styles.input} type="tel" name="whatsapp" autoComplete="tel" placeholder="+56 9 1234 5678" required maxLength={25} /><span className={styles.small}>Podrás verificarlo desde Perfil cuando la opción esté habilitada.</span></label></>}{mode !== "reset" && <label className={styles.field}>Correo electrónico<input className={styles.input} type="email" name="email" autoComplete="email" maxLength={254} autoCapitalize="none" spellCheck={false} required /></label>}{mode !== "forgot" && <><label className={styles.field}>Contraseña<div className={styles.password}><input className={styles.input} name="password" type={showPassword ? "text" : "password"} required minLength={mode === "login" ? 1 : 8} maxLength={128} autoComplete={mode === "login" ? "current-password" : "new-password"} /><button type="button" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={showPassword} onClick={() => setShowPassword(v => !v)}>{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button></div>{mode !== "login" && <span className={styles.small}>Mínimo 8 caracteres.</span>}</label>{(registration || mode === "reset") && <label className={styles.field}>Repite la contraseña<input className={styles.input} type="password" name="confirmation" required minLength={8} maxLength={128} autoComplete="new-password" /></label>}</>}{registration && <label className={styles.check}><input type="checkbox" name="privacyAccepted" required /><span>Acepto el tratamiento de mis datos para crear y gestionar mi cuenta, según la <Link className={styles.textLink} href="/mi-cuenta/privacidad" target="_blank" rel="noopener noreferrer">información de privacidad</Link>. No incluye autorización para publicidad.</span></label>}{mode === "login" && <Link className={styles.textLink} href="/mi-cuenta/recuperar">Olvidé mi contraseña</Link>}<button className={`${styles.button} ${styles.primary} ${styles.wide}`} disabled={busy}>{busy ? "Procesando…" : registration ? "Crear mi cuenta" : mode === "login" ? "Entrar a mi espacio" : mode === "forgot" ? "Enviar enlace de recuperación" : "Guardar nueva contraseña"}<ArrowRight size={17} aria-hidden="true" /></button></form>}<div className={styles.authFoot}>{mode === "login" ? <p>¿Tu primera vez aquí? <Link className={styles.textLink} href={openAdvisor ? "/mi-cuenta/registro?destino=asesor" : "/mi-cuenta/registro"}>Crear mi cuenta</Link></p> : <Link className={styles.textLink} href={openAdvisor ? "/mi-cuenta/ingresar?destino=asesor" : "/mi-cuenta/ingresar"}>Ir al acceso de clientes</Link>}{registration && <p style={{ marginTop: 18 }}>La cédula se revisará presencialmente, sin guardar copia. Para usar el financiamiento se debe verificar el correo.</p>}</div></>}</section></div>;
}
