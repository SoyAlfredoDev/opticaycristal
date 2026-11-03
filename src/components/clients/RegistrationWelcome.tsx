"use client";
import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { FinancingExplanation } from "./FinancingExplanation";
import { ArrowRight, Sparkles } from "lucide-react";
import type { RegistrationWelcome as WelcomeDetails } from "@/lib/clients/types";
import { clp } from "@/lib/clients/types";
import styles from "./RegistrationWelcome.module.css";
const Celebration=dynamic(()=>import("./WelcomeCelebration"),{ssr:false});
export function RegistrationWelcome({welcome,firstName=""}:{welcome:WelcomeDetails|null;firstName?:string}){
 const heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{heading.current?.focus();},[]);
 return <div className={styles.welcome}>
  <Celebration/>
  <span className={styles.icon}><Sparkles size={29} aria-hidden="true"/></span>
  <h1 ref={heading} tabIndex={-1}>{firstName.trim()?`¡Gracias, ${firstName.trim()}, por sumarte!`:"¡Gracias por sumarte!"}</h1>
  <p className={styles.intro}>Tu mirada tiene un nuevo espacio en <strong className={styles.brand}>Óptica &amp; Cristal</strong>.</p>
  {welcome&&<div className={styles.credit} role="status"><span>Tu nivel es {welcome.tierName}</span><strong>Hasta el {welcome.maxPercent}%</strong><p>Tope del crédito: {clp(welcome.maxAmount)} · {welcome.maxInstallments} {welcome.maxInstallments===1?"cuota mensual":"cuotas mensuales"} · Siempre con pie.</p></div>}
  {welcome&&<FinancingExplanation tier={welcome} compact/>}
  <Link href="/mi-cuenta/ingresar" className={styles.action}>Ir a mi cuenta <ArrowRight size={18} aria-hidden="true"/></Link>
 </div>;
}
