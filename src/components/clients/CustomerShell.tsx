"use client";
import { BRAND_SLOGAN } from "@/lib/brand";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { House, Wallet, ShoppingBag, UserRound, LogOut, CircleHelp, MapPin } from "lucide-react";
import type { CustomerProfile } from "@/lib/clients/types";
import { useOptionalCustomerData } from "./CustomerDataProvider";
import { CustomerSyncStatus } from "./CustomerDataState";
import { clientLogo } from "./client-logo";
import { CustomerNotice } from "./CustomerNotice";
import { CustomerHelpChat } from "./CustomerHelpChat";
import styles from "./ClientSpace.module.css";
const links = [{ href: "/mi-cuenta", label: "Inicio", icon: House }, { href: "/mi-cuenta/cuotas", label: "Cuotas", icon: Wallet }, { href: "/mi-cuenta/compras", label: "Compras", icon: ShoppingBag }, { href: "/mi-cuenta/la-optica", label: "La óptica", icon: MapPin }, { href: "/mi-cuenta/perfil", label: "Perfil", icon: UserRound }];
export function CustomerShell({ children }: { customer: Pick<CustomerProfile,"firstName" | "lastName">; children: ReactNode }) {
  const data = useOptionalCustomerData();
  const path = usePathname(), router = useRouter();const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function logout() { setBusy(true);try { const response = await fetch("/api/clientes/auth/sign-out", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });if (!response.ok) throw new Error();data?.clear();router.replace("/mi-cuenta/ingresar");router.refresh(); } catch { setError("No pudimos cerrar la sesión. Inténtalo nuevamente.");setBusy(false); } }
  const activePath = path === "/mi-cuenta/soporte" ? "/mi-cuenta/perfil" : path === "/mi-cuenta/categorias" ? "/mi-cuenta" : path;
  if (path.endsWith("/compromiso")) return <>{children}</>;
  return <div className={styles.customerLayout}><CustomerNotice /><div className={styles.workspace}><nav className={styles.side} aria-label="Mi espacio"><Link className={styles.sideBrand} href="/mi-cuenta" aria-label="Ir al inicio de mi cuenta"><Image src={clientLogo} unoptimized alt="Óptica & Cristal" width={196} height={100} loading="eager" /></Link>{links.map(l => <Link key={l.href} href={l.href} aria-current={activePath === l.href ? "page" : undefined} className={`${styles.navLink} ${activePath === l.href ? styles.active : ""}`}><l.icon size={19} aria-hidden="true" />{l.label}</Link>)}<Link className={`${styles.navLink} ${path === "/mi-cuenta/ayuda" ? styles.active : ""}`} aria-current={path === "/mi-cuenta/ayuda" ? "page" : undefined} href="/mi-cuenta/ayuda"><CircleHelp size={19} aria-hidden="true" />Ayuda</Link><div className={styles.sideNote}>Óptica &amp; Cristal<br />{BRAND_SLOGAN}</div></nav><main className={styles.main} id="contenido-principal">{error && <p role="alert" className={styles.error}>{error}</p>}<CustomerSyncStatus />{children}{path === "/mi-cuenta/perfil" && <div className={styles.section}><button className={styles.button} onClick={logout} disabled={busy}><LogOut size={17} aria-hidden="true" />{busy ? "Saliendo…" : "Cerrar sesión"}</button></div>}</main></div><nav className={styles.bottom} aria-label="Navegación móvil">{links.map(l => <Link key={l.href} href={l.href} aria-current={activePath === l.href ? "page" : undefined} className={activePath === l.href ? styles.active : ""}><l.icon size={21} aria-hidden="true" />{l.label}</Link>)}</nav>{!["/mi-cuenta/soporte","/mi-cuenta/la-optica"].includes(path) && <CustomerHelpChat />}</div>;
}
