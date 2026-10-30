"use client";
import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, MailCheck, Sparkles } from "lucide-react";
import type { RegistrationWelcome as WelcomeDetails } from "@/lib/clients/types";
import { clp } from "@/lib/clients/types";
import styles from "./RegistrationWelcome.module.css";
const Celebration=dynamic(()=>import("./WelcomeCelebration"),{ssr:false});
export function RegistrationWelcome({welcome}:{welcome:WelcomeDetails|null}){
 const heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{heading.current?.focus();},[]);
 return <div className={styles.welcome}>
  <Celebration/>
  <span className={styles.icon}><Sparkles size={29} aria-hidden="true"/></span>
  <h1 ref={heading} tabIndex={-1}>¡Gracias por sumarte!</h1>
  <p className={styles.intro}>Tu mirada tiene un nuevo espacio en Óptica &amp; Cristal.</p>
  {welcome&&<div className={styles.credit} role="status"><span>Cupo inicial · {welcome.tierName}</span><strong>Hasta {clp(welcome.maxAmount)}</strong><p>Hasta el {welcome.maxPercent}% de tu compra · {welcome.maxInstallments} {welcome.maxInstallments===1?"cuota mensual":"cuotas mensuales"} · Siempre con pie.</p></div>}
  <div className={styles.next}><MailCheck size={23} aria-hidden="true"/><p><strong>Revisa tu correo</strong><br/>Verifica tu cuenta para habilitar el financiamiento.</p></div>
  <Link href="/mi-cuenta/ingresar" className={styles.action}>Ir a mi cuenta <ArrowRight size={18} aria-hidden="true"/></Link>
  <p className={styles.note}>Si ya tenías cuenta, ingresa para consultar tu cupo actual.</p>
 </div>;
}
